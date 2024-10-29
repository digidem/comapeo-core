import { KeyManager } from '@mapeo/crypto'
import createFastify from 'fastify'
import { randomBytes } from 'node:crypto'
import { getManagerOptions } from '../../../test-e2e/utils.js'
import comapeoServer from '../app.js'
/** @import { TestContext } from 'node:test' */
/** @import { ServerOptions } from '../app.js' */

export const BEARER_TOKEN = Buffer.from('swordfish').toString('base64')

const TEST_SERVER_DEFAULTS = {
  serverName: 'test server',
  serverBearerToken: BEARER_TOKEN,
}

/**
 * @param {TestContext} t
 * @param {Partial<ServerOptions>} [serverOptions]
 * @returns {import('fastify').FastifyInstance & { deviceId: string }}
 */
export function createTestServer(t, serverOptions) {
  const serverName =
    serverOptions?.serverName || TEST_SERVER_DEFAULTS.serverName
  const managerOptions = getManagerOptions(serverName)
  const km = new KeyManager(managerOptions.rootKey)
  const server = createFastify()
  server.register(comapeoServer, {
    ...managerOptions,
    ...TEST_SERVER_DEFAULTS,
    ...serverOptions,
  })
  t.after(() => server.close())
  Object.defineProperty(server, 'deviceId', {
    get() {
      return km.getIdentityKeypair().publicKey.toString('hex')
    },
  })
  // @ts-expect-error
  return server
}

export const randomHex = (length = 32) =>
  Buffer.from(randomBytes(length)).toString('hex')

export const randomAddProjectBody = () => ({
  projectName: randomHex(16),
  projectKey: randomHex(),
  encryptionKeys: {
    auth: randomHex(),
    config: randomHex(),
    data: randomHex(),
    blobIndex: randomHex(),
    blob: randomHex(),
  },
})
