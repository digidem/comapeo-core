[API](../README.md) / [\<internal\>](internal_.md) / "/home/szgy/src/dd/mapeo-core-next/src/local-peers"

# Namespace: "/home/szgy/src/dd/mapeo-core-next/src/local-peers"

[\<internal\>](internal_.md)."/home/szgy/src/dd/mapeo-core-next/src/local-peers"

## Table of contents

### References

- [LocalPeers](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#localpeers)
- [PeerInfoBase](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerinfobase)
- [PeerInfoConnected](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerinfoconnected)
- [PeerInfoDisconnected](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerinfodisconnected)

### Classes

- [PeerDisconnectedError](../classes/internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.PeerDisconnectedError.md)
- [PeerFailedConnectionError](../classes/internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.PeerFailedConnectionError.md)
- [UnknownPeerError](../classes/internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.UnknownPeerError.md)

### Interfaces

- [LocalPeersEvents](../interfaces/internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.LocalPeersEvents.md)

### Type Aliases

- [PeerInfo](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerinfo)
- [PeerInfoConnecting](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerinfoconnecting)
- [PeerInfoInternal](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerinfointernal)
- [PeerState](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerstate)

### Variables

- [kTestOnlySendRawInvite](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#ktestonlysendrawinvite)

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

#### Defined in

[src/local-peers.js:51](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L51)

___

### PeerInfoConnecting

Ƭ **PeerInfoConnecting**\<\>: [`PeerInfoBase`](../interfaces/internal_.PeerInfoBase.md) & \{ `status`: ``"connecting"``  }

#### Defined in

[src/local-peers.js:46](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L46)

___

### PeerInfoInternal

Ƭ **PeerInfoInternal**\<\>: [`PeerInfoConnecting`](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerinfoconnecting) \| [`PeerInfoConnected`](internal_.md#peerinfoconnected) \| [`PeerInfoDisconnected`](internal_.md#peerinfodisconnected)

#### Defined in

[src/local-peers.js:50](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L50)

___

### PeerState

Ƭ **PeerState**\<\>: [`PeerInfoInternal`](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#peerinfointernal)[``"status"``]

#### Defined in

[src/local-peers.js:52](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L52)

## Variables

### kTestOnlySendRawInvite

• `Const` **kTestOnlySendRawInvite**: typeof [`kTestOnlySendRawInvite`](internal_.__home_szgy_src_dd_mapeo_core_next_src_local_peers_.md#ktestonlysendrawinvite)

#### Defined in

[src/local-peers.js:38](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/local-peers.js#L38)
