# Indexer

> Index Mapeo data in Sqlite3

## Purpose

The `Indexer` class is a wrapper around a [`DataType` instance](../datatype/), an instance of [better-sqlite](https://npmjs.com/better-sqlite3), and internally instantiates [@mapeo/sqlite-indexer](https://npmjs.com/@mapeo/sqlite-indexer). It provides methods for querying data, adding batches of documents for indexing, and a way to listen for documents of specific versions to be indexed.

## Usage

This class is used internally in the [`DataStore` class](../datastore/) and isn't well-suited to use on its own.

For similar functionality look into using a package like [@mapeo/sqlite-indexer](https://npmjs.com/@mapeo/sqlite-indexer) in combination with [multi-core-indexer](https://npmjs.com/multi-core-indexer) to implement indexing using a similar approach.

## API docs

TODO!

## Tests

Tests for this module are in [tests/indexer.js](../../tests/indexer.js)
