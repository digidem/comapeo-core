# DataStore

> Create, read, update, delete, and query data.

## Purpose
The `DataStore` class composes our [`Indexer` class](../indexer/) with the [`Corestore` instance](https://npmjs.com/corestore) used to store the local writer [hypercore](https://npmjs.com/hypercore) and all the relevant hypercores of peers in a project.

## Usage
The `DataStore` class is used internally by the main [`Mapeo` class](../../index.js).

Currently it isn't usable on its own as it requires an instance of the `Indexer` class, which in turn currently assumes it is used along with [multi-core-indexer](https://npmjs.com/multi-core-indexer) as part of the `Mapeo` class.

The API of this module is primarily a convenient wrapper around the [`DataType`](../datatype/) and `Indexer` classes.

## API docs

TODO!

## Tests
Tests for this module are in [tests/datastore.js](../../tests/datastore.js)
