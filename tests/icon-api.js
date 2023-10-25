import test from 'brittle'
import RAM from 'random-access-memory'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomBytes } from 'node:crypto'

import IconApi, {
  kCreate,
  kGetIcon,
  kGetIconUrl,
  kGetBestVariant,
} from '../src/icon-api.js'
import { DataType } from '../src/datatype/index.js'
import { DataStore } from '../src/datastore/index.js'
import { createCoreManager } from './helpers/core-manager.js'
import { iconTable } from '../src/schema/project.js'
import { IndexWriter } from '../src/index-writer/index.js'

const expectedSmallIcon = randomBytes(128)
const expectedMediumIcon = randomBytes(128)
const expectedLargeIcon = randomBytes(128)
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
const projectId = randomBytes(32).toString('hex')
const iconApi = new IconApi({
  iconDataStore,
  iconDataType,
  projectId,
})

// eslint-disable-next-line no-unused-vars
test('icon api - create and get with one variant', async (t) => {
  const iconDoc = await iconApi[kCreate]({
    name: 'myIcon',
    schemaName: 'icon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from(expectedSmallIcon),
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon]({ iconId: iconDoc.docId })
  t.alike(icon, expectedSmallIcon)
})

test(`icon api - create and fail to find variant with matching mimeType`, async (t) => {
  // const iconDoc = await iconApi[kCreate]({
  //   name: 'myIcon',
  //   schemaName: 'icon',
  //   variants: [
  //     {
  //       size: 'small',
  //       pixelDensity: 1,
  //       mimeType: 'image/svg+xml',
  //       blob: Buffer.from(expectedSmallIcon),
  //     },
  //   ],
  // })

  // t.exception(
  //   await iconApi[kGetIcon]({
  //     iconId: iconDoc.docId,
  //     mimeType: 'image/png',
  //   }),
  //   'no matching mimeType for icon'
  // )
  t.pass()
})

test('icon api - create and get with different variants', async (t) => {
  const iconDoc = await iconApi[kCreate]({
    name: 'myIcon',
    schemaName: 'icon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from(expectedSmallIcon),
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: Buffer.from(expectedMediumIcon),
      },
      {
        size: 'large',
        pixelDensity: 2,
        mimeType: 'image/png',
        blob: Buffer.from(expectedLargeIcon),
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon]({
    iconId: iconDoc.docId,
    size: 'large',
  })
  t.alike(icon, expectedLargeIcon)
})

test('icon api - create and get with variants, choosing the variant with more matching criteria', async (t) => {
  const iconDoc = await iconApi[kCreate]({
    name: 'myIcon',
    schemaName: 'icon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from(expectedSmallIcon),
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: Buffer.from(expectedMediumIcon),
      },
      {
        size: 'large',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from(expectedLargeIcon),
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon]({
    iconId: iconDoc.docId,
    size: 'large',
    pixelDensity: 1,
    mimeType: 'image/png',
  })
  t.alike(icon, expectedLargeIcon)
})

test('icon api - create and get with variants, choosing the first variant with the first best score', async (t) => {
  const iconDoc = await iconApi[kCreate]({
    name: 'myIcon',
    schemaName: 'icon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from(expectedSmallIcon),
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: Buffer.from(expectedMediumIcon),
      },
      {
        size: 'large',
        pixelDensity: 2,
        mimeType: 'image/png',
        blob: Buffer.from(expectedLargeIcon),
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon]({
    iconId: iconDoc.docId,
    size: 'large',
    pixelDensity: 1,
    mimeType: 'image/svg+xml',
  })
  t.alike(icon, expectedMediumIcon)
})

test(`icon api - getIconUrl, test matching url`, async (t) => {
  const iconDoc = await iconApi[kCreate]({
    name: 'myIcon',
    schemaName: 'icon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from(expectedSmallIcon),
      },
    ],
  })

  const size = 'small'
  const pixelDensity = 1
  const expectedUrl = `/${projectId}/${iconDoc.docId}/${size}/${pixelDensity}`
  const url = await iconApi[kGetIconUrl]({
    iconId: iconDoc.docId,
    size: 'small',
    pixelDensity: 1,
  })
  t.is(url, expectedUrl)
})

test(`icon api - getBestVariant`, async (t) => {
  const variants = [
    {
      size: 'small',
      pixelDensity: 1,
      mimeType: 'image/png',
      blob: Buffer.from(expectedSmallIcon),
    },
    {
      size: 'medium',
      pixelDensity: 1,
      mimeType: 'image/svg+xml',
      blob: Buffer.from(expectedMediumIcon),
    },
    {
      size: 'large',
      pixelDensity: 2,
      mimeType: 'image/png',
      blob: Buffer.from(expectedLargeIcon),
    },
  ]
  const expectedVariant = variants[0]
  const variant = iconApi[kGetBestVariant](variants, {
    size: 'small',
    pixelDensity: 2,
  })
  t.is(variant, expectedVariant)
})
