# Sync API reference

The sync API lives on each project instance as `project.$sync`. For the
conceptual model (namespaces, roles, the auth-first gate) see
[concepts/sync.md](../concepts/sync.md); for how the old API maps to this one
see the [migration guide](../guides/migrating.md).

Two ideas underpin everything here:

- **Sync mode** is *this device's intent*: what it is currently willing to
  replicate. `'initial'` (the default whenever a peer is connected) covers the
  `auth`, `config` and `blobIndex` namespaces; `'all'` adds `data` and `blob`;
  `'stopped'` means nothing replicates (only reached when backgrounded).
- **Per-device state** is *what is actually happening* with each connected
  project member, which additionally depends on the other side's intent and
  on the member's role.

## Methods

### `getState(): SyncApiState`

Returns the current state (shape below). The same value is emitted on the
`'sync-state'` event whenever it changes (throttled to at most one emit per
200ms).

### `start({ autostopDataSyncAfter? })`

Start syncing the data namespaces, in addition to the initial namespaces
(which sync whenever a peer is connected). Optionally pass
`autostopDataSyncAfter` (milliseconds, or `null` to disable): if no data-sync
activity happens for that duration, sync stops as if `stop()` was called.

### `stop()`

Stop syncing the data namespaces. Initial namespaces continue syncing unless
the app is backgrounded.

### `setAutostopDataSyncTimeout(ms | null)`

Change the autostop duration without toggling sync.

### `waitForSync(target, { timeoutMs? }): Promise<void>`

Resolves when sync for `target` (`'initial'` or `'all'`) is complete with
every connected device. `timeoutMs` is a *stall* timeout, not a deadline: as
long as sync activity continues the promise never times out; it rejects with
`Error('Sync timeout')` only after `timeoutMs` passes with no activity.

Completion means: for every currently-connected device, in every namespace of
the target that the device's role allows, there is nothing left to send or
receive, no replication channel is still opening, and the device has passed
the auth gate (its role records synced, indexed, and re-read). Two
consequences worth knowing:

- **Disconnected devices never block completion.** If a peer disconnects
  mid-sync, whatever it still had for us (or needed from us) is forgotten,
  and the remaining devices complete normally.
- **With no devices connected, sync is trivially complete.** Wait for
  `Object.keys(getState().devices).length > 0` first if you need "synced
  with someone".

### `connectServers()` / `disconnectServers()`

Open/close websocket connections to the project's server peers (added via
`project.$member.addServerPeer()`). Server peers then appear in `devices`
like any other member.

## Events

### `'sync-state'` → `SyncApiState`

Emitted (throttled) whenever the state changes, including a final emit when
the project closes, so pending `waitForSync()` calls settle.

## State shape

```ts
{
  syncMode: 'stopped' | 'initial' | 'all',
  initial: { have, toReceive, toSend },   // totals, each unique block once
  data:    { have, toReceive, toSend },
  devices: {
    [deviceId]: {
      initial: { isSyncEnabled, isComplete, toReceive, toSend },
      data:    { isSyncEnabled, isComplete, toReceive, toSend },
    }
  }
}
```

All counts are **blocks** (not documents or bytes) and always from the local
device's point of view: `toReceive` = blocks we still need, `toSend` = blocks
another device still needs from us.

**Top-level `initial` / `data`** are project-wide totals in which each unique
block is counted **once**, however many devices hold or need it: `toReceive`
= blocks we lack that at least one connected device has; `toSend` = blocks at
least one connected device lacks that we have. Use these for a "progress
toward done" display: they shrink as blocks move and reach 0 exactly when the
group is complete with everyone. They are not transfer predictions — devices
also receive blocks from each other, so the bytes this device actually sends
may be less than `toSend` suggests.

**`devices`** contains every connected project member (keyed by device ID),
so `Object.keys(devices).length` is a reliable connected-member count. Its
per-device counts are per-pair truths: a block that three devices all need
from us appears in each of their `toSend` counts, so summing per-device
counts across devices over-counts — that is what the top-level totals are
for. Per device and namespace group:

- `isSyncEnabled` — replication channels are open with this device, which
  requires *both* sides to have enabled the group. For `data` this tells you
  whether the other device has started data sync too.
- `isComplete` — nothing left to send or receive with this device in this
  group (same predicate as `waitForSync`).
- A newly-connected device shows `initial.isSyncEnabled: true` but
  `data.isSyncEnabled: false` until initial sync with it completes (and, if
  data sync is on, its channels open). A device whose role blocks a group
  (e.g. a blocked device's everything-but-auth) reports that group as
  complete — it will never sync, so it should not read as pending.

## Aggregation helper: `@comapeo/core/sync-state.js`

For frontends that want a single "sync with everyone" summary, the
`sync-state.js` subpath export is dependency-free (safe to import in a
frontend bundle without pulling in backend code):

```js
import { aggregateSyncState } from '@comapeo/core/sync-state.js'

const { syncMode, deviceCount, initial, data } = aggregateSyncState(
  project.$sync.getState()
)
// initial/data: { isComplete, have, toReceive, toSend, syncingDeviceCount }
```

`isComplete` matches `waitForSync()` semantics (complete with every connected
device; `true` when none are connected); the block counts are the top-level
totals; `syncingDeviceCount` is how many devices the group is actively
replicating with.
