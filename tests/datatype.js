import test from 'brittle'
import { createDataType } from './helpers/datatype.js'

test('datatype - create, encode, decode', async (t) => {
  t.plan(2)

  const { dataType } = await createDataType({
    name: 'test',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
      },
    },
    blockPrefix: '0',
    extraColumns: 'title TEXT, content TEXT, timestamp INTEGER',
  })

  const created = await dataType.create({
    title: 'Hello World',
    content: 'This is a test',
  })

  const updated = await dataType.update(
    Object.assign({}, created, { title: 'hi', links: [created.version] })
  )
  t.is(updated.title, 'hi', 'updated title')

  const notUpdated = dataType.update(
    Object.assign({}, created, { title: 'hi', links: [] })
  )

  t.exception(notUpdated, 'should throw error if previous version not provided as a link')
})
