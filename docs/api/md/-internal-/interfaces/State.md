[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / State

# Interface: State

## Properties

### data

> **data**: `object`

state of data namespace syncing (data and blob) for local device

#### isSyncEnabled

> **isSyncEnabled**: `boolean`

***

### initial

> **initial**: `object`

state of initial namespace syncing (auth, config, and blob index) for local device

#### isSyncEnabled

> **isSyncEnabled**: `boolean`

***

### remoteDeviceSyncState

> **remoteDeviceSyncState**: `Record`\<`string`, [`RemoteDeviceSyncState`](RemoteDeviceSyncState.md)\>

sync states for remote peers
