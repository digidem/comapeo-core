// @ts-check
import sodium from 'sodium-universal'
import RAM from 'random-access-memory'
import Fastify from 'fastify'
import { arrayFrom } from 'iterpal'

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
      return manager.stopLocalPeerDiscoveryServer({ force: true })
    })
  )
}

/**
 * @param {readonly MapeoManager[]} managers
 */
export function connectPeers(managers, { discovery = true } = {}) {
  if (discovery) {
    for (const manager of managers) {
      manager.startLocalPeerDiscoveryServer().then(({ name, port }) => {
        for (const otherManager of managers) {
          if (otherManager === manager) continue
          otherManager.connectPeer({ address: '127.0.0.1', name, port })
        }
      })
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

  /** @type {Array<Promise<unknown>>} */
  const promises = []

  for (const invitee of invitees) {
    promises.push(
      invitorProject.$member.invite(invitee.deviceId, {
        roleId,
        roleName,
      })
    )
    promises.push(
      once(invitee.invite, 'invite-received').then(async ([invite]) => {
        await (reject
          ? invitee.invite.reject(invite)
          : invitee.invite.accept(invite))
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
        const seed = 'device' + i + (deviceType ? `-${deviceType}` : '')
        const manager = createManager({
          seed,
          t,
          deviceType,
        })
        await manager.setDeviceInfo({ name: seed, deviceType })
        return manager
      })
  )
}

/**
 * @param {Object} opts
 * @param {string} opts.seed
 * @param {import('brittle').TestInstance} opts.t
 * @param {string} [opts.dbFolder]
 * @param {string | (() => RAM)} [opts.coreStorage]
 * @param {import('../src/generated/rpc.js').DeviceInfo['deviceType']} [opts.deviceType]
 */
export function createManager({ seed, t, deviceType, dbFolder, coreStorage }) {
  const db = dbFolder || (FAST_TESTS ? ':memory:' : temporaryDirectory())
  const core =
    coreStorage || (FAST_TESTS ? () => new RAM() : temporaryDirectory())
  t.teardown(async () => {
    if (FAST_TESTS) return
    await Promise.all([
      fsPromises.rm(db, {
        recursive: true,
        force: true,
        maxRetries: 2,
      }),
      // @ts-ignore
      () => {
        if (typeof core === 'string') {
          fsPromises.rm(core, {
            recursive: true,
            force: true,
            maxRetries: 2,
          })
        }
      },
    ])
  })
  return new MapeoManager({
    rootKey: getRootKey(seed),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: db,
    coreStorage: core,
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
 */
async function waitForProjectSync(project, peerIds, type = 'initial') {
  const state = project.$sync[kSyncState].getState()
  if (hasPeerIds(state.auth.remoteStates, peerIds)) {
    return project.$sync.waitForSync(type)
  }
  return new Promise((res) => {
    project.$sync[kSyncState].on('state', function onState(state) {
      if (!hasPeerIds(state.auth.remoteStates, peerIds)) return
      project.$sync[kSyncState].off('state', onState)
      res(project.$sync.waitForSync(type))
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
      return waitForProjectSync(project, peerIds, type)
    })
  )
}

/**
 * @param {import('../src/mapeo-project.js').MapeoProject[]} projects
 * @param {object} [opts]
 * @param {readonly import('@mapeo/schema').MapeoDoc['schemaName'][]} [opts.schemas]
 */
export function seedDatabases(projects, { schemas = SCHEMAS_TO_SEED } = {}) {
  return Promise.all(projects.map((p) => seedProjectDatabase(p, { schemas })))
}

const SCHEMAS_TO_SEED = /** @type {const} */ ([
  'observation',
  'preset',
  'field',
])

/**
 * @param {import('../src/mapeo-project.js').MapeoProject} project
 * @param {object} [opts]
 * @param {readonly import('@mapeo/schema').MapeoDoc['schemaName'][]} [opts.schemas]
 * @returns {Promise<Array<import('@mapeo/schema').MapeoDoc & { forks: string[] }>>}
 */
async function seedProjectDatabase(
  project,
  { schemas = SCHEMAS_TO_SEED } = {}
) {
  const promises = []
  for (const schemaName of schemas) {
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
  return {
    presets: arrayFrom(config.presets()),
    fields: arrayFrom(config.fields()),
    icons: await arrayFrom(config.icons()),
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

export function randomDate() {
  return new Date(randomNum({ min: 0, max: Date.now() }))
}

export function randomBool() {
  return Math.random() >= 0.5
}

/**
 * @param {{ min?: number, max?: number, precision?: number }} [options]
 */
export function randomNum({ min = 0, max = 1, precision } = {}) {
  const num = Math.random() * (max - min) + min
  if (typeof precision === 'undefined') return num
  return round(num, precision)
}
