import test from 'brittle'
import b4a from 'b4a'
import { DataType } from '../lib/datatype/index.js'

test('datatype - create, validate, encode, decode', async (t) => {
  t.plan(5)

  const dataType = new DataType({
    name: 'test',
    blockPrefix: 'test',
    schema: {
      type: 'object',
      properties: {
        value: { type: 'string' },
      },
    },
  })

  t.ok(dataType, 'datatype created')

  const valid = dataType.validate({
    value: 'test',
  })
  t.ok(valid, 'valid doc')

  try {
    const notValid = dataType.validate({
      value: 1,
    })
  } catch (err) {
    t.ok(err, 'invalid doc')
  }

  const encoded = dataType.encode({
    value: 'test',
  })

  t.ok(b4a.isBuffer(encoded), 'encoded doc is a buffer')

  const decoded = dataType.decode(encoded)
  t.ok(typeof decoded === 'object', 'decoded doc is an object')
})
