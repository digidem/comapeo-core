import { MapeoProject } from '../dist/mapeo-project.js'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import {
  Field,
  FieldValue,
  Observation,
  ObservationValue,
  Preset,
  PresetValue,
  Track,
  TrackValue,
} from '@comapeo/schema'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import RAM from 'random-access-memory'
import { IndexWriter } from '../dist/index-writer/index.js'
import { DerivedDocFields } from '../dist/datatype/index.js'
import { projectSettingsTable } from '../dist/schema/client.js'
import { LocalPeers } from '../dist/local-peers.js'
import { Expect, type Equal } from './utils.js'

type ObservationWithDerivedDocFields = Observation & DerivedDocFields
type PresetWithDerivedDocFields = Preset & DerivedDocFields
type FieldWithDerivedDocFields = Field & DerivedDocFields
type TrackWithDerivedDocFields = Track & DerivedDocFields

const sqlite = new Database(':memory:')

const mapeoProject = new MapeoProject({
  dbPath: ':memory:',
  projectMigrationsFolder: new URL('../drizzle/project', import.meta.url)
    .pathname,
  coreStorage: () => new RAM(),
  keyManager: new KeyManager(randomBytes(32)),
  projectKey: randomBytes(32),
  encryptionKeys: { auth: randomBytes(32) },
  sharedDb: drizzle(sqlite),
  sharedIndexWriter: new IndexWriter({
    tables: [projectSettingsTable],
    sqlite,
  }),
  isArchiveDevice: true,
  getMediaBaseUrl: async (mediaType: 'blobs' | 'icons') =>
    `http://127.0.0.1:8080/${mediaType}`,
  localPeers: new LocalPeers(),
})

///// Observations

const createdObservation = await mapeoProject.observation.create(
  {} as ObservationValue
)
Expect<Equal<ObservationWithDerivedDocFields, typeof createdObservation>>

const updatedObservation = await mapeoProject.observation.update(
  'abc',
  {} as ObservationValue
)
Expect<Equal<ObservationWithDerivedDocFields, typeof updatedObservation>>

const manyObservations = await mapeoProject.observation.getMany()
Expect<Equal<ObservationWithDerivedDocFields[], typeof manyObservations>>

const manyObservationsWithDeleted = await mapeoProject.observation.getMany({
  includeDeleted: true,
})
Expect<
  Equal<ObservationWithDerivedDocFields[], typeof manyObservationsWithDeleted>
>

const observationByDocId = await mapeoProject.observation.getByDocId('abc')
Expect<Equal<Observation & DerivedDocFields, typeof observationByDocId>>

const observationByVersionId = await mapeoProject.observation.getByVersionId(
  'abc'
)
Expect<Equal<Observation & DerivedDocFields, typeof observationByVersionId>>

mapeoProject.observation.on('updated-docs', (docs) => {
  Expect<Equal<Observation[], typeof docs>>
})

const deletedObservation = await mapeoProject.observation.delete('abc')
Expect<Equal<Observation & DerivedDocFields, typeof deletedObservation>>

///// Tracks

const createdTrack = await mapeoProject.track.create({} as TrackValue)
Expect<Equal<TrackWithDerivedDocFields, typeof createdTrack>>

const updatedTrack = await mapeoProject.track.update('abc', {} as TrackValue)
Expect<Equal<TrackWithDerivedDocFields, typeof updatedTrack>>

const manyTracks = await mapeoProject.track.getMany()
Expect<Equal<TrackWithDerivedDocFields[], typeof manyTracks>>

const manyTracksWithDeleted = await mapeoProject.track.getMany({
  includeDeleted: true,
})
Expect<Equal<TrackWithDerivedDocFields[], typeof manyTracksWithDeleted>>

const trackByDocId = await mapeoProject.track.getByDocId('abc')
Expect<Equal<Track & DerivedDocFields, typeof trackByDocId>>

const trackByVersionId = await mapeoProject.track.getByVersionId('abc')
Expect<Equal<Track & DerivedDocFields, typeof trackByVersionId>>

mapeoProject.track.on('updated-docs', (docs) => {
  Expect<Equal<Track[], typeof docs>>
})

const deletedTrack = await mapeoProject.track.delete('abc')
Expect<Equal<Track & DerivedDocFields, typeof deletedTrack>>

///// Presets

const createdPreset = await mapeoProject.preset.create({} as PresetValue)
Expect<Equal<PresetWithDerivedDocFields, typeof createdPreset>>

const updatedPreset = await mapeoProject.preset.update('abc', {} as PresetValue)
Expect<Equal<PresetWithDerivedDocFields, typeof updatedPreset>>

const manyPresets = await mapeoProject.preset.getMany()
Expect<Equal<PresetWithDerivedDocFields[], typeof manyPresets>>

const manyPresetsWithDeleted = await mapeoProject.preset.getMany({
  includeDeleted: true,
})
Expect<Equal<PresetWithDerivedDocFields[], typeof manyPresetsWithDeleted>>

const presetByDocId = await mapeoProject.preset.getByDocId('abc')
Expect<Equal<Preset & DerivedDocFields, typeof presetByDocId>>

const presetByVersionId = await mapeoProject.preset.getByVersionId('abc')
Expect<Equal<Preset & DerivedDocFields, typeof presetByVersionId>>

mapeoProject.preset.on('updated-docs', (docs) => {
  Expect<Equal<Preset[], typeof docs>>
})

///// Fields

const createdField = await mapeoProject.field.create({} as FieldValue)
Expect<Equal<FieldWithDerivedDocFields, typeof createdField>>

const updatedField = await mapeoProject.field.update('abc', {} as FieldValue)
Expect<Equal<FieldWithDerivedDocFields, typeof updatedField>>

const manyFields = await mapeoProject.field.getMany()
Expect<Equal<FieldWithDerivedDocFields[], typeof manyFields>>

const manyFieldsWithDeleted = await mapeoProject.field.getMany({
  includeDeleted: true,
})
Expect<Equal<FieldWithDerivedDocFields[], typeof manyFieldsWithDeleted>>

const fieldByDocId = await mapeoProject.field.getByDocId('abc')
Expect<Equal<Field & DerivedDocFields, typeof fieldByDocId>>

const fieldByVersionId = await mapeoProject.field.getByVersionId('abc')
Expect<Equal<Field & DerivedDocFields, typeof fieldByVersionId>>

mapeoProject.field.on('updated-docs', (docs) => {
  Expect<Equal<Field[], typeof docs>>
})
