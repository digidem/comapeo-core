import createServer from './app.js'
import envSchema from 'env-schema'
import { Type } from '@sinclair/typebox'
import path from 'node:path'
import fsPromises from 'node:fs/promises'
import crypto from 'node:crypto'

const DEFAULT_STORAGE = path.join(process.cwd(), 'data')
const CORE_DIR_NAME = 'core'
const DB_DIR_NAME = 'db'
const ROOT_KEY_FILE_NAME = 'root-key'

const schema = Type.Object({
  PORT: Type.Number({ default: 3000 }),
  SERVER_NAME: Type.String({
    description: 'name of the server',
    default: 'CoMapeo Server',
  }),
  SERVER_BEARER_TOKEN: Type.String({
    description:
      'Bearer token for accessing the server, can be any random string',
  }),
  SERVER_PUBLIC_BASE_URL: Type.String({
    description: 'public base URL of the server',
  }),
  STORAGE_DIR: Type.String({
    description: 'path to directory where data is stored',
    default: DEFAULT_STORAGE,
  }),
  ROOT_KEY: Type.Optional(
    Type.String({
      description:
        'hex-encoded 16-byte random secret key, used for server keypairs',
    })
  ),
})

/** @typedef {import('@sinclair/typebox').Static<typeof schema>} Env */
/** @type {ReturnType<typeof envSchema<Env>>} */
const config = envSchema({ schema, dotenv: true })

const coreStorage = path.join(config.STORAGE_DIR, CORE_DIR_NAME)
const dbFolder = path.join(config.STORAGE_DIR, DB_DIR_NAME)
const rootKeyFile = path.join(config.STORAGE_DIR, ROOT_KEY_FILE_NAME)
const projectMigrationsFolder = new URL(
  '../../drizzle/project',
  import.meta.url
).pathname
const clientMigrationsFolder = new URL('../../drizzle/client', import.meta.url)
  .pathname

await Promise.all([
  fsPromises.mkdir(coreStorage, { recursive: true }),
  fsPromises.mkdir(dbFolder, { recursive: true }),
])

/** @type {Buffer} */
let rootKey
if (config.ROOT_KEY) {
  rootKey = Buffer.from(config.ROOT_KEY, 'hex')
} else {
  try {
    rootKey = await fsPromises.readFile(rootKeyFile)
  } catch (err) {
    if (
      typeof err === 'object' &&
      err &&
      'code' in err &&
      err.code !== 'ENOENT'
    ) {
      throw err
    }
    rootKey = crypto.randomBytes(16)
    await fsPromises.writeFile(rootKeyFile, rootKey)
  }
}

if (!rootKey || rootKey.length !== 16) {
  throw new Error('Root key must be 16 bytes')
}

const fastify = createServer({
  serverName: config.SERVER_NAME,
  serverBearerToken: config.SERVER_BEARER_TOKEN,
  rootKey,
  coreStorage,
  dbFolder,
  projectMigrationsFolder,
  clientMigrationsFolder,
  logger: true,
})

try {
  await fastify.listen({ port: config.PORT, host: '::' })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

/** @param {NodeJS.Signals} signal*/
async function closeGracefully(signal) {
  console.log(`Received signal to terminate: ${signal}`)
  await fastify.close()
  console.log('Gracefully closed fastify')
  process.kill(process.pid, signal)
}
process.once('SIGINT', closeGracefully)
process.once('SIGTERM', closeGracefully)
