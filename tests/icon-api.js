import test from 'brittle'
import RAM from 'random-access-memory'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import IconApi from '../src/icon-api.js'
import { DataType } from '../src/datatype/index.js'
import { DataStore } from '../src/datastore/index.js'
import { createCoreManager } from './helpers/core-manager.js'
import { iconTable } from '../src/schema/project.js'

// eslint-disable-next-line no-unused-vars
test('icon create and get', async (t) => {
  const cm = createCoreManager()
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  migrate(db, {
    migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
  })

  const iconDataStore = new DataStore({
    namespace: 'config',
    coreManager: cm,
    storage: () => new RAM(),
    batch: async () => {
      await new Promise((res) => setTimeout(res, 10))
    },
  })
  const iconDataType = new DataType({
    dataStore: iconDataStore,
    table: iconTable,
    db,
  })
  const iconApi = new IconApi({ iconDataStore, iconDataType })
  const iconDoc = await iconApi.create({
    name: 'myIcon',
    schemaName: 'icon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from('myIcon'),
      },
    ],
  })
  console.log('doc', iconDoc)
})
