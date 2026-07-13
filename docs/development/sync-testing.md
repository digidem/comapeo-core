# Sync test suite

How the sync tests are organized, what each layer is for, and the decisions
behind the structure. Companion to `sync-redesign.md`.

## Layers

**Unit (`test/sync/`)** — only for logic that needs exactly-controlled inputs
that e2e cannot produce:

- `sync-rules.js` — the pure decision functions: the sync-mode truth table,
  the staged namespace-enabling rules (auth gate → initial → data),
  completion predicates, and public-state derivation. Exhaustive tables live
  here because e2e can't drive every combination.
- `core-sync-state.js` — the bitfield math (`deriveCoreState`): exact
  have/toReceive/toSend counts from controlled bitfields, word and page
  boundaries, contiguous-length masking, blocked-peer exclusion. E2E asserts
  that counts *converge*; only unit tests can assert they are *exactly
  right*.

The old "CoreSyncState integration" unit test (replicating real hypercores
inside a unit test) was deleted: everything it exercised — channel
transitions, pre-have→bitfield switchover — is exercised continuously by the
e2e suite, and its exact-count assertions are covered by the pure
`deriveCoreState` scenarios.

**E2E (`test-e2e/sync-*.js`)** — everything else, written as *scenarios*
against the public API via the `sync-scenario.js` helper, one concern per
file:

| File | Covers |
|---|---|
| `sync-data.js` | Data converges across devices, with realistic data volumes; core sharing; transitive relay sync |
| `sync-state.js` | The public `getState()`/`sync-state` shape: progress counts, per-device enabled/complete flags, completion (`waitForSync`), completion with disconnected peers, stall timeouts |
| `sync-lifecycle.js` | start/stop, autostop, backgrounding, project close and leave during active sync (teardown, no leaked listeners or unhandled rejections) |
| `sync-capability.js` | Roles gating sync: blocked/removed devices, the auth-first gate and stale role records, block/unblock on a live session, three-peer block isolation |
| `sync-connection.js` | Disconnect/reconnect: offline data syncing on reconnect, resume after mid-transfer disconnect, overlapping connections from one device |
| `sync-blobs.js` | Blob sync and archive-device filtering |
| `sync-fuzz.js` | Randomized action sequences asserting convergence |
| `cross-version-sync.js` | Syncing with an old published @comapeo/core |
| `sync-leave-regression.js` | leaveProject with stalled propagation (controllable wire) |

**Test seams.** The sync module exposes *no* test-only symbols: every e2e
assertion goes through the public `$sync` API (whose `devices` state now
carries per-device `toReceive`/`toSend`/`isComplete`, which is what the old
white-box assertions were reaching for). The two seams that remain are not
sync-specific: `kCoreManager`/`kCoreOwnership` on the project (used to assert
which cores were added), and `controllable-wire.js`, which drives two real
projects over a pausable/latency transport for timing-dependent scenarios.
The `syncThrottleMs` option (threaded manager → project → SyncApi) removes
the 200ms state throttle where determinism matters.

## Realistic data volumes

Bugs have repeatedly hidden behind small test datasets: several code paths
(bitfield words, stream buffering, batching) only activate once cores exceed
32/thousands of blocks or blobs reach real sizes. Convention:

- The primary convergence test (`sync-data.js`) seeds **hundreds of
  observations per device** (cores well past one 32-bit bitfield word) and
  real multi-megabyte photo fixtures.
- The mid-transfer-resume test seeds 600+ observations so a disconnect
  genuinely lands mid-transfer.
- State-shape tests that assert *exact* counts use small, exact seeds — the
  point there is the shape, not the volume.

## Duplicates removed in the refactor

- "start and stop sync" and "sync only happens if both sides are enabled"
  asserted the same one-sided-enable behavior → one scenario.
- "updates sync state when peers are added" (2 devices) was subsumed by
  "correct sync state prior to data sync" (6 devices); the exact-shape
  assertion moved there.
- `role-update-sync-capability.js` (live member→blocked downgrade) folded
  into `sync-capability.js` alongside the other block/unblock scenarios.

## Known gaps (deliberate, tracked)

- Server-websocket reconnect (the overlapping-connection scenario on the
  server path) needs the @comapeo/cloud harness in `server.js`.
- Blob download-intent relay across an intermediate non-archive device is a
  product design question before it is a test gap.
- The C1-style "unrelated auth write clobbers capability" interleave is
  structurally impossible in the new architecture (single capability writer,
  no state-event-triggered re-read); the invariant it protected — a blocked
  peer keeps receiving auth so it learns it was blocked — is covered in
  `sync-capability.js`.
