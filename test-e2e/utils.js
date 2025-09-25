import randomBytesReadableStream from 'random-bytes-readable-stream'
import sodium from 'sodium-universal'
import RAM from 'random-access-memory'
import Fastify from 'fastify'
import { arrayFrom } from 'iterpal'
import assert from 'node:assert/strict'
import * as path from 'node:path'
import { fork } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import * as v8 from 'node:v8'
import { pEvent } from 'p-event'
import { createMapeoClient } from '@comapeo/ipc'
import { Worker, MessageChannel } from 'node:worker_threads'
import { MapeoManager as MapeoManager_2_0_1 } from '@comapeo/core2.0.1'
import { setTimeout as delay } from 'node:timers/promises'

import { MapeoManager, roles } from '../src/index.js'
import { generate } from '@mapeo/mock-data'
import { ExhaustivenessError, valueOf } from '../src/utils.js'
import { createHash, randomBytes, randomInt } from 'node:crypto'
import { temporaryFile, temporaryDirectory } from 'tempy'
import fsPromises from 'node:fs/promises'
import fs from 'node:fs'
import { kSyncState } from '../src/sync/sync-api.js'
import { readConfig } from '../src/config-import.js'
import pTimeout from 'p-timeout'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'

/** @import { MemberApi } from '../src/member-api.js' */

const FAST_TESTS = !!process.env.FAST_TESTS
const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

/**
 * @internal
 * @typedef {Pick<
 *   MapeoManager,
 *   'startLocalPeerDiscoveryServer' |
 *   'stopLocalPeerDiscoveryServer' |
 *   'connectLocalPeer'
 * >} ConnectableManager
 */

/**
 * @param {ReadonlyArray<ConnectableManager>} managers
 * @returns {() => Promise<void>}
 */
export function connectPeers(managers) {
  let requestedDisconnect = false

  for (const manager of managers) {
    manager.startLocalPeerDiscoveryServer().then(({ name, port }) => {
      if (requestedDisconnect) return
      for (const otherManager of managers) {
        if (otherManager === manager) continue
        otherManager.connectLocalPeer({ address: '127.0.0.1', name, port })
      }
    })
  }

  return async () => {
    requestedDisconnect = true
    await Promise.all(
      managers.map((manager) =>
        manager.stopLocalPeerDiscoveryServer({ force: true })
      )
    )
  }
}

/**
 * @internal
 * @typedef {WaitForPeersManager & {
 *   getProject(projectId: string): PromiseLike<{
 *     $member: Pick<MemberApi, 'invite'>
 *   }>
 * }} InvitorManager
 */

/**
 * @internal
 * @typedef {WaitForPeersManager & {
 *   deviceId: string
 *   invite: {
 *     on(
 *       event: 'invite-received',
 *       listener: (invite: { inviteId: string }
 *     ) => unknown): void
 *     accept(invite: unknown): PromiseLike<string>
 *     reject(invite: unknown): unknown
 *   }
 * }} InviteeManager
 */

/**
 * Invite mapeo clients to a project
 *
 * @param {object} options
 * @param {string} options.projectId
 * @param {InvitorManager} options.invitor
 * @param {ReadonlyArray<InviteeManager>} options.invitees
 * @param {import('../src/roles.js').RoleIdAssignableToOthers} [options.roleId]
 * @param {string} [options.roleName]
 * @param {boolean} [options.reject]
 */
export async function invite({
  invitor,
  projectId,
  invitees,
  roleId = roles.MEMBER_ROLE_ID,
  roleName,
  reject = false,
}) {
  const invitorProject = await invitor.getProject(projectId)

  await Promise.allSettled(
    invitees.map(async (invitee) => {
      const inviteId = randomBytes(32)

      await waitForPeers([invitor, invitee])

      await Promise.all([
        invitorProject.$member.invite(invitee.deviceId, {
          roleId,
          roleName,
          __testOnlyInviteId: inviteId,
        }),
        (async () => {
          const invite = await pEvent(
            invitee.invite,
            'invite-received',
            (invite) => Buffer.from(invite.inviteId, 'hex').equals(inviteId)
          )
          await (reject
            ? invitee.invite.reject(invite)
            : invitee.invite.accept(invite))
        })(),
      ])
    })
  )
}

/**
 * A simple Promise-aware version of `Array.prototype.every`.
 *
 * Similar to the [p-every package](https://www.npmjs.com/package/p-every),
 * which I couldn't figure out how to import without type errors.
 *
 * @template T
 * @param {Iterable<T>} iterable
 * @param {(value: T) => boolean | PromiseLike<boolean>} predicate
 * @returns {Promise<boolean>}
 */
async function pEvery(iterable, predicate) {
  const results = await Promise.all([...iterable].map(predicate))
  return results.every(Boolean)
}

/**
 * @internal
 * @typedef {Pick<MapeoManager, 'deviceId' | 'listLocalPeers'> & {
 *    on(event: 'local-peers', listener: () => unknown): void;
 *    off(event: 'local-peers', listener: () => unknown): void;
 * }} WaitForPeersManager
 */

/**
 * Waits for all manager instances to be connected to each other
 *
 * @param {ReadonlyArray<WaitForPeersManager>} managers
 * @param {{ waitForDeviceInfo?: boolean }} [opts] Optionally wait for device names to be set
 * @returns {Promise<void>}
 */
export async function waitForPeers(
  managers,
  { waitForDeviceInfo = false } = {}
) {
  const deviceIds = new Set(managers.map((m) => m.deviceId))

  /** @returns {Promise<boolean>} */
  const isDone = async () =>
    pEvery(managers, async (manager) => {
      const unconnectedDeviceIds = new Set(deviceIds)
      unconnectedDeviceIds.delete(manager.deviceId)
      for (const peer of await manager.listLocalPeers()) {
        if (peer.status === 'connected' && (!waitForDeviceInfo || peer.name)) {
          unconnectedDeviceIds.delete(peer.deviceId)
        }
      }
      return unconnectedDeviceIds.size === 0
    })

  if (await isDone()) return

  return new Promise((res) => {
    const onLocalPeers = async () => {
      if (await isDone()) {
        for (const manager of managers) manager.off('local-peers', onLocalPeers)
        res()
      }
    }
    for (const manager of managers) manager.on('local-peers', onLocalPeers)
  })
}

/**
 * Create `count` manager instances. Each instance has a deterministic identity
 * keypair so device IDs should be consistent between tests.
 *
 * @template {number} T
 * @param {T} count
 * @param {import('node:test').TestContext} t
 * @param {import('../src/generated/rpc.js').DeviceInfo['deviceType']} [deviceType]
 * @param {Partial<ConstructorParameters<typeof MapeoManager>[0]>} [overrides]
 * @returns {Promise<import('type-fest').ReadonlyTuple<MapeoManager, T>>}
 */
export async function createManagers(
  count,
  t,
  deviceType = 'device_type_unspecified',
  overrides = {}
) {
  // @ts-ignore
  return Promise.all(
    Array(count)
      .fill(null)
      .map(async (_, i) => {
        const name = 'device' + i + (deviceType ? `-${deviceType}` : '')
        const manager = createManager(name, t, overrides)
        await manager.setDeviceInfo({ name, deviceType })
        return manager
      })
  )
}

/**
 * @param {string} seed
 * @param {import('node:test').TestContext} t
 * @param {Partial<ConstructorParameters<typeof MapeoManager>[0]>} [overrides]
 * @returns {MapeoManager}
 */
export function createManager(seed, t, overrides = {}) {
  /** @type {string} */ let dbFolder
  /** @type {string | import('../src/types.js').CoreStorage} */ let coreStorage

  if (FAST_TESTS) {
    dbFolder = ':memory:'
    coreStorage = () => new RAM()
  } else {
    const directories = [temporaryDirectory(), temporaryDirectory()]
    ;[dbFolder, coreStorage] = directories
    t.after(() =>
      Promise.all(
        directories.map((dir) =>
          fsPromises.rm(dir, {
            recursive: true,
            force: true,
            maxRetries: 2,
          })
        )
      )
    )
  }

  const fastify = Fastify()
  fastify.listen()
  t.after(() => fastify.close())

  return new MapeoManager({
    rootKey: getRootKey(seed),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder,
    coreStorage,
    fastify,
    useIndexWorkers: true,
    ...overrides,
  })
}

/**
 * @param {string} seed
 * @param {Partial<ConstructorParameters<typeof MapeoManager_2_0_1>[0]>} [overrides]
 * @returns {Promise<MapeoManager_2_0_1>}
 */
export async function createOldManagerOnVersion2_0_1(seed, overrides = {}) {
  const comapeoCorePreMigrationUrl = await import.meta.resolve?.(
    '@comapeo/core2.0.1'
  )
  assert(comapeoCorePreMigrationUrl, 'Could not resolve @comapeo/core2.0.1')

  return new MapeoManager_2_0_1({
    rootKey: getRootKey(seed),
    clientMigrationsFolder: fileURLToPath(
      new URL('../drizzle/client', comapeoCorePreMigrationUrl)
    ),
    projectMigrationsFolder: fileURLToPath(
      new URL('../drizzle/project', comapeoCorePreMigrationUrl)
    ),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify: Fastify(),
    ...overrides,
  })
}

/**
 * @param {string} seed
 * @param {import('node:test').TestContext} t
 * @param {Partial<ConstructorParameters<typeof MapeoManager_2_0_1>[0]>} [overrides]
 * @returns {Promise<ReturnType<typeof createMapeoClient>>}
 */
export async function createIpcManager(seed, t, overrides = {}) {
  const { port1: parentPort, port2: childPort } = new MessageChannel()

  const workerProcessPath = fileURLToPath(
    new URL('./worker-process.js', import.meta.url)
  )
  const worker = new Worker(workerProcessPath, {
    workerData: {
      managerConstructorOverrides: { rootKey: getRootKey(seed), ...overrides },
      childPort,
    },
    transferList: [childPort],
  })

  t.after(() => worker.terminate())

  // As an optimization, we can prevent the worker from keeping the test
  // process alive. This isn't necessary for correctness (the call to
  // `worker.terminate()` should be enough), but it can speed up tests by
  // letting the process end early.
  worker.unref()

  return createMapeoClient(parentPort)
}

/**
 * `ManagerCustodian` helps you test the creation of multiple managers accessing
 * the same underlying files.
 *
 * For example, you might want to write a test like this:
 *
 * ```
 * const manager1 = createManager(persistedDataPath)
 * const projectId = await manager1.createProject('Foo')
 * manager1.close()
 *
 * const manager2 = createManager(persistedDataPath)
 * const project = await manager2.getProject(projectId)
 * assert(project, 'project can be loaded')
 * ```
 *
 * Unfortunately, this doesn't work because the only way to close a manager is
 * to close the process. `ManagerCustodian` makes it easier to create these
 * processes. You would rewrite the test like this:
 *
 * ```
 * const custodian = new ManagerCustodian(t)
 *
 * const projectId = custodian.withManagerInSeparateProcess((manager1) => (
 *   manager1.createProject('Foo')
 * ))
 *
 * const exists = custodian.withManagerInSeparateProcess(
 *   (manager2, projectId) =>
 *     Boolean(await manager2.getProject(projectId)),
 *   projectId
 * )
 * assert(exists, 'project exists')
 * ```
 *
 * If we ever offer a way to close a manager, we can remove this class.
 *
 * The name is deliberately a little obtuse because this class is a little
 * weird, and we want people to read the documentation.
 */
export class ManagerCustodian {
  #t
  #rootKey = getRootKey()
  #dbFolder = temporaryDirectory()
  #coreStorage = temporaryDirectory()

  /**
   * @param {import('node:test').TestContext} t
   */
  constructor(t) {
    this.#t = t
    for (const folder of [this.#dbFolder, this.#coreStorage]) {
      t.after(() =>
        fsPromises.rm(folder, { recursive: true, force: true, maxRetries: 2 })
      )
    }
  }

  /**
   * Run a function on a new manager in a separate process.
   *
   * Because this function is serialized and run in a separate process, there
   * are restrictions on the function:
   *
   * 1. Anything referenced outside the function must be passed as an argument.
   * 2. Arguments and return values must be serializable using `v8.serialize`.
   *
   * @template ArgsT
   * @template ResultT
   * @param {(manager: MapeoManager, ...args: ArgsT[]) => Promise<ResultT>} fn
   * @param {ArgsT[]} args
   * @returns {Promise<ResultT>}
   */
  async withManagerInSeparateProcess(fn, ...args) {
    const jsFile = await this.#createJsFile(fn, args)
    return this.#runJsFile(jsFile)
  }

  /**
   * @template ArgsT
   * @template ResultT
   * @param {(manager: MapeoManager, ...args: ArgsT[]) => Promise<ResultT>} fn
   * @param {ArgsT[]} args
   * @returns {Promise<string>}
   */
  async #createJsFile(fn, args) {
    // JSON.stringify does a good job wrapping strings in quotes and escaping.
    // This is a short alias.
    const s = JSON.stringify

    const require = createRequire(import.meta.url)
    const fastifyPath = require.resolve('fastify')

    const __filename = fileURLToPath(import.meta.url)
    const mapeoManagerJsPath = path.resolve(
      __filename,
      '..',
      '..',
      'src',
      'mapeo-manager.js'
    )
    const rootKeyHex = this.#rootKey.toString('hex')

    const argsHex = v8.serialize(args).toString('hex')

    const source = `
    import * as v8 from 'node:v8'
    import Fastify from ${s(fastifyPath)}
    import { MapeoManager } from ${s(mapeoManagerJsPath)}

    const manager = new MapeoManager({
      rootKey: Buffer.from(${s(rootKeyHex)}, 'hex'),
      projectMigrationsFolder: ${s(projectMigrationsFolder)},
      clientMigrationsFolder: ${s(clientMigrationsFolder)},
      dbFolder: ${s(this.#dbFolder)},
      coreStorage: ${s(this.#coreStorage)},
      fastify: Fastify(),
    })

    const fn = ${fn.toString()}

    const argsBuffer = Buffer.from(${s(argsHex)}, 'hex')
    const args = v8.deserialize(argsBuffer)

    const result = await fn(manager, ...args)

    process.send(result)
    `

    const result = temporaryFile({ extension: 'mjs' })
    this.#t.after(() => fsPromises.rm(result, { maxRetries: 2 }))
    await fsPromises.writeFile(result, source, 'utf8')
    return result
  }

  /**
   * @template ResultT
   * @param {string} jsFile
   * @returns {Promise<ResultT>}
   */
  #runJsFile(jsFile) {
    return new Promise((resolve, reject) => {
      /** @type {Error | ResultT} */
      let result = new Error('Child process finished without returning')

      const child = fork(jsFile, [], {
        cwd: process.cwd(),
        serialization: 'advanced',
        timeout: 60_000,
      })

      child.on('close', (code) => {
        if (code) {
          result = new Error(`Child process exited with code ${code}`)
        }
        if (result instanceof Error) {
          reject(result)
        } else {
          resolve(result)
        }
      })

      child.on('error', (err) => {
        result = err
      })

      child.on('message', (r) => {
        result = /** @type {ResultT} */ (r)
      })
    })
  }
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
 * @returns {boolean}
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
 * @param {{ timeout?: number }} [opts]
 */
export async function waitForSync(
  projects,
  type = 'initial',
  { timeout = 30_000 } = {}
) {
  // Need a small delay for any download intents to propogate between peers.
  await delay(100)
  return pTimeout(
    Promise.all(
      projects.map((project) => {
        const peerIds = projects
          .filter((p) => p !== project)
          .map((p) => p.deviceId)
        return waitForProjectSync(project, peerIds, type)
      })
    ),
    { milliseconds: timeout }
  )
}

/**
 * @param {import('../src/mapeo-project.js').MapeoProject[]} projects
 * @param {object} [opts]
 * @param {readonly import('@comapeo/schema').MapeoDoc['schemaName'][]} [opts.schemas]
 */
export function seedDatabases(projects, { schemas = SCHEMAS_TO_SEED } = {}) {
  return Promise.all(projects.map((p) => seedProjectDatabase(p, { schemas })))
}

const SCHEMAS_TO_SEED = /** @type {const} */ ([
  'observation',
  'preset',
  'field',
])

/** @typedef {import('@comapeo/schema').MapeoDoc['schemaName']} SchemaNames */

/**
 * @param {import('../src/mapeo-project.js').MapeoProject} project
 * @param {object} [opts]
 * @param {readonly SchemaNames[]} [opts.schemas]
 * @param {Map<SchemaNames, number>} [opts.seedCounts]
 * @returns {Promise<Array<import('@comapeo/schema').MapeoDoc & { forks: string[] }>>}
 */
export async function seedProjectDatabase(
  project,
  {
    schemas = SCHEMAS_TO_SEED,
    seedCounts = new Map([['observation', randomInt(20, 100)]]),
  } = {}
) {
  const promises = []
  for (const schemaName of schemas) {
    const count = seedCounts.get(schemaName) ?? randomInt(0, 10)
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
 * If the path is a regular file, return its size in bytes.
 *
 * If the path is a directory, return the size of all regular files inside.
 * Recurses through subdirectories.
 *
 * If the path is anything else, such as a symlink, `0` is returned.
 *
 * @param {string} filePath
 * @returns {Promise<number>}
 */
export async function getDiskUsage(filePath) {
  const stats = await fsPromises.stat(filePath)

  if (stats.isFile()) return stats.size

  if (!stats.isDirectory()) return 0

  const dirents = await fsPromises.readdir(filePath, {
    withFileTypes: true,
    recursive: true,
  })
  let result = 0
  await Promise.all(
    dirents.map(async (dirent) => {
      if (!dirent.isFile()) return 0
      const dirFilePath = path.join(dirent.path, dirent.name)
      const dirStats = await fsPromises.stat(dirFilePath)
      result += dirStats.size
    })
  )
  return result
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

/** @param {import('@comapeo/schema').MapeoDoc[]} docs */
export function sortById(docs) {
  return sortBy(docs, 'docId')
}

/**
 * @template T
 * @param {Readonly<Set<T>>} set
 * @param {ReadonlyArray<T>} toAdd
 * @returns {Set<T>}
 */
export function setAdd(set, ...toAdd) {
  const result = new Set(set)
  for (const value of toAdd) result.add(value)
  return result
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

/**
 * @template T
 * @param {Readonly<ArrayLike<T>>} arr
 * @returns {undefined | T}
 */
export function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * @param {import('../src/types.js').BlobId['type']} type
 * @param {number} size
 */
function randomBlobStream(type, size) {
  assert(size > 4, 'blob must be at least 4 bytes')
  const stream = randomBytesReadableStream({ size })
  switch (type) {
    case 'audio':
      stream.push(Buffer.from('ID3'))
      break
    case 'photo':
      stream.push(Buffer.from([0xff, 0xd8, 0xff]))
      break
    case 'video':
      stream.push(Buffer.from('ftyp'))
      break
    default:
      throw new ExhaustivenessError(type)
  }
  return stream
}

/**
 * @param {import('../src/types.js').BlobId['type']} type
 * @param {number} size
 * @returns {Promise<[string, Buffer]>}
 */
async function randomFileAndHash(type, size) {
  const filepath = temporaryFile()
  const hash = createHash('sha256')
  await pipeline(
    randomBlobStream(type, size),
    hashPassthrough(hash),
    fs.createWriteStream(filepath)
  )
  return [filepath, hash.digest()]
}

/**
 * @param {import('node:crypto').Hash} hash
 */
function hashPassthrough(hash) {
  return new Transform({
    transform(chunk, encoding, cb) {
      hash.update(chunk)
      cb(null, chunk)
    },
  })
}

/**
 * @template {import('../src/types.js').BlobId['type']} T
 * @param {T} type
 * @param {import('node:test').TestContext} t
 * @returns {Promise<T extends 'photo'
 *   ? {
 *       filepaths: { original: string, preview: string, thumbnail: string },
 *       hashes: { original: Buffer, preview: Buffer, thumbnail: Buffer }
 *       type: T
 *     }
 *  : {
 *     filepaths: { original: string }
 *     hashes: { original: Buffer }
 *     type: T
 *    }>
 * }
 */
export async function createBlobFixture(type, t) {
  if (type !== 'photo') {
    const size =
      type === 'audio'
        ? randomInt(2 * 2 ** 20, 4 * 2 ** 20)
        : randomInt(10 * 2 ** 20, 20 * 2 ** 20)
    const [original, hash] = await randomFileAndHash(type, size)
    t.after(() => fsPromises.rm(original))
    // @ts-expect-error - TS can't return type based on arg within fn
    return {
      filepaths: { original },
      hashes: { original: hash },
      type,
    }
  }
  const originalSize = randomInt(2 * 2 ** 20, 5 * 2 ** 20)
  const previewSize = randomInt(500 * 2 ** 10, 1 * 2 ** 20)
  const thumbSize = randomInt(50 * 2 ** 10, 200 * 2 ** 10)
  const [original, originalHash] = await randomFileAndHash(type, originalSize)
  const [preview, previewHash] = await randomFileAndHash(type, previewSize)
  const [thumb, thumbHash] = await randomFileAndHash(type, thumbSize)
  t.after(() =>
    Promise.all([
      fsPromises.rm(original),
      fsPromises.rm(preview),
      fsPromises.rm(thumb),
    ])
  )
  // @ts-expect-error - TS can't return type based on arg within fn
  return {
    filepaths: { original, preview, thumbnail: thumb },
    hashes: {
      original: originalHash,
      preview: previewHash,
      thumbnail: thumbHash,
    },
    type,
  }
}

/** @import { BlobId } from '../src/types.js' */
/**
 * @typedef {Object} SeededPhotoBlob
 * @property {Omit<Extract<BlobId, { type: 'photo' }>, 'variant'>} blobId
 * @property {{ original: Buffer, preview: Buffer, thumbnail: Buffer }} hashes
 */
/**
 * @typedef {Object} SeededAudioBlob
 * @property {Omit<Extract<BlobId, { type: 'audio' }>, 'variant'>} blobId
 * @property {{ original: Buffer }} hashes
 */
/**
 * @typedef {SeededPhotoBlob | SeededAudioBlob} SeededBlob
 */

/**
 * @param {import('../src/mapeo-project.js').MapeoProject} project
 * @param {import('node:test').TestContext} t
 * @param {{ photoCount: number, audioCount: number }} opts
 */
export async function seedProjectBlobs(project, t, { photoCount, audioCount }) {
  const promises = []
  for (let i = 0; i < photoCount; i++) {
    promises.push(createBlobFixture('photo', t))
  }
  for (let i = 0; i < audioCount; i++) {
    promises.push(createBlobFixture('audio', t))
  }
  const blobs = await Promise.all(promises)
  /** @type {SeededBlob[]} */
  const output = []
  for (const { filepaths, hashes, type } of blobs) {
    const mimeType = type === 'photo' ? 'image/jpeg' : 'audio/mpeg'
    const blobId = await project.$blobs.create(filepaths, {
      mimeType,
    })
    // @ts-expect-error - TS doesn't know
    output.push({ blobId, hashes })
  }
  return output
}
