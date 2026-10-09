# Migration guides

## Sync API redesign

The sync API (`project.$sync`) was redesigned (see
[PR #1304](https://github.com/digidem/comapeo-core/pull/1304) for the
rationale). This is a breaking change for anything consuming
`getState()` / `'sync-state'`. Full semantics are in the
[sync API reference](../api/sync.md); this section is the old → new mapping.

### State shape

| Old | New |
| --- | --- |
| `initial.isSyncEnabled` (top level) | `syncMode !== 'stopped'` |
| `data.isSyncEnabled` (top level) | `syncMode === 'all'` |
| `remoteDeviceSyncState` | `devices` — now a reliable connected-member list across reconnects |
| `remoteDeviceSyncState[d].<group>.want` (blocks they want from us) | `devices[d].<group>.toSend` |
| `remoteDeviceSyncState[d].<group>.wanted` (blocks we want from them) | `devices[d].<group>.toReceive` |
| *(none)* | `devices[d].<group>.isComplete` — same predicate as `waitForSync()` |
| *(none)* | top-level `initial` / `data` `{ have, toReceive, toSend }` — project-wide totals counting each unique block once |

Things to watch beyond the renames:

- **`want`/`wanted` flipped meaning** between the local entry and remote
  entries in the old state; `toReceive`/`toSend` are always from the local
  device's point of view. Double-check the direction anywhere you mapped
  these to UI.
- **Don't sum per-device counts for a total** — a block that several devices
  hold (or need) is counted once per device. Use the new top-level totals,
  or `aggregateSyncState()` below.
- `Object.keys(devices).length` is now a dependable connected-member count;
  the old `remoteDeviceSyncState` could drop or duplicate devices across
  overlapping reconnects.

### Methods

| Old | New |
| --- | --- |
| `waitForSync('full')` | `waitForSync('all')` |
| *(none)* | `close()` — called by the project on close; external callers don't need it |

`start()`, `stop()`, `setAutostopDataSyncTimeout()`, `connectServers()` and
`disconnectServers()` are unchanged.

### Behavior changes

- **Staged enabling (the auth gate):** with each peer, `config`/`blobIndex`
  replicate only after auth sync with that peer completes (and its role is
  re-read), and `data`/`blob` only after initial sync with that peer
  completes. UIs will see a device's `data.isSyncEnabled` flip on slightly
  later than before; the wire protocol is unchanged.
- **A blocked device's pre-block data keeps propagating** (it always kept
  syncing *to* devices that had it; now its cores are also added by devices
  that learn of it after the block, matching LEFT devices).

### Aggregation helper

For a project-wide summary, import the dependency-free helper instead of
aggregating in the frontend:

```js
import { aggregateSyncState } from '@comapeo/core/sync-state.js'
```

See the [sync API reference](../api/sync.md#aggregation-helper-comapeocoresync-statejs).

## Mapeo Core v8 → @comapeo/core

TODO!
