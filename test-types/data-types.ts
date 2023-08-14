import { MapeoProject } from '../dist/index.js'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { Observation, ObservationValue } from '@mapeo/schema'
import { Expect, type Equal } from './utils.js'

type ObservationWithForks = Observation & { forks: string[] }

const obsValue: ObservationValue = {
  schemaName: 'observation',
  refs: [],
  tags: {},
  attachments: [],
  metadata: {},
}

const mapeoProject = new MapeoProject({
  keyManager: new KeyManager(randomBytes(32)),
  projectKey: randomBytes(32),
})

const createdObservation = await mapeoProject.observation.create(obsValue)
Expect<Equal<ObservationWithForks, typeof createdObservation>>

const updatedObservation = await mapeoProject.observation.update(
  'abc',
  obsValue
)
Expect<Equal<ObservationWithForks, typeof updatedObservation>>

const manyObservations = await mapeoProject.observation.getMany()
Expect<Equal<ObservationWithForks[], typeof manyObservations>>

const observationByVersionId = await mapeoProject.observation.getByVersionId(
  'abc'
)
Expect<Equal<Observation, typeof observationByVersionId>>
