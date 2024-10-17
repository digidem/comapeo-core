import { KeyManager } from '@mapeo/crypto'
import createServer from '../../src/server/app.js'
import { getManagerOptions } from '../utils.js'
import { randomBytes } from 'node:crypto'
/** @import { TestContext } from 'node:test' */
/** @import { ServerOptions } from '../../src/server/app.js' */

export const BEARER_TOKEN = Buffer.from('swordfish').toString('base64')

const TEST_SERVER_DEFAULTS = {
  serverName: 'test server',
  serverBearerToken: BEARER_TOKEN,
}

/**
 * @param {TestContext} t
 * @param {Partial<ServerOptions>} [serverOptions]
 * @returns {ReturnType<typeof createServer> & { deviceId: string }}
 */
export function createTestServer(t, serverOptions) {
  const serverName =
    serverOptions?.serverName || TEST_SERVER_DEFAULTS.serverName
  const managerOptions = getManagerOptions(serverName)
  const km = new KeyManager(managerOptions.rootKey)
  const server = createServer({
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

const randomHexKey = (length = 32) =>
  Buffer.from(randomBytes(length)).toString('hex')

export const randomProjectKeys = () => ({
  projectKey: randomHexKey(),
  encryptionKeys: {
    auth: randomHexKey(),
    config: randomHexKey(),
    data: randomHexKey(),
    blobIndex: randomHexKey(),
    blob: randomHexKey(),
  },
})
