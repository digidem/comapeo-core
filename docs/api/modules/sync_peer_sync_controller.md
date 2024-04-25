[API](../README.md) / sync/peer-sync-controller

# Module: sync/peer-sync-controller

## Table of contents

### References

- [Namespace](sync_peer_sync_controller.md#namespace)

### Classes

- [PeerSyncController](../classes/sync_peer_sync_controller.PeerSyncController.md)

### Type Aliases

- [PeerState](sync_peer_sync_controller.md#peerstate)
- [SyncCapability](sync_peer_sync_controller.md#synccapability)
- [SyncStatus](sync_peer_sync_controller.md#syncstatus)

### Variables

- [DATA\_NAMESPACES](sync_peer_sync_controller.md#data_namespaces)
- [PRESYNC\_NAMESPACES](sync_peer_sync_controller.md#presync_namespaces)

## References

### Namespace

Re-exports [Namespace](core_manager_core_index.md#namespace)

## Type Aliases

### PeerState

Ƭ **PeerState**\<\>: \{ [namespace in Namespace]?: sync/core-sync-state }

#### Defined in

[src/sync/peer-sync-controller.js:280](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L280)

___

### SyncCapability

Ƭ **SyncCapability**\<\>: [`roles`](roles.md)[``"sync"``][[`Namespace`](sync_peer_sync_controller.md#namespace)] \| ``"unknown"``

#### Defined in

[src/sync/peer-sync-controller.js:10](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L10)

___

### SyncStatus

Ƭ **SyncStatus**\<\>: `Record`\<[`Namespace`](sync_peer_sync_controller.md#namespace), ``"unknown"`` \| ``"syncing"`` \| ``"synced"``\>

#### Defined in

[src/sync/peer-sync-controller.js:283](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L283)

## Variables

### DATA\_NAMESPACES

• `Const` **DATA\_NAMESPACES**: (``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``)[]

#### Defined in

[src/sync/peer-sync-controller.js:15](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L15)

___

### PRESYNC\_NAMESPACES

• `Const` **PRESYNC\_NAMESPACES**: (``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``)[]

#### Defined in

[src/sync/peer-sync-controller.js:14](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L14)
