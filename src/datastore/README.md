# DataStore

> Manage reading cores for indexing, and reading and writing documents to cores.

## Purpose

The `DataStore` class is an API over a CoreManager namespace, responsible for reading blocks for indexing from all cores in a namespace; writing new documents to the namespace writer core, and reading existing documents from any core in the namespace based on the `versionId`. `DataStore` does not write documents to an index, it only reads them for indexing - it will call the `batch()` constructor option with entries that are read from cores in the namespace that the datastore manages. Writes will only resolve once `batch()` resolves (e.g. once a document has been written to the SQLite index tables).

## Usage

The `DataStore` class is used internally by the [`DataType`](../datatype/) class.

An example of `DataStore` usage taken from the [datastore tests](../../test/datastore.js):

```js
const datastore = new DataStore({
  coreManager,
  batch: async (entries) => {
    // Process entries here using an indexer...
  },
  namespace: 'data',
})

/** @type {MapeoDoc} */
const newObservation = await datastore.write(observationValue)
/** @type {MapeoDoc} */
const existingObservation = await datastore.read(versionId)

datastore.on('index-state', ({ current, remaining, entriesPerSecond }) => {
  if (current === 'idle') {
    // indexing done for now
  } else if (current === 'indexing') {
    // show state to user that indexing is happening
  }
})

const { current, remaining, entriesPerSecond } = datastore.getIndexState()
```

## API docs

TODO!

## Tests

Tests for this module are in [test/datastore.js](../../test/datastore.js)
