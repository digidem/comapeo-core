# DataType

> Define schemas and encode/decode functions for data models.

## Purpose

We created the `DataType` class to establish a clear method for creating and using multiple data types in Mapeo. We provide an array of DataTypes to the Mapeo class to determine which [`DataStore` instances](../datastore/) are made available.

For example, to be able to manage GeoJSON Point data:

```js
const points = new DataType({
  // ... provide relevant options
})

const mapeo = new Mapeo({
  dataTypes: [points],
  // ... additional required and optional options
})

// there is now an `points` property on `mapeo` with methods for managing data, including:
await mapeo.points.create()
await mapeo.points.update()
await mapeo.points.getById()
await mapeo.points.query()
```

## Usage

While this is primarily an internal class used by the main [`Mapeo` class](../../index.js), the `DataType` class can be used on its own.

Here's an example creating a GeoJSON Point `DataType`:

```js
import DataType from '@mapeo/core/lib/datatype/index.js'

const point = new DataType({
  name: 'point',
  blockPrefix: 'abcd', // magic string that is prefixed onto each block of this DataType for easy identification
  schema: {
    title: 'GeoJSON Point',
    type: 'object',
    required: ['type', 'coordinates'],
    properties: {
      type: {
        type: 'string',
        enum: ['Point'],
      },
      coordinates: PointCoordinates,
      bbox: BoundingBox,
    },
  },
  encode: (obj) => {
    return JSON.stringify(obj)
  },
  decode: (str) => {
    return JSON.parse(str)
  },
})
```

## API docs

TODO!

## Tests

Tests for this module are in [tests/datatype.js](../../tests/datatype.js)
