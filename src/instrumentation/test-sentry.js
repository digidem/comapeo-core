import * as Sentry from '@sentry/node'
import { ComapeoCoreInstrumentation } from './ComapeoCoreInstrumentation.js'

Sentry.init({
  dsn: 'https://fb7efc7b3426ff0de896fcf90c86cf47@o4507148235702272.ingest.us.sentry.io/4509510714785792',
  debug: true,
  tracesSampleRate: 1.0, // Adjust this value to control the sampling rate
  openTelemetryInstrumentations: [new ComapeoCoreInstrumentation()],
})

import { KeyManager } from '@mapeo/crypto'
import { MapeoManager } from '../mapeo-manager.js'
import RAM from 'random-access-memory'
import Fastify from 'fastify'

process.on('beforeExit', async () => {
  try {
    await Sentry.flush(2000)
    console.log('Tracing shut down successfully')
  } catch (err) {
    console.error('Error shutting down tracing', err)
  } finally {
    process.exit(0)
  }
})

const projectMigrationsFolder = new URL(
  '../../drizzle/project',
  import.meta.url
).pathname
const clientMigrationsFolder = new URL('../../drizzle/client', import.meta.url)
  .pathname

const manager = new MapeoManager({
  rootKey: KeyManager.generateRootKey(),
  projectMigrationsFolder,
  clientMigrationsFolder,
  dbFolder: ':memory:',
  coreStorage: () => new RAM(),
  fastify: Fastify(),
})

await manager.createProject({
  name: 'project',
  projectDescription: 'test project',
})
