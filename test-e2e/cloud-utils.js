import createFastify from 'fastify'
import { randomBytes } from 'node:crypto'
import fsPromises from 'node:fs/promises'
import { pEvent } from 'p-event'
import comapeoServer from '@comapeo/cloud'
import { temporaryDirectory } from 'tempy'

/** @import { FastifyInstance } from 'fastify' */
/** @import { MapeoProject } from '../src/mapeo-project.js' */
/** @import { MemberInfo } from '../src/member-api.js' */
/** @import { State as SyncState } from '../src/sync/sync-api.js' */

const comapeoCoreUrl = new URL('..', import.meta.url)

/**
 * @typedef {object} LocalTestServer
 * @prop {'local'} type
 * @prop {string} serverBaseUrl
 * @prop {FastifyInstance} server
 */

/**
 * Start a local `@comapeo/cloud` server. Note that the published
 * `@comapeo/cloud` package bundles its own version of `@comapeo/core`, which
 * may be older than the version in this working tree, so tests using this
 * server are also cross-version tests of the websocket sync transport.
 *
 * @param {import('node:test').TestContext} t
 * @returns {Promise<LocalTestServer>}
 */
export async function createLocalCloudServer(t) {
  const projectMigrationsFolder = new URL('./drizzle/project', comapeoCoreUrl)
    .pathname
  const clientMigrationsFolder = new URL('./drizzle/client', comapeoCoreUrl)
    .pathname

  const dbFolder = temporaryDirectory()
  const coreStorage = temporaryDirectory()
  const directories = [dbFolder, coreStorage]
  async function closeDirs() {
    await Promise.all(
      directories.map((dir) =>
        fsPromises.rm(dir, {
          recursive: true,
        })
      )
    )
  }
  t.after(closeDirs)

  const server = createFastify()
  server.register(comapeoServer, {
    rootKey: randomBytes(16),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder,
    coreStorage,
    serverName: 'test server',
    serverBearerToken: 'ignored',
  })
  const serverBaseUrl = await server.listen()
  t.after(() => server.close())
  return { type: 'local', server, serverBaseUrl }
}

/**
 * @param {MapeoProject} project
 * @returns {Promise<undefined | MemberInfo>}
 */
export async function findServerPeer(project) {
  return (await project.$member.getMany({ includeLeft: true })).find(
    (member) => member.deviceType === 'selfHostedServer'
  )
}

/**
 * @param {MapeoProject} project
 * @param {string} serverDeviceId
 * @returns {Promise<void>}
 */
export async function waitForSyncWithServer(project, serverDeviceId) {
  const initialState = project.$sync.getState()
  if (isSyncedWithServer(initialState, serverDeviceId)) return
  await pEvent(project.$sync, 'sync-state', (state) =>
    isSyncedWithServer(state, serverDeviceId)
  )
}

/**
 * @param {SyncState} syncState
 * @param {string} serverDeviceId
 * @returns {boolean}
 */
function isSyncedWithServer(syncState, serverDeviceId) {
  const serverSyncState = syncState.remoteDeviceSyncState[serverDeviceId]
  return Boolean(
    serverSyncState &&
      serverSyncState.initial.want === 0 &&
      serverSyncState.initial.wanted === 0 &&
      serverSyncState.data.want === 0 &&
      serverSyncState.data.wanted === 0
  )
}
