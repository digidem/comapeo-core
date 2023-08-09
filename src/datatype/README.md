# DataType

> Create, read, update, delete, and query data.

## Purpose

The `DataType` class implements CRUD methods for a particular Mapeo data type. Reads and queries are done from the SQLite indexes / materialized views. Historical data read from a `versionId` is read from the associated `DataStore`.

## Usage

`DataType` is exposed directly on the client API for data types that can be read/written directly by the client. It serves as an abstraction for reading indexed data and creating/updating documents for all data types stored in Mapeo core namespaces.

A usage example:

```js
const dataType = new DataType({
  table: observationTable, // Drizzle table schema definition
  db, // Drizzle instance
  dataStore, // DataStore instance
})

const observation = await observation.getByDocId(id)
const updated = await observation.update(observation.versionId, newValue)
const allObservations = await observation.getMany()
```

## API docs

TODO!

## Tests

Tests for this module are in [tests/datatype.js](../../tests/datatype.js)
