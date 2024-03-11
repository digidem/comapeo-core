// @ts-check
import sodium from 'sodium-universal'
import RAM from 'random-access-memory'
import Fastify from 'fastify'

import { MapeoManager } from '../src/index.js'
import { kManagerReplicate, kRPC } from '../src/mapeo-manager.js'
import { once } from 'node:events'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import { randomInt } from 'node:crypto'
import { temporaryDirectory } from 'tempy'
import fsPromises from 'node:fs/promises'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import { kSyncState } from '../src/sync/sync-api.js'
import { readConfig } from '../src/config-import.js'

const FAST_TESTS = !!process.env.FAST_TESTS
const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

/**
 * @param {readonly MapeoManager[]} managers
 */
export async function disconnectPeers(managers) {
  await Promise.all(
    managers.map(async (manager) => {
      return manager.stopLocalPeerDiscovery({ force: true })
    })
  )
}

/**
 * @param {readonly MapeoManager[]} managers
 */
export function connectPeers(managers, { discovery = true } = {}) {
  if (discovery) {
    for (const manager of managers) {
      manager.startLocalPeerDiscovery()
    }
    return function destroy() {
      return disconnectPeers(managers)
    }
  } else {
    /** @type {import('../src/types.js').ReplicationStream[]} */
    const replicationStreams = []
    for (let i = 0; i < managers.length; i++) {
      for (let j = i + 1; j < managers.length; j++) {
        const r1 = managers[i][kManagerReplicate](true)
        const r2 = managers[j][kManagerReplicate](false)
        replicationStreams.push(r1, r2)
        r1.pipe(r2).pipe(r1)
      }
    }
    return function destroy() {
      const promises = []
      for (const stream of replicationStreams) {
        promises.push(
          /** @type {Promise<void>} */
          (
            new Promise((res) => {
              stream.on('close', res)
              stream.destroy()
            })
          )
        )
      }
      return Promise.all(promises)
    }
  }
}

/**
 * Invite mapeo clients to a project
 *
 * @param {{
 *   invitor: MapeoManager,
 *   projectId: string,
 *   invitees: MapeoManager[],
 *   roleId?: import('../src/roles.js').RoleIdAssignableToOthers,
 *   roleName?: string
 *   reject?: boolean
 * }} opts
 */
export async function invite({
  invitor,
  projectId,
  invitees,
  roleId = MEMBER_ROLE_ID,
  roleName,
  reject = false,
}) {
  const invitorProject = await invitor.getProject(projectId)
  const promises = []

  for (const invitee of invitees) {
    promises.push(
      invitorProject.$member.invite(invitee.deviceId, {
        roleId,
        roleName,
      })
    )
    promises.push(
      once(invitee.invite, 'invite-received').then(([invite]) => {
        return reject
          ? invitee.invite.reject(invite.projectId)
          : invitee.invite.accept(invite.projectId)
      })
    )
  }

  await Promise.allSettled(promises)
}

/**
 * Waits for all manager instances to be connected to each other
 *
 * @param {readonly MapeoManager[]} managers
 * @param {{ waitForDeviceInfo?: boolean }} [opts] Optionally wait for device names to be set
 * @returns {Promise<void>}
 */
export const waitForPeers = (managers, { waitForDeviceInfo = false } = {}) =>
  new Promise((res) => {
    const expectedCount = managers.length - 1
    const isDone = () =>
      managers.every((manager) => {
        const { peers } = manager[kRPC]
        const connectedPeers = peers.filter(
          ({ status }) => status === 'connected'
        )
        return (
          connectedPeers.length === expectedCount &&
          (!waitForDeviceInfo || connectedPeers.every(({ name }) => !!name))
        )
      })

    if (isDone()) {
      res()
      return
    }

    const onLocalPeers = () => {
      if (isDone()) {
        for (const manager of managers) manager.off('local-peers', onLocalPeers)
        res()
      }
    }

    for (const manager of managers) manager.on('local-peers', onLocalPeers)
  })

/**
 * Create `count` manager instances. Each instance has a deterministic identity
 * keypair so device IDs should be consistent between tests.
 *
 * @template {number} T
 * @param {T} count
 * @param {import('brittle').TestInstance} t
 * @param {import('../src/generated/rpc.js').DeviceInfo['deviceType']} [deviceType]
 * @returns {Promise<import('type-fest').ReadonlyTuple<MapeoManager, T>>}
 */
export async function createManagers(count, t, deviceType) {
  // @ts-ignore
  return Promise.all(
    Array(count)
      .fill(null)
      .map(async (_, i) => {
        const name = 'device' + i + (deviceType ? `-${deviceType}` : '')
        const manager = createManager(name, t, deviceType)
        await manager.setDeviceInfo({ name })
        return manager
      })
  )
}

/**
 * @param {string} seed
 * @param {import('brittle').TestInstance} t
 * @param {import('../src/generated/rpc.js').DeviceInfo['deviceType']} [deviceType]
 */
export function createManager(seed, t, deviceType) {
  const dbFolder = FAST_TESTS ? ':memory:' : temporaryDirectory()
  const coreStorage = FAST_TESTS ? () => new RAM() : temporaryDirectory()

  t.teardown(async () => {
    if (FAST_TESTS) return
    await Promise.all([
      fsPromises.rm(dbFolder, { recursive: true, force: true, maxRetries: 2 }),
      // @ts-ignore
      fsPromises.rm(coreStorage, {
        recursive: true,
        force: true,
        maxRetries: 2,
      }),
    ])
  })
  return new MapeoManager({
    rootKey: getRootKey(seed),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder,
    coreStorage,
    fastify: Fastify(),
    deviceType,
  })
}

/** @param {string} [seed] */
function getRootKey(seed) {
  const key = Buffer.allocUnsafe(16)
  if (!seed) {
    sodium.randombytes_buf(key)
  } else {
    const seedBuf = Buffer.alloc(32)
    sodium.crypto_generichash(seedBuf, Buffer.from(seed))
    sodium.randombytes_buf_deterministic(key, seedBuf)
  }
  return key
}
/**
 * Remove undefined properties from an object, to allow deep comparison
 * @param {object} obj
 */
export function stripUndef(obj) {
  return JSON.parse(JSON.stringify(obj))
}
/**
 *
 * @param {number} value
 * @param {number} decimalPlaces
 */
export function round(value, decimalPlaces) {
  return Math.round(value * 10 ** decimalPlaces) / 10 ** decimalPlaces
}

/**
 * Unlike `mapeo.project.$sync.waitForSync` this also waits for the specified
 * number of peers to connect.
 *
 * @param {import('../src/mapeo-project.js').MapeoProject} project
 * @param {string[]} peerIds
 * @param {'initial' | 'full'} [type]
 * @returns {Promise<void>}
 */
async function waitForProjectSync(project, peerIds, type = 'initial') {
  const state = project.$sync[kSyncState].getState()
  if (hasPeerIds(state.auth.remoteStates, peerIds)) {
    console.log(
      `@@@@ waitForProjectSync (${project.deviceId}) started with full peer IDs`
    )
    return project.$sync.waitForSync(type, project.deviceId)
  }
  return new Promise((res) => {
    project.$sync[kSyncState].on('state', function onState(state) {
      console.log(
        `@@@@ waitForProjectSync (${project.deviceId}) got state event`
      )
      if (!hasPeerIds(state.auth.remoteStates, peerIds)) return
      console.log(
        `@@@@ waitForProjectSync (${project.deviceId}) got state event and we are now waiting`
      )
      project.$sync[kSyncState].off('state', onState)
      res(project.$sync.waitForSync(type, project.deviceId))
    })
  })
}

/**
 * @param {Record<string, unknown>} remoteStates
 * @param {string[]} peerIds
 * @returns
 */
function hasPeerIds(remoteStates, peerIds) {
  for (const peerId of peerIds) {
    if (!(peerId in remoteStates)) return false
  }
  return true
}

/**
 * Wait for all projects to connect and sync
 *
 * @param {import('../src/mapeo-project.js').MapeoProject[]} projects
 * @param {'initial' | 'full'} [type]
 */
export function waitForSync(projects, type = 'initial') {
  return Promise.all(
    projects.map((project) => {
      const peerIds = projects
        .filter((p) => p !== project)
        .map((p) => p.deviceId)
      console.log(
        `@@@@ waitForSync (${project.deviceId}): ${JSON.stringify({ peerIds })}`
      )
      return waitForProjectSync(project, peerIds, type)
    })
  )
}

/**
 * @param {import('../src/mapeo-project.js').MapeoProject[]} projects
 */
export function seedDatabases(projects) {
  return Promise.all(projects.map((p) => seedProjectDatabase(p)))
}

const SCHEMAS_TO_SEED = /** @type {const} */ ([
  'observation',
  'preset',
  'field',
])

/**
 * @param {import('../src/mapeo-project.js').MapeoProject} project
 * @returns {Promise<Array<import('@mapeo/schema').MapeoDoc & { forks: string[] }>>}
 */
async function seedProjectDatabase(project) {
  const promises = []
  for (const schemaName of SCHEMAS_TO_SEED) {
    const count =
      schemaName === 'observation' ? randomInt(20, 100) : randomInt(0, 10)
    let i = 0
    while (i++ < count) {
      const value = valueOf(generate(schemaName)[0])
      promises.push(
        // @ts-ignore
        project[schemaName].create(value)
      )
    }
  }
  return Promise.all(promises)
}

/**
 * @template {object} T
 * @param {T[]} arr
 * @param {keyof T} key
 */
export function sortBy(arr, key) {
  return arr.sort(function (a, b) {
    if (a[key] < b[key]) return -1
    if (a[key] > b[key]) return 1
    return 0
  })
}

/** @param {String} path */
export async function getExpectedConfig(path) {
  const config = await readConfig(path)
  let presets = []
  let fields = []
  let icons = []
  for (let preset of config.presets()) {
    presets.push(preset)
  }
  for (let field of config.fields()) {
    fields.push(field)
  }
  for await (let icon of config.icons()) {
    icons.push(icon)
  }

  return {
    presets,
    fields,
    icons,
  }
}

/** @param {import('@mapeo/schema').MapeoDoc[]} docs */
export function sortById(docs) {
  return sortBy(docs, 'docId')
}
/**
 * Lazy way of removing fields with undefined values from an object
 * @param {unknown} object
 */
export function removeUndefinedFields(object) {
  return JSON.parse(JSON.stringify(object))
}
