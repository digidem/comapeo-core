import { MapeoProject } from '../dist/index.js'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import {
  Field,
  FieldValue,
  Observation,
  ObservationValue,
  Preset,
  PresetValue,
} from '@mapeo/schema'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import RAM from 'random-access-memory'
import { IndexWriter } from '../dist/index-writer/index.js'
import { projectTable } from '../dist/schema/client.js'
import { MapeoRPC } from '../dist/rpc/index.js'
import { Expect, type Equal } from './utils.js'

type Forks = { forks: string[] }
type ObservationWithForks = Observation & Forks
type PresetWithForks = Preset & Forks
type FieldWithForks = Field & Forks

const projectKey = randomBytes(32)
const keyManager = new KeyManager(randomBytes(32))
const sqlite = new Database(':memory:')

const mapeoProject = new MapeoProject({
  dbPath: ':memory:',
  coreStorage: () => new RAM(),
  keyManager: new KeyManager(randomBytes(32)),
  projectKey: randomBytes(32),
  sharedDb: drizzle(sqlite),
  sharedIndexWriter: new IndexWriter({
    tables: [projectTable],
    sqlite,
  }),
  rpc: new MapeoRPC(),
})

///// Observations

const createdObservation = await mapeoProject.observation.create(
  {} as ObservationValue
)
Expect<Equal<ObservationWithForks, typeof createdObservation>>

const updatedObservation = await mapeoProject.observation.update(
  'abc',
  {} as ObservationValue
)
Expect<Equal<ObservationWithForks, typeof updatedObservation>>

const manyObservations = await mapeoProject.observation.getMany()
Expect<Equal<ObservationWithForks[], typeof manyObservations>>

const observationByVersionId = await mapeoProject.observation.getByVersionId(
  'abc'
)
Expect<Equal<Observation, typeof observationByVersionId>>

///// Presets

const createdPreset = await mapeoProject.preset.create({} as PresetValue)
Expect<Equal<PresetWithForks, typeof createdPreset>>

const updatedPreset = await mapeoProject.preset.update('abc', {} as PresetValue)
Expect<Equal<PresetWithForks, typeof updatedPreset>>

const manyPresets = await mapeoProject.preset.getMany()
Expect<Equal<PresetWithForks[], typeof manyPresets>>

const presetByVersionId = await mapeoProject.preset.getByVersionId('abc')
Expect<Equal<Preset, typeof presetByVersionId>>

///// Fields

const createdField = await mapeoProject.field.create({} as FieldValue)
Expect<Equal<FieldWithForks, typeof createdField>>

const updatedField = await mapeoProject.field.update('abc', {} as FieldValue)
Expect<Equal<FieldWithForks, typeof updatedField>>

const manyFields = await mapeoProject.field.getMany()
Expect<Equal<FieldWithForks[], typeof manyFields>>

const fieldByVersionId = await mapeoProject.field.getByVersionId('abc')
Expect<Equal<Field, typeof fieldByVersionId>>
