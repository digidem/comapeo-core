import assert from 'node:assert/strict'
import RAM from 'random-access-memory'
import { DataStore } from '../../src/datastore/index.js'
import { DataType } from '../../src/datatype/index.js'
import { IndexWriter } from '../../src/index-writer/index.js'
import { observationTable, translationTable } from '../../src/schema/project.js'
import { createCoreManager } from '../helpers/core-manager.js'

import { decode, decodeBlockPrefix } from '@comapeo/schema'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import TranslationApi from '../../src/translation-api.js'

/**
 * @param {object} [opts={}]
 * @param {Buffer} [opts.projectKey]
 */
export async function testenv(opts = {}) {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  migrate(db, {
    migrationsFolder: new URL('../../drizzle/project', import.meta.url)
      .pathname,
  })

  const coreManager = createCoreManager({ ...opts, db })

  const indexWriter = new IndexWriter({
    tables: [observationTable, translationTable],
    sqlite,
  })

  const dataStore = new DataStore({
    coreManager,
    namespace: 'data',
    batch: async (entries) => indexWriter.batch(entries),
    storage: () => new RAM(),
    reindex: false,
  })

  const configDataStore = new DataStore({
    coreManager,
    namespace: 'config',
    batch: async (entries) => {
      /** @type {import('multi-core-indexer').Entry[]} */
      const entriesToIndex = []
      for (const entry of entries) {
        const { schemaName } = decodeBlockPrefix(entry.block)
        try {
          if (schemaName === 'translation') {
            const doc = decode(entry.block, {
              coreDiscoveryKey: entry.key,
              index: entry.index,
            })
            assert(
              doc.schemaName === 'translation',
              'expected a translation doc'
            )
            translationApi.index(doc)
          }
          entriesToIndex.push(entry)
        } catch {
          // Ignore errors thrown by values that can't be decoded for now
        }
      }
      const indexed = await indexWriter.batch(entriesToIndex)
      return indexed
    },
    storage: () => new RAM(),
    reindex: false,
  })

  const translationDataType = new DataType({
    dataStore: configDataStore,
    table: translationTable,
    db,
    getTranslations: () => {
      throw new Error('Cannot get translations for translations')
    },
  })

  const translationApi = new TranslationApi({ dataType: translationDataType })

  const dataType = new DataType({
    dataStore,
    table: observationTable,
    db,
    getTranslations: translationApi.get.bind(translationApi),
  })

  return { coreManager, dataType, dataStore, translationApi }
}
