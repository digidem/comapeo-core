# Discovery

> Discover other peers via the DHT or MDNS and replicate with them

## Usage

The `Discovery` class provides an abstraction layer that allows peer discovery using either a [distributed hash table](https://en.wikipedia.org/wiki/Distributed_hash_table) (DHT) via [hyperswarm](https://npmjs.com/hyperswarm) or [Multicast DNS](https://en.wikipedia.org/wiki/Multicast_DNS) (mDNS) via [multicast-service-discovery](https://npmjs.com/multicast-service-discovery).

```js
import Hypercore from 'hypercore'
import { KeyManager } from '@mapeo/crypto'
import { Discovery } from './index.js'

const rootKey = KeyManager.generateRootKey()
const keyManager = new KeyManager(rootKey)
const identityKeyPair = keyManager.getIdentityKeypair()

const core = new Hypercore()
await core.ready()

const discover = new Discovery({
  identityKeyPair,
  mdns: true,
  dht: true,
})

await discover.ready()

discover.on('connection', (connection, peer) => {
  core.replicate(connection)
})

await discover.join(core.discoveryKey)
```

## API Docs

TODO!

## Tests

The tests for this module are in [tests/discovery.js](../../tests/discovery.js)
