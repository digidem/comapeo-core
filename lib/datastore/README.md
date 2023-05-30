# Datastore

> Manage a collection of `DataType` instances.

## Purpose

The `Datastore` class is responsible for managing and indexing a collection of [`DataType`](../datatype/) instances.

## Usage

The `Datastore` class is used internally by the [`Authstore`](../authstore/) and [`Mapeo`](../../index.js) classes.

The API of this module is primarily a convenient wrapper around the [`DataType`](../datatype/) class.

An example of `Datastore` usage taken from the [datastore tests](../../tests/datastore.js):

```js
const datastore = new Datastore({
  corestore,
  sqlite,
  keyPair,
  identityPublicKey: identityKeyPair.publicKey,
})

await datastore.ready()
t.ok(datastore, 'datastore created')

const example = await datastore.dataType({
  name: 'example',
  blockPrefix: '0',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      version: { type: 'string' },
      value: { type: 'string' },
      created: { type: 'number' },
      updated: { type: 'number' },
      timestamp: { type: 'number' },
      links: { type: 'array' },
      forks: { type: 'array' },
      authorId: { type: 'string' },
    },
    additionalProperties: false,
  },
  extraColumns: `
      value TEXT,
      created INTEGER,
      updated INTEGER,
      timestamp INTEGER,
      authorId TEXT
    `,
})
```

## API docs

TODO!

## Tests

Tests for this module are in [tests/datastore.js](../../tests/datastore.js)
