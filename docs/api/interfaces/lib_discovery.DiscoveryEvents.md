[API](../README.md) / [lib/discovery](../modules/lib_discovery.md) / DiscoveryEvents

# Interface: DiscoveryEvents<\>

[lib/discovery](../modules/lib_discovery.md).DiscoveryEvents

## Table of contents

### Properties

- [connection](lib_discovery.DiscoveryEvents.md#connection)
- [error](lib_discovery.DiscoveryEvents.md#error)
- [peerStatus](lib_discovery.DiscoveryEvents.md#peerstatus)
- [topicStatus](lib_discovery.DiscoveryEvents.md#topicstatus)

## Properties

### connection

• **connection**: (`connection`: [`NoiseSecretStream`](lib_types.NoiseSecretStream.md), `info`: [`PeerInfo`](../classes/lib_discovery.PeerInfo.md)) => `void`

#### Type declaration

▸ (`connection`, `info`): `void`

##### Parameters

| Name         | Type                                                  |
| :----------- | :---------------------------------------------------- |
| `connection` | [`NoiseSecretStream`](lib_types.NoiseSecretStream.md) |
| `info`       | [`PeerInfo`](../classes/lib_discovery.PeerInfo.md)    |

##### Returns

`void`

#### Defined in

[lib/discovery/index.js:11](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L11)

---

### error

• **error**: (`error`: `Error`) => `void`

#### Type declaration

▸ (`error`): `void`

##### Parameters

| Name    | Type    |
| :------ | :------ |
| `error` | `Error` |

##### Returns

`void`

#### Defined in

[lib/discovery/index.js:14](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L14)

---

### peerStatus

• **peerStatus**: (`peerStatus`: { `peer`: [`PeerInfo`](../classes/lib_discovery.PeerInfo.md) ; `status`: `string` }) => `void`

#### Type declaration

▸ (`peerStatus`): `void`

##### Parameters

| Name                | Type                                               |
| :------------------ | :------------------------------------------------- |
| `peerStatus`        | `Object`                                           |
| `peerStatus.peer`   | [`PeerInfo`](../classes/lib_discovery.PeerInfo.md) |
| `peerStatus.status` | `string`                                           |

##### Returns

`void`

#### Defined in

[lib/discovery/index.js:13](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L13)

---

### topicStatus

• **topicStatus**: (`topicStatus`: { `dht`: [`TopicServiceStatus`](../types/lib_discovery.TopicServiceStatus.md) ; `mdns`: [`TopicServiceStatus`](../types/lib_discovery.TopicServiceStatus.md) ; `topic`: `string` }) => `void`

#### Type declaration

▸ (`topicStatus`): `void`

##### Parameters

| Name                | Type                                                                 |
| :------------------ | :------------------------------------------------------------------- |
| `topicStatus`       | `Object`                                                             |
| `topicStatus.dht`   | [`TopicServiceStatus`](../types/lib_discovery.TopicServiceStatus.md) |
| `topicStatus.mdns`  | [`TopicServiceStatus`](../types/lib_discovery.TopicServiceStatus.md) |
| `topicStatus.topic` | `string`                                                             |

##### Returns

`void`

#### Defined in

[lib/discovery/index.js:12](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L12)
