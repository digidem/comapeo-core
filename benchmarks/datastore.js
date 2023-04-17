import benchmark from 'nanobench'
import { createDataStore } from '../tests/helpers/datastore.js'

const datastore = await createDataStore({
    dataTypes: [
        {
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
        }
    ]
})

benchmark('create', async (b) => {
    b.start()
    for (let i = 0; i < 1000; i = i + 1) {
        await datastore.create('example', {
            value: `value ${i}`,
        })
    }
    b.end()
})
