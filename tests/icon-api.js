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
import { IndexWriter } from '../src/index-writer/index.js'

const smallIcon = 'myIconSmall'
const mediumIcon = 'myIconMedium'
const largeIcon = 'myIconLarge'
const cm = createCoreManager()
const sqlite = new Database(':memory:')
const db = drizzle(sqlite)
migrate(db, {
  migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
})

const indexWriter = new IndexWriter({
  tables: [iconTable],
  sqlite,
})

const iconDataStore = new DataStore({
  namespace: 'config',
  coreManager: cm,
  storage: () => new RAM(),
  batch: async (entries) => indexWriter.batch(entries),
})

const iconDataType = new DataType({
  dataStore: iconDataStore,
  table: iconTable,
  db,
})

const iconApi = new IconApi({ iconDataStore, iconDataType })

// eslint-disable-next-line no-unused-vars
test('icon create and get', async (t) => {
  const icon = 'myIcon'
  const iconDoc = await iconApi.create({
    name: 'myIcon',
    schemaName: 'icon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from(icon),
      },
    ],
  })

  const expectedIcon = await iconApi.getIcon({ iconId: iconDoc.docId })
  t.is(icon, expectedIcon.toString())
})

test('icon create and get with variants', async (t) => {
  const iconDoc = await iconApi.create({
    name: 'myIcon',
    schemaName: 'icon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from(smallIcon),
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: Buffer.from(mediumIcon),
      },
      {
        size: 'large',
        pixelDensity: 2,
        mimeType: 'image/png',
        blob: Buffer.from(largeIcon),
      },
    ],
  })

  const expectedIcon = await iconApi.getIcon({
    iconId: iconDoc.docId,
    size: 'large',
  })
  t.is(largeIcon, expectedIcon.toString())
})
test('icon create and get with variants, choosing the variant with more matching criteria', async (t) => {
  const iconDoc = await iconApi.create({
    name: 'myIcon',
    schemaName: 'icon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from(smallIcon),
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: Buffer.from(mediumIcon),
      },
      {
        size: 'large',
        pixelDensity: 2,
        mimeType: 'image/png',
        blob: Buffer.from(largeIcon),
      },
    ],
  })

  const expectedIcon = await iconApi.getIcon({
    iconId: iconDoc.docId,
    size: 'large',
    pixelDensity: 1,
    mimeType: 'image/svg+xml',
  })
  t.is(mediumIcon, expectedIcon.toString())
})
