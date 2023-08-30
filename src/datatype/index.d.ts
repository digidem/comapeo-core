// Typescript was incorrectly compiling declaration files for this, so the
// declaration for DataType is written manually below, and copied into the
// `dist` folder at build-time. The types are checked in `test-types/data-types.ts`

import { type MapeoDoc, type MapeoValue } from '@mapeo/schema'
import {
  type MapeoDocMap,
  type MapeoValueMap,
  type CoreOwnershipWithSignatures,
} from '../types.js'
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { SQLiteSelectBuilder } from 'drizzle-orm/sqlite-core'
import { RunResult } from 'better-sqlite3'

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

export const kCreateWithDocId: unique symbol
export const kSelect: unique symbol
export const kTable: unique symbol

type OmitUnion<T, K extends keyof any> = T extends any ? Omit<T, K> : never

// We do this because we can't pass a generic to this (an "indexed access type")
// https://stackoverflow.com/a/75792683/3794085
declare const from: SQLiteSelectBuilder<undefined, 'sync', RunResult>['from']

export class DataType<
  TDataStore extends import('../datastore/index.js').DataStore,
  TTable extends MapeoDocTables,
  TSchemaName extends TTable['_']['name'],
  TDoc extends MapeoDocMap[TSchemaName],
  TValue extends MapeoValueMap[TSchemaName]
> {
  constructor({
    dataStore,
    table,
    getPermissions,
    db,
  }: {
    table: TTable
    dataStore: TDataStore
    db: import('drizzle-orm/better-sqlite3').BetterSQLite3Database
    getPermissions?: () => any
  })

  get [kTable](): TTable

  [kCreateWithDocId]<
    T extends import('type-fest').Exact<
      // For this we use the "internal" version of CoreOwnership, with signatures
      | Exclude<TValue, { schemaName: 'coreOwnership' }>
      | CoreOwnershipWithSignaturesValue,
      T
    >
  >(docId: string, value: T): Promise<TDoc & { forks: string[] }>

  [kSelect](): ReturnType<typeof from<TTable>>

  create<T extends import('type-fest').Exact<TValue, T>>(
    value: T
  ): Promise<TDoc & { forks: string[] }>

  getByDocId(docId: string): Promise<TDoc & { forks: string[] }>

  getByVersionId(versionId: string): Promise<TDoc>

  getMany(): Promise<Array<TDoc & { forks: string[] }>>

  update<T extends import('type-fest').Exact<TValue, T>>(
    versionId: string | string[],
    value: T
  ): Promise<TDoc & { forks: string[] }>

  delete(versionId: string | string[]): Promise<TDoc & { forks: string[] }>
}
