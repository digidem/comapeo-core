import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ComapeoCoreInstrumentation } from './ComapeoCoreInstrumentation.js'

// Initialize the NodeSDK
const sdk = new NodeSDK({
  serviceName: 'comapeo-core-service-test',
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [new ComapeoCoreInstrumentation()],
  resourceDetectors: [],
})

// Start the SDK
sdk.start()

import { KeyManager } from '@mapeo/crypto'
import { MapeoManager } from '../mapeo-manager.js'
import RAM from 'random-access-memory'
import Fastify from 'fastify'

// Ensures batched spans are flushed before exit
process.on('beforeExit', async () => {
  try {
    await sdk.shutdown()
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
