# Sync Subsystem — Deep Review (Findings)

> Produced by a multi-agent review (audit → adversarial verify → p2p scenarios → test-gap
> analysis). 31 confirmed findings, 15 scenario bugs, 31 test gaps. Every finding was
> re-verified against the code by a skeptic agent; severities reflect the *verified* impact,
> not the initial claim. The fix plan, refactor plan, and a naming/semantics reference live in
> the companion document **`sync-plan.md`**.

Reproduction tests for these findings live on the `test/sync-bug-repros` branch. Each bug-repro
test is tagged `{ todo: 'BUG <id>' }` (node:test) — it fails against current code and should pass
once the fix lands; gap-coverage tests for already-correct behavior pass today. Test IDs below
(e.g. `P0.1`) map to the test files.

## 1. Executive Summary

The sync subsystem is well-architected: a clean layered pull-model
(`CoreSyncState` → `NamespaceSyncState` → `SyncState` → `SyncApi`), throttled state
derivation, and solid per-peer teardown on the normal disconnect path. The derivation math
is fundamentally sound. **No finding involves data loss, data leakage to a blocked peer's
own connection, or a trust-boundary violation** — core-ownership signatures are verified at
index time (`core-ownership.js:168`), so `#validateRoleAndAddCoresForPeer` consuming the
core IDs is safe.

The defects cluster in three areas: **(1) no top-level shutdown story, (2) completion-timing
guarantees, (3) capability/lifecycle correctness.**

### Top risks (priority order)
0. **⚠️ CONFIRMED PRODUCTION BUG — `leaveProject()` rejects with `'Sync timeout'`.** Reported
   intermittently by real users leaving projects, now reproduced deterministically. See **A0**.
1. **No top-level shutdown.** `SyncApi` has no `close()` at all, yet owns 4 long-lived
   listeners, the autostop timer, the `pendingDiscoveryKeys` timers, server websockets, and
   two PSC maps. `project._close()` / `kClearData` close/purge cores **without stopping sync
   first** → unhandled rejections, listeners firing on closed cores, leaked timers/sockets.
2. **Premature completion race.** `isSynced` / `waitForSync('initial')` can report synced
   before late-discovered cores begin replicating (bounded by RTT, not permanent).
3. **Capability-handling defects.** The BLOCKED auth-preservation workaround is defeated by
   one of two divergent capability-write paths; blocked/left peers still get non-auth cores
   added locally.
4. **Connection-lifecycle map corruption** on overlapping reconnects from the same device
   (the `#pscByPeerId` / `disconnectPeer` keying mismatch) — most reachable on the server
   websocket reconnect path, which has no local-discovery connection-swap dedup.

---

## 2. Confirmed Issues (by theme, severity-ordered)

### Theme A — Leave / Block / Close lifecycle

**A0 (HIGH — CONFIRMED IN PRODUCTION) — `leaveProject()` rejects with `'Sync timeout'`**
`mapeo-manager.js:1038-1042`. `leaveProject` performs the local leave and then awaits a
**trailing, unconditional** propagation wait:
```js
await project[kProjectLeave]()                                  // assign LEFT + kClearData — LOCAL, already succeeded
await project.$sync.waitForSync('initial', { timeoutMs: 45_000 }) // best-effort propagation — but REJECTS on timeout
```
The local leave (assign `LEFT_ROLE` + `kClearData`) is already complete when the wait runs, so
when a peer is connected but presync cannot complete within 45s — a slow/flaky link, or the user
moving out of range right as they leave — `waitForSync` rejects and `leaveProject()` throws
`Error('Sync timeout')` **even though the device has already left.** Users see an error for an
operation that locally succeeded. Occurs intermittently (only when a peer is connected AND presync
stalls for 45s); on a healthy LAN presync completes in <1s so it is usually invisible.
**Repro:** `test-e2e/sync-lifecycle.js` `[BUG A2]` (connect over a controllable wire, sync, then
pause the wire and leave → `leaveProject` rejects `'Sync timeout'` while `$getOwnRole()` is already
`LEFT`). **Fix:** make the trailing wait best-effort —
`await project.$sync.waitForSync('initial', { timeoutMs }).catch(() => {})` (the local leave is
done; propagation is opportunistic and will also happen on the next connection). **Investigated:**
on a *healthy* connection, post-leave presync resolves immediately (≈0ms — as the leaver's cores
close its replication with the peer drops, so the purged data does **not** cause a structural
re-want stall), so the production timeout is network-condition-driven: a peer that stays
"connected" at the discovery level but cannot complete presync within 45s (flaky/slow/half-open
mobile links). The best-effort `.catch` is therefore the correct and sufficient fix.
**Status: FIXED** on `fix/leave-project-timeout` (branched off `main`; `mapeo-manager.js`),
guarded by a regression test on that branch. The `[BUG A2]` repro on this test branch stays a
failing `todo` (the fix is not on this branch).

**A1 (HIGH) — `project._close()` never stops sync; `SyncApi` has no `close()`**
`mapeo-project.js:604-617`; `sync-api.js` (constructor listeners `148-152`, autostop timer
`292`, `pendingDiscoveryKeys` timer `185-192`, websockets `378-384`). `_close()` closes
datastores/blobStore/coreManager/sqlite but never references the sync API. `coreManager.close()`
does **not** emit `peer-remove`, so PSCs are never closed. Leaked listeners/sockets/timers
keep the process alive; the autostop callback fires `#updateState()` against closed cores.
**Fix:** add idempotent `SyncApi.close()` — set `#isClosing`; clear autostop; drain the
`#pendingDiscoveryKeys` timers; `disconnectServers()`; `off()` the 4 constructor listeners
(store `roles`/`coreOwnership` on fields); `psc.close()` across `#peerSyncControllers` then
clear all three maps. Call it **first** in `_close()`, before `coreManager.close()`.
*Tests: P0.6, P0.13.*

**A2 (HIGH) — `kClearData` closes/purges cores while sync is active**
`mapeo-project.js:1359-1388`; `mapeo-manager.js:1037-1042`; `core-manager/index.js:490-530`.
`kProjectLeave`→`kClearData` closes writer cores and `deleteOthersData` (purge + compact)
with no sync stop first. A blanket stop is **wrong** — `mapeo-manager.js:1040` calls
`waitForSync('initial')` right after to propagate `LEFT_ROLE`, so auth must keep replicating.
(The "storage corruption" framing is overstated: purge excludes the writer core and compact
runs after the awaited purge.) The distinct risk is CoreSyncState listeners running
`deriveState` on closed cores during the post-leave auth-resync window. **Fix:** quiesce only
the non-auth namespaces (unreplicate on every PSC + detach their CoreSyncState) **before**
closing writer cores / `deleteOthersData` / unlink. Pair with A4. *Tests: P0.6.*

**A3 (MEDIUM) — Throttled / `nextTick` state emit fires after cores close**
`sync-state.js:38,79-81`; `core-sync-state.js:111-131,166-173,282-286`. The 200ms throttle and
`process.nextTick` have no cancel/`close()`. A trailing emit re-runs `deriveState` over closed
cores and emits a stale `sync-state` after `'close'`. (Correction: hypercore 11.30.1 getters
return `0` when closed — **no throw**; residual is stale events + the A4 rejection.) **Fix:**
add `close()` to `CoreSyncState`/`NamespaceSyncState`/`SyncState` that `off()`s listeners and
calls `throttle(...).cancel()`; restore `peer.onbitfield`/`peer.onrange` on `peer-remove`;
wire into `SyncApi.close()`. *Tests: P0.6.*

**A4 (MEDIUM, but the one-line root of several "HIGH" symptoms) — `core.update({wait:true}).then()` has no rejection handler**
`core-sync-state.js:282-286`. On close the pending upgrade is cancelled
(`reject(REQUEST_CANCELLED())`) → unhandled rejection on every close/leave with a peer
mid-upgrade. **Fix:**
```js
this.#core?.update({ wait: true }).then(() => {
  if (this.#remoteStates.get(peerId) !== peerState) return // detached/replaced
  peerState.status = 'started'
  peerState.contiguousLength = peer.remoteContiguousLength
  this.#update()
}, () => {}) // swallow REQUEST_CANCELLED on teardown
```
The detached-peerState guard also fixes a low-severity orphan-mutation. *Tests: P0.6.*

### Theme B — Completion detection

**B1 (HIGH) — `isSynced`/`waitForSync` can report synced before late-added cores replicate**
`sync-api.js:674-686`; `namespace-sync-state.js:120-124,139-143`. `NamespaceSyncState.addPeer()`
seeds only cores existing at call time; `#addCore()` (late discovery via
`#validateRoleAndAddCoresForPeer`→`coreManager.addCore`) does **not** back-fill known peers.
`isSynced`'s `if (!(peerId in state[ns].remoteStates)) return false` is satisfied by *sibling*
cores; default status `'stopped'` passes the `'starting'`-only guard → `addProject` can return
before auth/config is actually pulled (bounded by RTT). **Fix:** require `status === 'started'`
for every non-blocked **connected** peer in every checked namespace, **gated on
`#peerSyncControllers` membership** (so a genuinely disconnected peer doesn't block forever);
defense-in-depth: back-fill late cores in `#addCore` at `'starting'`. ⚠️ Seeding at the default
`'stopped'` does **not** fix it. ⚠️ Must be tested with **3+ peers** so a third peer that
legitimately has no state yet does not make `isSynced` never-complete. *Tests: P0.16.*

**B2 (LOW) — `getSyncStatus` uses namespace-global `localState.want` for 'synced'**
`peer-sync-controller.js:371-387`. `'synced'` requires `state[ns].localState.want === 0` (union
over all peers), not per-peer `.wanted`. Conservative only (can delay enabling data for peer X
while peer Y is in flight; never falsely synced). **Fix:** document as intentional, or switch
to per-peer `.wanted` as a deliberate, tested change. ⚠️ See F1 — this gate is *also* exposed to
the status-merge bug, so it is **not purely cosmetic**.

**B3 (LOW) — `isInitiallySyncedWithPeer` never resolves for peers with blocked presync namespaces**
`sync-api.js:692-711`. Returns false if any PRESYNC namespace lacks `remoteStates[peerId]`, but
`deriveState` deletes blocked peers per-namespace; no blocked-namespace guard (unlike `isSynced`
`:680` and `getRemoteDevicesSyncState` `:728`). Only reachable for invite-as-BLOCKED (which has a
5s timeout → delay, not hang). **Fix:** `:694-695` `return false` → `continue`, or pass
`peerSyncControllers` and `continue` when `psc.syncCapability[ns] === 'blocked'`. *Tests: P0.x (invite-as-blocked resolves).*

### Theme C — Permissions / capability

**C1 (HIGH) — `#handleStateChange` overwrites auth capability, defeating the BLOCKED auth-preservation workaround**
`peer-sync-controller.js:166,201-206,211-222`. Two async paths write `#syncCapability` wholesale.
`#refreshSyncCapability` restores `auth = prevAuth` (so a blocked peer still receives its BLOCKED
doc), but `#handleStateChange`→`#readAndCacheSyncCapability` does `this.#syncCapability = {...cap.sync}`
with **no** preservation. Any `didUpdate.auth` after a peer is blocked sets `auth = 'blocked'` →
the blocked peer can never learn it was blocked. **Fix:** move auth preservation **into**
`#readAndCacheSyncCapability` so every write applies the rule:
```js
async #readAndCacheSyncCapability() {
  const prevAuth = this.#syncCapability.auth
  try { this.#syncCapability = { ...(await this.#roles.getRole(this.peerId)).sync } }
  catch { this.#syncCapability = createNamespaceMap('unknown') }
  this.#syncCapability.auth = prevAuth // keep auth open so a blocked peer learns it is blocked
}
```
`#refreshSyncCapability` then collapses to a call + `#updateEnabledNamespaces()`, killing the
interleave hazard. (Long-term: set `BLOCKED_ROLE.sync.auth = 'allowed'` like LEFT_ROLE and delete
the workaround — Refactor R4.) *Tests: P0.9.*

**C2 (MEDIUM) — Blocked/left peer's non-auth cores still added**
`sync-api.js:640-653`. `#validateRoleAndAddCoresForPeer` only short-circuits on
`role.roleId === NO_ROLE_ID`; BLOCKED/LEFT pass → `coreManager.addCore` for config/data/blobIndex/blob.
`#addCore` (`core-manager/index.js:309-311`) calls `core.download({start:0,end:-1})` only when
`#autoDownload` and `namespace !== 'blob'` — so the "pulls their data from third parties" impact is
**config/data/blobIndex only** (blob is gated). `#handleRoleUpdate` re-runs this on transition to
BLOCKED. **Fix:** gate on capability, not roleId:
```js
const role = await this.#roles.getRole(peerDeviceId)
const hasAnyNonAuthSync = NAMESPACES.some(ns => ns !== 'auth' && role.sync[ns] !== 'blocked')
if (!hasAnyNonAuthSync) return
```
Covers BLOCKED, LEFT, NO_ROLE uniformly; update the stale comment at `:643-645`. *Tests: C2.*

**C3 (LOW) — Concurrent/out-of-order capability reads can write stale capability**
`peer-sync-controller.js:135-171,201-222`. No sequencing across in-flight `getRole` calls;
realistic harm negligible (self-heals next throttled event). **Fix (optional):** monotonic
`#capabilityReadId`; only assign if still current after `getRole` resolves. Folds into C1's
single-writer helper.

### Theme D — Connection lifecycle

**D1 (HIGH→MEDIUM) — Reconnecting device's `#pscByPeerId` entry deleted by stale connection's peer-remove**
`sync-api.js:545,580-584`. `#pscByPeerId` is keyed by stable device key; `#peerSyncControllers`
by per-connection `protomux`. On overlapping reconnect, `#handlePeerAdd:545` overwrites
`#pscByPeerId.set(peerId, newPsc)`, then the old connection's `#handlePeerDisconnect` does an
**unconditional** `delete(peerId)` (removing the live new PSC) and `disconnectPeer(peerId)`
(deleting shared `remoteStates[peerId]`). Dominant symptom: the surviving connection's peer
**disappears from sync state** (perpetually not-synced; `waitForSync` may not resolve). Data still
replicates per-protomux → state-accounting corruption. Mitigated for local discovery by
`chooseDevicePeer` (`local-peers.js:180-191`) but **fully reachable on the server-websocket
reconnect path** (servers reconnect aggressively, no dedup). **Fix:**
```js
if (this.#pscByPeerId.get(peerId) === psc) this.#pscByPeerId.delete(peerId)
const stillConnected = [...this.#peerSyncControllers.values()].some(p => p.peerId === peerId)
if (!stillConnected) this[kSyncState].disconnectPeer(peerId)
```
Don't blindly clobber an existing `#pscByPeerId` entry at `:545`. Also check the stale connection's
queued discovery-key replay (`:552-558` vs delete at `:583`) doesn't race the new connection.
*Tests: D1, P0.14.*

**D2 (LOW) — Disconnect early-return skips state cleanup**
`sync-api.js:569-586`. The no-PSC branch returns without `disconnectPeer`, leaving per-core state
`'stopped'` forever. **Fix:** call idempotent `disconnectPeer(peerId)` before the early return;
gate `isInitiallySyncedWithPeer` on PSC membership.

**D3 (LOW) — Dead `#downloadingRanges` field**
`peer-sync-controller.js:33-34,68-72,292-313`. Declared but never written/read. **Fix:** delete it.
Optionally `off()` the `#log.enabled`-gated `peer-remove` listener in `close()` and
`#replicatingCores.clear()`. Do **not** add explicit `unreplicate()` in `close()` — protomux
teardown handles it. (Not independently testable; covered by typecheck.)

### Theme E — Progress / device-count reporting (all LOW; transient, self-healing)
- **E1** `sync-api.js:207-211,315,728` — device state mixes the throttled snapshot with a live
  `syncCapability` read. **Fix:** snapshot `const cap = psc.syncCapability` once per peer.
- **E2** `sync-api.js:731-767` — a group's `isSyncEnabled` can be over-reported true when one
  namespace in the group has no peer state yet. **Fix:** on a missing remoteState in a non-blocked
  group namespace, force that group's `isSyncEnabled = false` rather than `continue`.
- **E3** `sync-api.js:727-774` — NO_ROLE/LEFT peers (auth `'allowed'`) appear in
  `remoteDeviceSyncState`. Partly intentional. **Fix:** decide semantics; either exclude
  auth-only peers or document that `Object.keys(...).length` is not an active-sync count.
- **E4** `peer-sync-controller.js:190-206`, `roles.js:111-133,204-226` — block may flip auth off
  (C1) or a LEFT device stays counted. Resolved structurally by C1 + R4; do LEFT reporting
  special-casing **at the reporting layer only** (never set LEFT/BLOCKED `auth:'blocked'`).

### Theme F — State-derivation math

**F1 (MEDIUM) — `mutatingAddPeerState`: `===` instead of `=`** *(reported under 6 dimensions; consolidated)*
`namespace-sync-state.js:211`. `accumulator.status === 'stopped'` (discarded comparison) where
assignment was intended; the adjacent `'starting'` branch `:216` correctly assigns. Aggregation is
order-dependent (accumulator = first core's state **by reference**), so a peer `'started'` on one
core and `'stopped'` on a later core stays `'started'`. **Impact:** `getRemoteDevicesSyncState`
`:737-747` maps status→`isSyncEnabled`, so a stopped peer is reported `isSyncEnabled:true`,
flipping group indicators via the `&&`-reduce. **Does NOT affect** `isSynced`/`isInitiallySyncedWithPeer`
(both treat `'stopped'`≡`'started'`). ⚠️ It **does** feed `getSyncStatus`→`arePresyncNamespacesSynced`
(`peer-sync-controller.js:273-277`), which **gates whether data namespaces enable** — so re-test the
data-enable gate rather than assuming cosmetic-only. **Fix:** `accumulator.status = 'stopped'`;
better, extract `mergeStatus(a,b)` with an explicit precedence rank (`stopped > starting > started`)
to kill the bug class; add an order-independent unit test. *Tests: P0.1.*

**F2 (LOW) — scalar `want(index)` off-by-one at the contiguousLength boundary**
`core-sync-state.js:445`. `index > contiguousLength` should be `>=` to match `have()` (`:407`) and
`wantWord()` (`:458`). **No runtime impact** — scalar `want()`/`have()` have zero callers;
`deriveState` uses only the word forms. **Fix:** `>` → `>=`, or delete the dead scalar methods.
*Tests: F2.*

---

## 3. Stress-Test Findings (p2p disconnect/reconnect)

| Scenario | Breaks? | Why | Sev |
|---|---|---|---|
| Overlapping flap, same device (new peer-add before old peer-remove) | **Yes** | `#pscByPeerId` clobbered, then stale connection's unconditional delete wipes the live entry + shared `remoteStates`. Live device drops from counts; `isSynced` stops blocking on it (D1). | High→Med |
| `#handlePeerAdd` duplicate-guard is protomux-keyed | **Yes** | Second concurrent connection for same peerId clobbers `#pscByPeerId`; no `=== psc` guard (D1 sibling). | Med |
| Server-websocket reconnect | **Yes** | Same as D1 but no `chooseDevicePeer` dedup — servers reconnect aggressively. Validate D1 fix here explicitly. | Med |
| Disconnect mid-presync during invite, no `initialSyncTimeoutMs` | **Yes (stall)** | `disconnectPeer` deletes `remoteStates`; `isInitiallySyncedWithPeer` returns false forever; `kWaitForInitialSyncWithPeer` has no disconnect-triggered rejection. Real callers pass a timeout. | Med |
| Leave / `kClearData` while connected & replicating | **Yes** | Cores closed/purged under active PSCs; in-flight `update({wait:true})` → unhandled rejection (A2/A4). | High |
| `project.close()` mid-sync | **Yes** | No SyncApi teardown; trailing throttled emit + autostop timer fire post-close; `#refreshSyncCapability` reads roles after sqlite close (A1/A3). | High |
| `kProjectLeave` ‖ `_close()` interleave | **Yes** | `_close()` has no idempotency guard; a close during the post-leave auth-resync window operates on half-torn-down state. **Highest-value missing race.** | High |
| Disconnect mid-data-block-transfer then reconnect (resume) | **Unverified** | want/wanted + contiguousLength recovery via `peer.onrange` (`core-sync-state.js:305`) not asserted. Promote to P0 test. | — |
| Selective blob download-intent across a relay | **Yes (gap)** | Download intents sent only to directly-connected peers (`blob-store/index.js:130`); never relayed transitively. Bites when an intermediate device is `isArchiveDevice:false`. | Med |

**Blob want-range / download-filter path is under-reviewed:** `hasDownloadFilter` defaults a
filtered peer to `wantsEverything:false` (`core-sync-state.js:261`); whether a filtered peer ever
reports `want===0` (and therefore whether `isInitiallySyncedWithPeer` resolves for an archive-false
device) is unverified and should be reviewed for completion-detection correctness.

---

## 4. Test Coverage Gaps (prioritized)

**P0 — high value, currently zero coverage**
1. `mutatingAddPeerState` status merge (`test/sync/namespace-sync-state.js`): two CoreSyncStates,
   same peer `'started'`+`'stopped'` → assert aggregate `'stopped'` in **both** iteration orders;
   `'started'`+`'starting'`→`'starting'`.
2. `deriveState` blocked-peer exclusion (`core-sync-state.js:504-509`): stub PSC with
   `syncCapability.auth:'blocked'`; assert peer omitted and its blocks excluded from `want/wanted`.
   (Today `peerSyncControllers` is always `new Map()` in tests → `isBlocked` never true.)
3. `contiguousLength` masking in `haveWord`/`wantWord`: non-32-aligned values, partial overlap,
   boundary at `index+32 === contiguousLength`, combined with `addWantRange`.
4. `waitForSync(type, {timeoutMs})` timer: rejects with `Error('Sync timeout')`; resets on each
   state event (resolves under continuous activity even past wall-clock).
5. Transitive/relay sync: A↔B, B↔C (no A↔C); A's docs reach C; B serves A's data after A leaves.
6. **Project close / leave during active transfer** (with a process-level `unhandledRejection`
   guard): assert LEFT_ROLE, no rejection, remaining peers still sync.
7. **Three-peer block isolation:** A blocks C; create on B; assert C stops receiving B's data once
   the block propagates to B; B's PSC reports `data.isSyncEnabled:false`.
8. Blocked→unblocked re-grant on a **live** session (data resumes without reconnect).
9. **Blocked peer still learns it is blocked** (regression guard for C1): auth stays enabled and
   `own-role-change` fires on the same session while data/config/blob are gated off.
10. Fuzz (`sync-fuzz.js`): add block/unblock/leave/disconnect-reconnect actions; encode the
    presync-before-data ordering invariant.
11. **Resume-after-mid-transfer:** disconnect mid-data-block, reconnect, assert want/wanted +
    contiguousLength recovery and eventual completion.
12. **`kProjectLeave` ‖ `_close()` interleave** + idempotency guard.
13. `pendingDiscoveryKeys` timer cleanup on close (no event-loop leak).
14. Server-websocket reconnect e2e (D1 on the server path).
15. Blob download-filter + completion (does a filtered archive-false peer's
    `isInitiallySyncedWithPeer` resolve?).
16. **3-peer completion** with a third peer that has no state yet — guards B1's fix from regressing
    into never-completing.

**P1 — medium:** device-count on peer removal; mid-sync role upgrade enables data live; multi-peer
autostop; block-during-active-write race; forked-role convergence (blocked-wins); cross-version
block+leave.

**P2 — low:** `'starting'` status in deriveState; `addPeer`/`disconnectPeer` transitions; scalar
boundary; fuzz convergence timeout scaling + monotonic re-verify.
