# Sync redesign (experimental)

This branch is an experimental refactor of `src/sync/`, motivated by a history
of bugs around sync completion, progress reporting, and connected-device
counts. The findings that drove it are in `docs/sync-review.md` /
`docs/sync-plan.md` on the `test/sync-bug-repros` branch (commit `85a49e6f`).
This document describes the new model; it should be read as the source of
truth for naming and semantics in the new code.

## Why the old design bred bugs

1. **Peer identity was split across three hand-synced maps.** `SyncApi` kept
   `Map<protomux, PeerSyncController>` *and* `Map<deviceId, PSC>`, and every
   `CoreSyncState` kept its own `Map<deviceId, PeerState>`. An overlapping
   reconnect from the same device corrupted the maps (finding D1): the stale
   connection's teardown deleted the live connection's entries, so a connected
   device vanished from sync state.

2. **Replication decisions were a feedback loop through the observation
   layer.** `PeerSyncController` listened to the throttled `SyncState`
   `'state'` event to decide when to (re-)read a peer's role and when to
   enable data namespaces. Deciding *what to replicate* from a throttled,
   async observation of *how replication is going* created interleave hazards
   (finding C1: a capability re-read triggered by an unrelated auth write
   clobbered the blocked-peer auth workaround).

3. **Completion had four disagreeing definitions.** `isSynced`,
   `isInitiallySyncedWithPeer`, `getSyncStatus`, and
   `arePresyncNamespacesSynced` each re-derived "are we done?" with different
   edge-case handling (findings B1, B2, B3, F1).

4. **Three look-alike tri-states.** `syncCapability`
   (`allowed/blocked/unknown`), `PeerNamespaceState.status`
   (`stopped/starting/started`), and `SyncStatus` (`unknown/syncing/synced`)
   are all 3-valued enums about a peer that answer different questions, and
   `started`/`synced` read as synonyms.

5. **No lifecycle owner.** `SyncApi` had no `close()`; project close/leave
   tore down cores underneath live listeners and timers (findings A1–A4).

## The new model

```
SyncApi                  facade: intent (start/stop/background), autostop,
 │                       server websockets, waitForSync, public state, close()
 ├── PeerManager         THE single registry of connected devices
 │    └── SyncPeer (×N)  one per device (not per connection); owns its
 │                       connections, its capability, and which namespaces
 │                       replicate with it
 └── SyncProgress        observation tree: per-core bitfield accounting,
      └── CoreSyncState (×M) throttled into one immutable snapshot
```

Three principles:

1. **One source of truth for "who is connected":** `PeerManager` keys peers by
   device ID and each `SyncPeer` owns a *set* of connections. A device is
   disconnected only when its last connection closes; a stale connection's
   teardown can never remove a live connection's state.

2. **Decisions are pure functions of a snapshot.** All "what should we be
   doing" logic — which namespaces to replicate with a peer, whether sync is
   complete, whether to autostop — is computed by pure, unit-testable
   functions over `(intent, capability, snapshot)` in `sync-rules.js`. The
   event-driven code only gathers inputs and applies diffs. Because every
   consumer derives from the same snapshot with the same predicates, the
   completion definitions cannot disagree.

3. **Capability has one writer and no pseudo-states.** A peer's per-namespace
   sync capability is read from their role in exactly one code path, seeded
   from `NO_ROLE` (auth allowed, everything else blocked) until the role is
   known. The `'unknown'` pseudo-state is gone. `BLOCKED_ROLE.sync.auth` is
   now `'allowed'` (like `LEFT_ROLE`) so a blocked peer can still receive the
   role record telling them they are blocked — this replaces the fragile
   "preserve previous auth capability" workaround.

## Vocabulary

The three orthogonal questions about a peer each get a distinct word. None of
them shares a value name with another.

| Axis | Name | Values | Question |
|---|---|---|---|
| Permission | `capability` (per namespace) | `'allowed' \| 'blocked'` | May we sync this namespace with this peer (from their role)? |
| Connection | `channel` (per peer × core) | `'opening' \| 'open' \| 'closed'` | Is the replication channel up? (`opening` = connected, awaiting first length handshake) |
| Completion | *predicate functions* | boolean | Is there anything left to transfer? Never stored as an enum. |

Block counts are always **from the local device's point of view**, for both
the local entry and remote peers (the old `want`/`wanted` flipped meaning
between the two — the single biggest reading trap):

| New name | On local state | On a remote device's state |
|---|---|---|
| `have` | blocks we have | blocks they have |
| `toReceive` | unique blocks we still need from anyone | blocks we still need **from them** |
| `toSend` | unique blocks anyone still needs from us | blocks they still need **from us** |

Namespace groups: the five namespaces split into the **initial** group
(`auth`, `config`, `blobIndex` — synced whenever a peer connects, needed for
membership/permissions) and the **data** group (`data`, `blob` — synced only
while data sync is on). Constants: `INITIAL_SYNC_NAMESPACES`,
`DATA_SYNC_NAMESPACES`. The words "presync" and "full" are retired.

Device-level intent is a single enum, `SyncMode`:

| `syncMode` | Replicates | Old name |
|---|---|---|
| `'stopped'` | nothing | `'none'` |
| `'initial'` | initial group only | `'presync'` |
| `'all'` | everything | `'all'` |

It is computed by one pure function, `computeSyncMode({ wantsDataSync,
isPausedForBackground, isFullySynced })`, which encodes the old 8-row truth
table from `sync-api.js` comments.

## Public API (breaking changes)

`project.$sync.getState()` and the `'sync-state'` event now return:

```ts
type SyncState = {
  /** what this device is currently willing to replicate */
  syncMode: 'stopped' | 'initial' | 'all'
  /** progress with each connected project member, keyed by device ID */
  devices: Record<string, DeviceSyncState>
}

type DeviceSyncState = {
  /** live progress for the initial group (auth, config, blobIndex) */
  initial: DeviceGroupProgress
  /** live progress for the data group (data, blob) */
  data: DeviceGroupProgress
}

type DeviceGroupProgress = {
  /** are we actively replicating this group with this device right now */
  isSyncEnabled: boolean
  /** channel is up and nothing left to send or receive with this device */
  isComplete: boolean
  /** blocks we still need from this device */
  toReceive: number
  /** blocks this device still needs from us */
  toSend: number
}
```

Migration from the old shape:

| Old | New |
|---|---|
| `state.initial.isSyncEnabled` | `state.syncMode !== 'stopped'` |
| `state.data.isSyncEnabled` | `state.syncMode === 'all'` |
| `state.remoteDeviceSyncState` | `state.devices` |
| `…[d].initial.want` (they want from us) | `devices[d].initial.toSend` |
| `…[d].initial.wanted` (we want from them) | `devices[d].initial.toReceive` |
| *(none)* | `devices[d].<group>.isComplete` |
| connected-device count: `Object.keys(remoteDeviceSyncState).length` | `Object.keys(devices).length` — now reliable across reconnects |

`waitForSync(type)` takes `'initial' | 'all'` (was `'initial' | 'full'`).
`start()`, `stop()`, `setAutostopDataSyncTimeout()`, `connectServers()`,
`disconnectServers()` are unchanged. `SyncApi` gains `close()`, called first
in `MapeoProject._close()`.

`devices` includes every connected peer that holds the project key, including
peers whose role blocks data sync (they still sync the auth namespace). Use
`isSyncEnabled` on the group entries to count devices actively syncing data.

## Completion semantics (the B1 class of bugs)

All completion questions are answered by two predicates in `sync-rules.js`:

- `isGroupCompleteWithPeer(snapshot, deviceId, group)` — for every namespace
  in the group that the peer's capability allows: the channel for every core
  is `open` (not `opening` — a peer we haven't finished the length handshake
  with may yet want everything), and `toReceive === 0 && toSend === 0`.
- `isSyncComplete(snapshot, target)` — local `toReceive`/`toSend` are 0 for
  the target's namespaces **and** `isGroupCompleteWithPeer` holds for every
  peer currently in the `PeerManager` registry. Gating on registry membership
  (not on per-core state entries) means a genuinely disconnected peer can't
  block completion forever, and a connected peer that hasn't populated state
  yet *does* block it — fixing the premature-completion race.

The per-peer data-sync gate uses the same predicate: data namespaces enable
with peer P only once `isGroupCompleteWithPeer(snapshot, P, 'initial')` —
per-peer, not the old namespace-global `localState.want === 0`.

`waitForInitialSyncWithPeer(deviceId, signal)` (invite flow) is
`isGroupCompleteWithPeer` awaited over snapshots; it skips capability-blocked
namespaces so inviting a to-be-blocked device resolves.

## Lifecycle

- `SyncApi.close()` is idempotent and synchronous-ish: cancels the autostop
  timer and the state throttle, closes server websockets, removes the four
  constructor listeners, closes every `SyncPeer` (which unreplicates), and
  detaches `SyncProgress` from all cores. Called before `coreManager.close()`.
- `CoreSyncState` guards its `core.update({ wait: true })` continuation
  against teardown (the pending-upgrade promise rejects on close) and against
  a peer state that was replaced while awaiting.
- Discovery keys arriving before the peer's creator-core `peer-add` are still
  queued per connection, but the queue is owned by `PeerManager` and dropped
  on connection close and on `close()` (no orphaned `setTimeout`s).

## What is deliberately unchanged

- The bitfield accounting in `CoreSyncState`/`deriveState` (the word-at-a-time
  walk producing have/toReceive/toSend, pre-have insertion, contiguous-length
  masking) — reviewed as sound; only names change.
- The wire protocol: extension messages (`mapeo/project`, `mapeo/have`,
  `mapeo/download-intent`), pre-have broadcasting, and the eager bitfield
  exchange hack in `CoreManager` are untouched, so this version syncs with
  older versions.
- Blob filter / want-range plumbing from `BlobStore`.
- The autostop truth table's observable behavior.

## Bug fixes folded into this refactor

| Finding | Fix here |
|---|---|
| F1 status-merge `===` typo | status enums are never merged; group completion is a predicate |
| B1 premature completion | registry-gated `isSyncComplete` + `opening` channels block completion |
| B2 global vs per-peer gate | data-enable gate is per-peer |
| B3 invite-as-blocked never resolves | predicates skip blocked namespaces |
| C1 capability clobber | single capability writer; `BLOCKED_ROLE.sync.auth = 'allowed'` replaces the workaround |
| C2 cores added for blocked peers | core-adding gated on capability, not role ID |
| C3 stale capability race | capability reads are sequenced per peer (monotonic read ID) |
| D1 reconnect map corruption | per-device `SyncPeer` owns a connection set |
| D2 disconnect early-return skips cleanup | disconnect path is idempotent on the registry |
| A1/A3/A4 missing teardown | `SyncApi.close()` + throttle/timer cancellation + guarded `update()` continuation |
| E1–E4 reporting inconsistencies | public state derived in one pass from one snapshot |
