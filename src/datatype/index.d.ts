// Typescript was incorrectly compiling declaration files for this, so the
// declaration for DataType is written manually below, and copied into the
// `dist` folder at build-time. The types are checked in `test-types/data-types.ts`

import { type MapeoDoc, type MapeoValue } from '@mapeo/schema'
import {
  type MapeoDocMap,
  type MapeoValueMap,
  type CoreOwnershipWithSignaturesValue,
} from '../types.js'
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { SQLiteSelectBase } from 'drizzle-orm/sqlite-core'
import { RunResult } from 'better-sqlite3'
import type Hypercore from 'hypercore'
import { TypedEmitter } from 'tiny-typed-emitter'
import TranslationApi from '../translation-api.js'

type MapeoDocTableName = `${MapeoDoc['schemaName']}Table`
type GetMapeoDocTables<T> = T[keyof T & MapeoDocTableName]
/** Union of Drizzle schema tables that correspond to MapeoDoc types (e.g. excluding backlink tables and other utility tables) */
type MapeoDocTables =
  | GetMapeoDocTables<typeof import('../schema/project.js')>
  | GetMapeoDocTables<typeof import('../schema/client.js')>
type MapeoDocTablesMap = {
  [K in MapeoDocTables['_']['name']]: Extract<
    MapeoDocTables,
    { _: { name: K } }
  >
}
export interface DataTypeEvents<TDoc extends MapeoDoc> {
  'updated-docs': (docs: TDoc[]) => void
}

export const kCreateWithDocId: unique symbol
export const kSelect: unique symbol
export const kTable: unique symbol

type OmitUnion<T, K extends keyof any> = T extends any ? Omit<T, K> : never
type ExcludeSchema<
  T extends MapeoValue,
  S extends MapeoValue['schemaName']
> = Exclude<T, { schemaName: S }>

export class DataType<
  TDataStore extends import('../datastore/index.js').DataStore,
  TTable extends MapeoDocTables,
  TSchemaName extends TTable['_']['name'],
  TDoc extends MapeoDocMap[TSchemaName],
  TValue extends MapeoValueMap[TSchemaName]
> extends TypedEmitter<DataTypeEvents<TDoc>> {
  constructor({
    dataStore,
    table,
    getPermissions,
    db,
    getTranslations,
  }: {
    table: TTable
    dataStore: TDataStore
    db: import('drizzle-orm/better-sqlite3').BetterSQLite3Database
    getPermissions?: () => any
    getTranslations: TranslationApi['get']
  })

  get [kTable](): TTable

  get writerCore(): Hypercore<'binary', Buffer>

  [kCreateWithDocId](
    docId: string,
    value:
      | ExcludeSchema<TValue, 'coreOwnership'>
      | CoreOwnershipWithSignaturesValue
  ): Promise<TDoc & { forks: string[] }>

  [kSelect](): Promise<SQLiteSelectBase<TTable, 'sync', RunResult>>

  create<
    T extends import('type-fest').Exact<
      ExcludeSchema<TValue, 'coreOwnership'>,
      T
    >
  >(value: T): Promise<TDoc & { forks: string[] }>

  getByDocId(
    docId: string,
    opts?: { lang?: string }
  ): Promise<TDoc & { forks: string[] }>

  getByVersionId(versionId: string, opts?: { lang?: string }): Promise<TDoc>

  getMany(opts?: {
    includeDeleted?: boolean
    lang?: string
  }): Promise<Array<TDoc & { forks: string[] }>>

  update<
    T extends import('type-fest').Exact<
      ExcludeSchema<TValue, 'coreOwnership'>,
      T
    >
  >(versionId: string | string[], value: T): Promise<TDoc & { forks: string[] }>

  delete(docId: string): Promise<TDoc & { forks: string[] }>
}
