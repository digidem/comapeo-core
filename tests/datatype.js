import test from 'brittle'
import { createDataType } from './helpers/datatype.js'

test('datatype - create, encode, decode', async (t) => {
  t.plan(3)

  const { dataType } = await createDataType({
    namespace: 'data',
    name: 'Observation',
    schemaName: 'Observation',
    schemaVersion: 5,
  })

  const created = await dataType.create({
    tags: {
      title: 'Hello World',
    },
  })

  t.is(created.tags.title, 'Hello World', 'created doc')

  const updated = await dataType.update(
    Object.assign({}, created, {
      links: [created.version],
      tags: { title: 'hi' },
    })
  )

  t.is(updated.tags.title, 'hi', 'updated title')

  const notUpdated = dataType.update(
    Object.assign({}, created, {
      tags: { title: 'hi' },
      links: [],
    })
  )

  t.exception(
    notUpdated,
    'should throw error if previous version not provided as a link'
  )
})
