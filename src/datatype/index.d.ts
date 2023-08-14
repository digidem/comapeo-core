// Typescript was incorrectly compiling declaration files for this, so the
// declaration for DataType is written manually below, and copied into the
// `dist` folder at build-time. The types are checked in `test-types/data-types.ts`

import { type MapeoDoc, type MapeoValue } from '@mapeo/schema'
import { type MapeoDocMap, type MapeoValueMap } from '../types.js'

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

type OmitUnion<T, K extends keyof any> = T extends any ? Omit<T, K> : never

export class DataType<
  TDataStore extends import('../datastore/index.js').DataStore,
  TSchemaName extends TDataStore['schemas'][number],
  TTable extends MapeoDocTablesMap[TSchemaName],
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
