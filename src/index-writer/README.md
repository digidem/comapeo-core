# IndexWriter

> Index documents by `docId` in a SQLite database

## Purpose

The `IndexWriter` class resolves the DAG (Directed Acyclic Graph) for each `docId` to create a materialized view in SQLite of the current "head" for each `docId`. A single `IndexWriter` is responsible for decoding hypercore entries and writing them to the appropriate table (one table for each Mapeo data type). Unknown entries / data types are ignored.

## Usage

`IndexWriter` is used by `DataStore` instances for writing entries that are read from the cores in the namespace managed by each `DataStore`. It exports a single method `batch(entries)` where an entry is:

```ts
type Entry = {
  block: Buffer // raw data entry read from a hypercore
  key: Buffer // public key of the hypercore where the block was read from
  index: number // index of the block in the hypercore
}
```

A usage example:

```js
const indexWriter = new IndexWriter({
  tables, // Array of Drizzle table schema definitions to index
  sqlite, // better-sqlite3 Database instance
})

indexWriter.batch(entries)
```

## API docs

TODO!

## Tests

There are no unit tests for the IndexWriter, tests coverage will be from end-to-end / integration tests.
