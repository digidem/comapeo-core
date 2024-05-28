[API](../README.md) / [\<internal\>](internal_.md) / "/home/runner/work/mapeo-core-next/mapeo-core-next/src/local-peers"

# Namespace: "/home/runner/work/mapeo-core-next/mapeo-core-next/src/local-peers"

[\<internal\>](internal_.md)."/home/runner/work/mapeo-core-next/mapeo-core-next/src/local-peers"

## Table of contents

### References

- [LocalPeers](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#localpeers)
- [PeerInfoBase](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfobase)
- [PeerInfoConnected](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfoconnected)
- [PeerInfoDisconnected](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfodisconnected)

### Classes

- [PeerDisconnectedError](../classes/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.PeerDisconnectedError.md)
- [PeerFailedConnectionError](../classes/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.PeerFailedConnectionError.md)
- [UnknownPeerError](../classes/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.UnknownPeerError.md)

### Interfaces

- [LocalPeersEvents](../interfaces/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.LocalPeersEvents.md)

### Type Aliases

- [PeerInfo](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfo)
- [PeerInfoConnecting](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfoconnecting)
- [PeerInfoInternal](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfointernal)
- [PeerState](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerstate)

### Variables

- [kTestOnlySendRawInvite](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#ktestonlysendrawinvite)

## References

### LocalPeers

Re-exports [LocalPeers](../classes/internal_.LocalPeers.md)

___

### PeerInfoBase

Re-exports [PeerInfoBase](../interfaces/internal_.PeerInfoBase.md)

___

### PeerInfoConnected

Re-exports [PeerInfoConnected](internal_.md#peerinfoconnected)

___

### PeerInfoDisconnected

Re-exports [PeerInfoDisconnected](internal_.md#peerinfodisconnected)

## Type Aliases

### PeerInfo

Ƭ **PeerInfo**\<\>: [`PeerInfoConnected`](internal_.md#peerinfoconnected) \| [`PeerInfoDisconnected`](internal_.md#peerinfodisconnected)

___

### PeerInfoConnecting

Ƭ **PeerInfoConnecting**\<\>: [`PeerInfoBase`](../interfaces/internal_.PeerInfoBase.md) & \{ `status`: ``"connecting"``  }

___

### PeerInfoInternal

Ƭ **PeerInfoInternal**\<\>: [`PeerInfoConnecting`](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfoconnecting) \| [`PeerInfoConnected`](internal_.md#peerinfoconnected) \| [`PeerInfoDisconnected`](internal_.md#peerinfodisconnected)

___

### PeerState

Ƭ **PeerState**\<\>: [`PeerInfoInternal`](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#peerinfointernal)[``"status"``]

## Variables

### kTestOnlySendRawInvite

• `Const` **kTestOnlySendRawInvite**: typeof [`kTestOnlySendRawInvite`](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_local_peers_.md#ktestonlysendrawinvite)
