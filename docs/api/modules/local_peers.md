[API](../README.md) / local-peers

# Module: local-peers

## Table of contents

### Classes

- [LocalPeers](../classes/local_peers.LocalPeers.md)
- [PeerDisconnectedError](../classes/local_peers.PeerDisconnectedError.md)
- [PeerFailedConnectionError](../classes/local_peers.PeerFailedConnectionError.md)
- [UnknownPeerError](../classes/local_peers.UnknownPeerError.md)

### Interfaces

- [LocalPeersEvents](../interfaces/local_peers.LocalPeersEvents.md)
- [PeerInfoBase](../interfaces/local_peers.PeerInfoBase.md)

### Type Aliases

- [PeerInfo](local_peers.md#peerinfo)
- [PeerInfoConnected](local_peers.md#peerinfoconnected)
- [PeerInfoConnecting](local_peers.md#peerinfoconnecting)
- [PeerInfoDisconnected](local_peers.md#peerinfodisconnected)
- [PeerInfoInternal](local_peers.md#peerinfointernal)
- [PeerState](local_peers.md#peerstate)

## Type Aliases

### PeerInfo

Ƭ **PeerInfo**\<\>: [`PeerInfoConnected`](local_peers.md#peerinfoconnected) \| [`PeerInfoDisconnected`](local_peers.md#peerinfodisconnected)

#### Defined in

[src/local-peers.js:49](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L49)

___

### PeerInfoConnected

Ƭ **PeerInfoConnected**\<\>: [`PeerInfoBase`](../interfaces/local_peers.PeerInfoBase.md) & \{ `connectedAt`: `number` ; `protomux`: `Protomux`\<`__module`\> ; `status`: ``"connected"``  }

#### Defined in

[src/local-peers.js:45](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L45)

___

### PeerInfoConnecting

Ƭ **PeerInfoConnecting**\<\>: [`PeerInfoBase`](../interfaces/local_peers.PeerInfoBase.md) & \{ `status`: ``"connecting"``  }

#### Defined in

[src/local-peers.js:44](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L44)

___

### PeerInfoDisconnected

Ƭ **PeerInfoDisconnected**\<\>: [`PeerInfoBase`](../interfaces/local_peers.PeerInfoBase.md) & \{ `disconnectedAt`: `number` ; `status`: ``"disconnected"``  }

#### Defined in

[src/local-peers.js:46](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L46)

___

### PeerInfoInternal

Ƭ **PeerInfoInternal**\<\>: [`PeerInfoConnecting`](local_peers.md#peerinfoconnecting) \| [`PeerInfoConnected`](local_peers.md#peerinfoconnected) \| [`PeerInfoDisconnected`](local_peers.md#peerinfodisconnected)

#### Defined in

[src/local-peers.js:48](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L48)

___

### PeerState

Ƭ **PeerState**\<\>: [`PeerInfoInternal`](local_peers.md#peerinfointernal)[``"status"``]

#### Defined in

[src/local-peers.js:50](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/local-peers.js#L50)
