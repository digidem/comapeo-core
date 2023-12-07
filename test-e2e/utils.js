// @ts-check
import sodium from 'sodium-universal'
import RAM from 'random-access-memory'

import { MapeoManager } from '../src/index.js'
import { kManagerReplicate, kRPC } from '../src/mapeo-manager.js'
import { MEMBER_ROLE_ID } from '../src/capabilities.js'
import { once } from 'node:events'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import { randomInt } from 'node:crypto'
import { temporaryDirectory } from 'tempy'
import fsPromises from 'node:fs/promises'

const FAST_TESTS = !!process.env.FAST_TESTS
const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

/**
 * @param {readonly MapeoManager[]} managers
 */
export async function disconnectPeers(managers) {
  return Promise.all(
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
 *   roleId?: import('../src/capabilities.js').RoleId,
 *   reject?: boolean
 * }} opts
 */
export async function invite({
  invitor,
  projectId,
  invitees,
  roleId = MEMBER_ROLE_ID,
  reject = false,
}) {
  const invitorProject = await invitor.getProject(projectId)
  const promises = []

  for (const invitee of invitees) {
    promises.push(
      invitorProject.$member.invite(invitee.deviceId, {
        roleId,
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
 */
export async function waitForPeers(managers) {
  const peerCounts = managers.map((manager) => {
    return manager[kRPC].peers.filter(({ status }) => status === 'connected')
      .length
  })
  const expectedCount = managers.length - 1
  return new Promise((res) => {
    if (peerCounts.every((v) => v === expectedCount)) {
      return res(null)
    }
    for (const [idx, manager] of managers.entries()) {
      manager.on('local-peers', function onPeers(peers) {
        const connectedPeerCount = peers.filter(
          ({ status }) => status === 'connected'
        ).length
        peerCounts[idx] = connectedPeerCount
        if (connectedPeerCount === expectedCount) {
          manager.off('local-peers', onPeers)
        }
        if (peerCounts.every((v) => v === expectedCount)) {
          res(null)
        }
      })
    }
  })
}

/**
 * Create `count` manager instances. Each instance has a deterministic identity
 * keypair so device IDs should be consistent between tests.
 *
 * @template {number} T
 * @param {T} count
 * @param {import('brittle').TestInstance} t
 * @returns {Promise<import('type-fest').ReadonlyTuple<MapeoManager, T>>}
 */
export async function createManagers(count, t) {
  // @ts-ignore
  return Promise.all(
    Array(count)
      .fill(null)
      .map(async (_, i) => {
        const name = 'device' + i
        const manager = createManager(name, t)
        await manager.setDeviceInfo({ name })
        return manager
      })
  )
}

/**
 * @param {string} seed
 * @param {import('brittle').TestInstance} t
 */
export function createManager(seed, t) {
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
 */
async function waitForProjectSync(project, peerIds, type = 'initial') {
  const state = await project.$sync.getState()
  if (hasPeerIds(state.auth.remoteStates, peerIds)) {
    return project.$sync.waitForSync(type)
  }
  return new Promise((res) => {
    project.$sync.on('sync-state', function onState(state) {
      if (!hasPeerIds(state.auth.remoteStates, peerIds)) return
      project.$sync.off('sync-state', onState)
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
    promises.push(addMockData(project, schemaName, count))
  }
  const docs = await Promise.all(promises)
  return docs.flat()
}

/**
 * @template {import('@mapeo/schema').MapeoDoc['schemaName'] & keyof import('../src/mapeo-project.js').MapeoProject} T
 * @param {import('../src/mapeo-project.js').MapeoProject} project
 * @param {T} schemaName
 * @param {number} count
 * @returns {Promise<Array<Extract<import('@mapeo/schema').MapeoDoc, { schemaName: T }> & { forks: string[] }>>}
 */
export function addMockData(project, schemaName, count) {
  const promises = []
  let i = 0
  while (i++ < count) {
    const value = valueOf(generate(schemaName)[0])
    promises.push(
      // @ts-expect-error - another dependent types challenge for TS
      project[schemaName].create(value)
    )
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
