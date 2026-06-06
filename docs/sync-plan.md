# Sync Subsystem — Fix Plan, Naming Reference & Refactor Plan

> Companion to **`sync-review.md`** (the findings). This document is the plan: a
> naming/semantics reference for the whole subsystem, a phased fix plan, and an incremental
> refactor plan. Finding IDs (A1, B1, …) and test IDs (P0.1, …) refer to `sync-review.md`.

## Context

The sync control flow is sound; the three costs to maintainability are **(1) overloaded,
collision-prone vocabulary**, **(2) an implicit state model** (decision tables living in
comments and decoded three times in three naming styles), and **(3) a missing lifecycle
owner** (no top-level `close()`). The fixes in `sync-review.md` address correctness; this plan
also addresses the comprehension cost, because several bugs (B1/B2 disagreeing completion
predicates, F1 status merge, the C1 capability-write divergence) exist *because* the model is
implicit and the names mislead.

---

## 1. Naming & Semantics Reference — what each class and name actually means

The single biggest comprehension trap is that **three different tri-state vocabularies and three
different `State` types coexist**, and that `have`/`want`/`wanted` mean *different things* for the
local device vs a remote peer. This section is the authoritative map of current meaning. The
proposed renames are in §2.

### 1.1 The classes (ownership, one-line meaning)

| Class | File | One per | Owns / means |
|---|---|---|---|
| `SyncApi` | `sync-api.js` | project (`project.$sync`) | Public entry point. Owns the `SyncState`, one `PeerSyncController` per connected peer, server websockets, the autostop timer, and the device-wide *sync-enabled* state machine. Emits the public `'sync-state'` event. |
| `PeerSyncController` (PSC) | `peer-sync-controller.js` | connected peer (per protomux connection) | Decides **which namespaces replicate with this peer**, based on the peer's `syncCapability` (from their role) and the device-wide enabled state. Caches `syncCapability` and `SyncStatus`. |
| `SyncState` (class) | `sync-state.js` | project | Aggregator over all 5 namespaces. Holds one `NamespaceSyncState` per namespace; throttles their updates into one `'state'` event. |
| `NamespaceSyncState` | `namespace-sync-state.js` | namespace (×5) | Aggregates all `CoreSyncState`s in one namespace into a single per-namespace view; derives `dataToSync` and `coreCount`. |
| `CoreSyncState` | `core-sync-state.js` | hypercore | Tracks one core's local + per-peer `PeerState`s and runs `deriveState` (the bitfield walk producing have/want/wanted). |
| `PeerState` | `core-sync-state.js` | peer × core | Bitfield wrapper for one peer on one core: their `preHaves`, live `haves`, our `wants` of them, `contiguousLength`, and channel `status`. |

Mental model: **`SyncApi` ⊃ {one `PeerSyncController` per connection} + one `SyncState`.
`SyncState` ⊃ 5 `NamespaceSyncState` ⊃ N `CoreSyncState` ⊃ {local `PeerState` + remote `PeerState`s}.**
PSCs drive *replication* (the write side); the SyncState tree observes *progress* (the read side).

### 1.2 The block-count vocabulary — `have` / `want` / `wanted`

These are counts of hypercore blocks. **Their meaning flips between the local entry and a remote
peer entry** — the chief source of confusion:

| Field | On `localState` (us) | On a `remoteStates[peerId]` (a peer) |
|---|---|---|
| `have` | blocks **we** have | blocks **that peer** has |
| `want` | unique blocks **we want from anyone** | blocks **that peer wants from us** |
| `wanted` | unique blocks **anyone wants from us** | blocks **we want from that peer** |

So `localState.want` is "how much we still need" (drives "are we done?"), while
`remoteStates[p].want` is "how much peer p still needs from us." `wanted` is the mirror.
`contiguousLength` = consecutive blocks from index 0 a peer has (kept out of the `have` bitfield
as an optimisation). `coreLength`/`length` = sparse known length of the core.

### 1.3 The three look-alike tri-states (memorize this table)

These three are constantly confused because each is a 3-valued enum about a peer, but they answer
**different questions**:

| Enum | Defined | Values | Question it answers |
|---|---|---|---|
| `syncCapability` | PSC `#syncCapability` (`Role['sync'][ns] \| 'unknown'`) | `allowed` / `blocked` / `unknown` | **May** this peer sync this namespace? (from their role; `unknown` = role not read yet) |
| `PeerNamespaceState.status` | `core-sync-state.js` | `stopped` / `starting` / `started` | Is the **replication channel** for this peer+core up? (`stopped` = no live session/disconnected/default; `starting` = session opened, awaiting first `core.update`; `started` = active) |
| `SyncStatus` | PSC `getSyncStatus` | `unknown` / `syncing` / `synced` | Has sync **finished** for this peer+namespace? (`synced` = `started` **and** `localState.want === 0`) |

> ⚠️ `status` and `SyncStatus` are *especially* confusable (`started` vs `synced`). `status` is about
> the connection; `SyncStatus` is about completion.

### 1.4 The "what do we want to replicate" vocabulary — three names for two groups

The namespaces split into two groups, but **the group names differ by layer**, and "everything"
has two spellings:

| Concept | `constants.js` | `SyncEnabledState` (SyncApi) | `SyncType` (`waitForSync` arg) | Public `State` group key |
|---|---|---|---|---|
| auth, config, blobIndex | `PRESYNC_NAMESPACES` | `'presync'` | `'initial'` | `initial` |
| data, blob | `DATA_NAMESPACES` | — | — | `data` |
| all five | `NAMESPACES` | `'all'` | `'full'` | (both groups) |
| replicate nothing | — | `'none'` | — | — |

So "the initial group" = "presync namespaces" = `SyncType 'initial'`; "everything" =
`SyncEnabledState 'all'` = `SyncType 'full'`. `SyncEnabledState` is the device's **current intent**
(set by `start()`/`stop()`/background); `SyncType` is **what a `waitForSync` caller is waiting for**.

### 1.5 The `State` type collisions (three unrelated shapes named `State`/`SyncState`)

| Symbol | File | Shape |
|---|---|---|
| `State` | `sync-state.js` | `Record<Namespace, NamespaceSyncState's SyncState>` — all namespaces, internal |
| `SyncState` (type) | `namespace-sync-state.js` | one namespace's aggregated derived state (`{ dataToSync, coreCount, localState, remoteStates }`) |
| `SyncState` (class) | `sync-state.js` | the aggregator class (not a type) |
| `State` | `sync-api.js` | the **public** sync state: `{ initial:{isSyncEnabled}, data:{isSyncEnabled}, remoteDeviceSyncState }` |
| `DerivedState` | `core-sync-state.js` | one core's `{ coreLength, localState, remoteStates }` |

Plus the local variable `namespaceSyncState` in `sync-api.js` actually holds the **all-namespaces**
`State` (it does *not* hold a single `NamespaceSyncState`) — actively misleading.

### 1.6 Other named values worth pinning
- `remoteStates` (internal): `peerId → PeerNamespaceState`. `remoteDeviceSyncState` (public):
  `deviceId → { initial, data }` groups with `{ isSyncEnabled, want, wanted }`.
- `isSyncEnabled` (public, per device per group): are we *actively replicating* this group with this
  device right now (derived from each namespace's `status`).
- `dataToSync` (NamespaceSyncState): `localState.want > 0 || localState.wanted > 0` — "is there
  outstanding work in this namespace" (the name collides with the `data` namespace).
- `hasDownloadFilter(peerId)` (blob only): the peer has a blob filter, so it does **not** want
  everything — seeds that peer's `PeerState` with `wantsEverything:false`.

---

## 2. Proposed target vocabulary (the renames)

Goal: each concept has exactly one name; the three tri-states are visibly distinct; no `State`
collision. Public field names on `project.$sync.getState()` are preserved (document the
public↔internal bridge in one place).

| Current | Proposed | Why |
|---|---|---|
| `namespace-sync-state.js` type `SyncState` | **`NamespaceState`** | it is one namespace's state |
| `sync-state.js` type `State` | **`AllNamespacesState`** | it spans all namespaces |
| `sync-api.js` type `State` | **`SyncApiState`** | the public shape |
| local var `namespaceSyncState` (sync-api) | **`allNamespacesState`** | it is all namespaces |
| `dataToSync` | **`hasWork`** | avoids the `data`-namespace collision; says what it means |
| `PeerNamespaceState.status` (`stopped/starting/started`) | **`channel`** (`disconnected/connecting/connected`) | it describes the replication channel, not completion |
| `SyncType` (`'initial' \| 'full'`) | **`SyncTarget`** (`'presyncOnly' \| 'everything'`) | `'full'` reads as "data group"; `'everything'` is unambiguous, and `'presyncOnly'` matches `PRESYNC_NAMESPACES` |
| `SyncEnabledState` (`none/presync/all`) | keep values, but decode **once** via `namespaceGroupsEnabled(state) → { presync, data }` | three layers currently re-decode it with three naming styles |
| `SyncStatus` (`unknown/syncing/synced`) | keep — but never call a `status` field `status` again | distinct from `channel` |
| `syncCapability` (`allowed/blocked/unknown`) | keep; seed from `NO_ROLE.sync` instead of pseudo-state `'unknown'` (R4) | removes a 4th magic value from the capability axis |

The `SyncState` **class** keeps its name (it is the aggregator). The single highest-leverage
addition is a 4-line doc-comment at the top of `peer-sync-controller.js` mapping the three
tri-states (`syncCapability` = allowed-to?, `channel` = connected?, `SyncStatus` = finished?).

---

## 3. Phased Fix Plan (each step independently shippable)

**Phase 0 — Trivial correctness (low risk, ship now)**
- **A0 (CONFIRMED PRODUCTION BUG) — make `leaveProject`'s trailing propagation wait best-effort.**
  `mapeo-manager.js:1038-1042`: `await project.$sync.waitForSync('initial', { timeoutMs }).catch(() => {})`
  so a stalled/slow peer no longer makes `leaveProject()` reject with `'Sync timeout'` after the
  local leave already succeeded. Guard: `test-e2e/sync-lifecycle.js` `[BUG A2]`. Separately
  investigate *why* presync stalls with a connected peer post-leave (may be a completion-detection
  bug — B1/D1/F1 — that the timeout masks; the best-effort catch fixes the user-visible symptom
  regardless).
- F1 `namespace-sync-state.js:211` `===`→`=` (+ extract `mergeStatus`). Guard: P0.1.
- F2 `core-sync-state.js:445` `>`→`>=` (or delete dead scalars). Guard: F2 unit test (or none if deleted).
- D3 delete `#downloadingRanges`. Guard: typecheck.

**Phase 1 — Unhandled-rejection & async-guard hardening (prereq for safe teardown)**
- A4 `.catch()` + detached-peerState guard on `core-sync-state.js:282`.
- C1 funnel capability writes through one auth-preserving `#readAndCacheSyncCapability`.
- Guard: P0.9 (blocked peer learns it's blocked); `unhandledRejection` guard in leave/close e2e (P0.6).
- Risk: low-medium.

**Phase 2 — Completion correctness**
- B1 require `status==='started'` for connected non-blocked peers, gated on PSC membership;
  back-fill late cores at `'starting'`.
- B3 + D2: `continue` on blocked/absent presync namespaces; cleanup + PSC-gate the disconnect
  early-return.
- Guard: late-core-discovery regression (B1); invite-as-BLOCKED resolves (B3); **3-peer completion
  (P0.16)**; device-count-on-removal (P1).
- Risk: medium — PSC-membership gate prevents disconnected peers blocking forever.

**Phase 3 — Connection-lifecycle map consistency**
- D1 connection-aware `#pscByPeerId.delete` (`=== psc`) and `disconnectPeer` (no surviving PSC);
  guard `:545` clobber; verify queued discovery-key replay race.
- Guard: overlapping-connection e2e + **server-websocket reconnect (P0.14)**; device-count-on-removal.
- Risk: medium — interacts with local-discovery dedup; verify against direct + server paths.

**Phase 4 — Top-level shutdown (highest leverage)**
- A1 `SyncApi.close()` (incl. `pendingDiscoveryKeys` drain) + call first in `_close()`.
- A3 `close()` on the three state classes (off listeners, cancel throttle, restore `onbitfield`/`onrange`).
- A2 quiesce non-auth namespaces in `kClearData` before purge; project `#state` idempotency guard
  for close/leave; analyze the **leave‖close interleave**.
- C2 gate `#validateRoleAndAddCoresForPeer` on capability not roleId.
- `#isClosing` early-returns in `#validateRoleAndAddCoresForPeer`/`#handleRoleUpdate`/
  `#handleCoreOwnershipUpdate` + re-check after awaits.
- Guard: close-mid-sync + leave-mid-sync (P0.6); leave‖close interleave (P0.12); timer-cleanup
  (P0.13); blocked-core-not-added (C2); three-peer block isolation (P0.7).
- Risk: medium — Phase 1's rejection guards de-risk teardown ordering.

**Phase 5 — Reporting polish & remaining gaps**
- E1/E2/E3/E4 reporting consistency; B2/C3 docs/optional hardening; relay blob-intent forwarding
  (separate design decision); review blob download-filter completion (P0.15).
- Risk: low.

---

## 4. Refactor Plan (target design, incremental on top of the fixes)

### Target design
1. **One owner per lifecycle.** SyncApi owns top-level teardown (mirrors how
   `#handlePeerDisconnect` already owns per-peer teardown). Every `on()` has a matching `off()`;
   every timer is tracked and cleared; teardown order is explicit and documented in `_close()`.
2. **Explicit, testable state model.** The 8-row `SyncEnabledState` truth table
   (`sync-api.js:240-251`) becomes a pure `computeSyncEnabledState()` (one return per row) +
   `computeAutostopAction()`. Its decoding — currently done **three** times in three naming styles
   (`isSyncEnabled/isDataEnabled` in `#getState`, `isAnySyncEnabled/isDataSyncEnabled` in PSC, again
   in `getRemoteDevicesSyncState`) — collapses into one `namespaceGroupsEnabled(state) → {presync, data}`.
3. **Unified completion predicates.** `isSynced`, `isInitiallySyncedWithPeer`, `getSyncStatus`, and
   `arePresyncNamespacesSynced` derive from two named predicates (`isNamespaceComplete`,
   `isPeerCaughtUp`) so they cannot disagree — this **is** the structural fix for B1/B2.
4. **Robust capability model.** Seed capability from `NO_ROLE.sync` (auth allowed, rest blocked)
   instead of the pseudo-state `'unknown'`; drop `'unknown'` from `SyncCapability` (keep
   `SyncStatus.unknown`). Set `BLOCKED_ROLE.sync.auth = 'allowed'` (mirror LEFT_ROLE) and **delete**
   the `prevAuth` save/restore workaround (R4 — supersedes C1's interim fix). Removes the auth
   special-case in `#updateEnabledNamespaces:264-268`.
5. **`mergeStatus` precedence array** replaces the if/else ladder in `mutatingAddPeerState` —
   removes the F1 bug class permanently.

### Sequencing
Land **Fix Phases 0–4 first** (they don't depend on renames). Then: R5 (`mergeStatus`) and R3
(`namespaceGroupsEnabled` + `computeSyncEnabledState`) are small/low-risk and make the model
testable. R4 (BLOCKED_ROLE default + delete workaround) is small but **high-risk** — guard with
cross-version + P0.9 tests; it retires the C1 interim fix. R1/R2 unified predicates fold in B1/B2
structurally. The pure **renames (§2) land last** as one mechanical pass under a green typecheck.

**Key files:** `src/sync/sync-api.js`, `src/sync/peer-sync-controller.js`, `src/sync/sync-state.js`,
`src/sync/namespace-sync-state.js`, `src/sync/core-sync-state.js`, `src/roles.js`,
`src/mapeo-project.js`, `src/core-manager/index.js`, `src/blob-store/index.js`,
`src/core-ownership.js`.

---

## 5. Verification
- Unit: `npm run test:unit` (sync unit tests in `test/sync/`), incl. new P0.1–P0.3 + F2 cases.
- E2E: `node --test test-e2e/sync-*.js` for the new lifecycle/completion/capability/reconnect files,
  plus the existing `test-e2e/sync.js`; run e2e with a global `process.on('unhandledRejection')`
  assertion to catch A4-class regressions.
- Types: `npm run type` (especially after the rename pass).
- Fuzz: `node --test test-e2e/sync-fuzz.js` after extending the action space.
