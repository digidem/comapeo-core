import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { deNullify } from '../src/utils.js'
import type { MapeoDoc, MapeoValue } from '@mapeo/schema'
import * as projectTableSchemas from '../src/schema/project.js'

const sqlite = new Database(':memory:')
const db = drizzle(sqlite)

const { observationTable, presetTable, fieldTable } = projectTableSchemas

const oResult = db.select().from(observationTable).get()!
const pResult = db.select().from(presetTable).get()!
const fResult = db.select().from(fieldTable).get()!

type MapeoType<T> = Extract<MapeoValue, { schemaName: T }>
const _o: MapeoType<'observation'> = deNullify(oResult)
const _p: MapeoType<'preset'> = deNullify(pResult)
const _f: MapeoType<'field'> = deNullify(fResult)
