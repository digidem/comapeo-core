# DataType

> Create, read, update, delete, and query data.

## Purpose

The `DataType` class composes our [`Indexer` class](./indexer/) with a [`Corestore` instance](https://npmjs.com/corestore) used to store the local writer [hypercore](https://npmjs.com/hypercore) and all the relevant hypercores of peers in a project.

## Usage

The `DataType` class is used internally by the [`DataStore` class](../datastore/).

Currently it isn't easily usable on its own as it assumes it is used along with [multi-core-indexer](https://npmjs.com/multi-core-indexer) as part of the `DataStore` class.

A usage example with multi-core-indexer taken from the [DataType test helpers](../../tests/helpers/datatype.js):

```js
const dataType = new DataType({
  name,
  schema,
  blockPrefix,
  identityPublicKey: identityKeyPair.publicKey,
  corestore,
  keyPair,
  sqlite,
  extraColumns,
})

await dataType.ready()

const cores = [...corestore.cores.values()]
const indexer = new MultiCoreIndexer(cores, {
  storage: (key) => {
    return new ram(key)
  },
  batch: (entries) => {
    dataType.index(entries.map((entry) => entry.block))
  },
})
```

## API docs

TODO!

## Tests

Tests for this module are in [tests/datatype.js](../../tests/datatype.js)
