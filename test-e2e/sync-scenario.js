import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import {
  BLOCKED_ROLE_ID,
  CREATOR_ROLE_ID,
  MEMBER_ROLE_ID,
} from '../src/roles.js'
import {
  createManagers,
  invite,
  seedProjectBlobs,
  waitForPeers,
} from './utils.js'

/** @import { MapeoManager } from '../src/mapeo-manager.js' */
/** @import { MapeoProject } from '../src/mapeo-project.js' */
/** @import { MapeoDoc } from '@comapeo/schema' */
/** @import { SyncTarget } from '../src/sync/sync-rules.js' */

/**
 * Declarative multi-device sync scenarios.
 *
 * A scenario is a named set of devices in one project, with helpers to
 * connect and disconnect devices, seed data, start and stop sync, wait for
 * completion, and assert what did (or — as important — did not) sync. The
 * goal is that a test reads as the scenario it covers:
 *
 * ```js
 * const s = await createSyncScenario(t, {
 *   devices: { creator: {}, member: {}, observer: {} },
 * })
 * await s.seed('member', { observation: 150 })
 * s.startDataSync('creator', 'member')
 * await s.waitForSync('all', ['creator', 'member'])
 * await s.assertDocsConverged(['creator', 'member'], 'observation')
 * await s.assertNeverReceived('observer', s.seeded.member.observation)
 * ```
 *
 * Connections are direct dials between devices (no broadcast discovery), so
 * the connection topology is exactly what the test builds: `s.connect(a, b)`
 * connects only a↔b.
 *
 * @typedef {object} DeviceOptions
 * @property {import('../src/roles.js').RoleIdForNewInvite} [role] role to
 * invite the device with (default member). Ignored for the first device,
 * which creates the project.
 *
 * @typedef {object} ScenarioOptions
 * @property {Record<string, DeviceOptions>} devices device name → options.
 * The first entry creates the project; the rest are invited to it (over a
 * temporary all-to-all connection which is torn down afterwards unless
 * `connected` is true).
 * @property {boolean} [connected=true] leave all devices connected to each
 * other after setup. Pass `false` to start the scenario body from a
 * fully-disconnected state.
 * @property {string} [projectName]
 */

/**
 * @param {import('node:test').TestContext} t
 * @param {ScenarioOptions} opts
 */
export async function createSyncScenario(
  t,
  { devices: deviceOptions, connected = true, projectName = 'Mapeo' }
) {
  const names = Object.keys(deviceOptions)
  assert(names.length >= 1, 'scenario needs at least one device')
  const managers = /** @type {MapeoManager[]} */ (
    /** @type {unknown} */ (await createManagers(names.length, t))
  )

  /**
   * @typedef {object} ScenarioDevice
   * @property {string} name
   * @property {string} deviceId
   * @property {MapeoManager} manager
   * @property {MapeoProject} project
   */

  /** @type {Map<string, ScenarioDevice>} */
  const devices = new Map()

  const [creatorName, ...inviteeNames] = names
  const creatorManager = managers[0]
  const projectId = await creatorManager.createProject({ name: projectName })

  // Invite everyone over a temporary all-to-all connection
  const scenario = new SyncScenario(t, devices, projectId)
  for (const [i, name] of names.entries()) {
    devices.set(name, {
      name,
      deviceId: managers[i].deviceId,
      manager: managers[i],
      // @ts-expect-error - set just below, before anything can read it
      project: null,
    })
  }
  await scenario.connect(...names)
  for (const name of inviteeNames) {
    const { role = MEMBER_ROLE_ID } = deviceOptions[name]
    assert.notEqual(
      role,
      CREATOR_ROLE_ID,
      'only the first device can be the creator'
    )
    const device = devices.get(name)
    assert(device)
    await invite({
      invitor: creatorManager,
      invitees: [device.manager],
      projectId,
      roleId: role,
    })
  }
  for (const device of devices.values()) {
    device.project = await device.manager.getProject(projectId)
  }
  // Everyone finishes initial sync before the scenario body starts, so
  // membership records are fully propagated. Devices invited as BLOCKED are
  // excluded: from their own perspective initial sync never completes (they
  // want config they will never receive).
  const syncableNames = names.filter(
    (name, i) => i === 0 || deviceOptions[name].role !== BLOCKED_ROLE_ID
  )
  if (syncableNames.length > 1) {
    await scenario.waitForSync('initial', syncableNames)
  }
  if (!connected) await scenario.disconnectAll()

  return scenario
}

export class SyncScenario {
  /** @type {Map<string, { name: string, deviceId: string, manager: MapeoManager, project: MapeoProject }>} */
  #devices
  /**
   * Devices currently running a discovery server, and which devices they
   * have been connected to
   * @type {Map<string, Set<string>>}
   */
  #connections = new Map()
  #projectId
  #t

  /**
   * Docs seeded via {@link seed}, by device name then schema name.
   * @type {Record<string, Record<string, MapeoDoc[]>>}
   */
  seeded = {}

  /**
   * @param {import('node:test').TestContext} t
   * @param {Map<string, { name: string, deviceId: string, manager: MapeoManager, project: MapeoProject }>} devices
   * @param {string} projectId
   */
  constructor(t, devices, projectId) {
    this.#t = t
    this.#devices = devices
    this.#projectId = projectId
    t.after(() => this.disconnectAll())
  }

  get projectId() {
    return this.#projectId
  }

  /** @param {string} name */
  #device(name) {
    const device = this.#devices.get(name)
    assert(device, `unknown scenario device "${name}"`)
    return device
  }

  /** @param {string} name */
  project(name) {
    return this.#device(name).project
  }

  /** @param {string} name */
  manager(name) {
    return this.#device(name).manager
  }

  /** @param {string} name */
  deviceId(name) {
    return this.#device(name).deviceId
  }

  /** @param {ReadonlyArray<string>} [names] */
  #resolveNames(names) {
    return names && names.length > 0 ? names : [...this.#devices.keys()]
  }

  /**
   * Connect the listed devices (default: all) to each other. Waits until the
   * connections are established.
   *
   * @param {...string} names
   */
  async connect(...names) {
    const toConnect = this.#resolveNames(names)
    const addresses = new Map(
      await Promise.all(
        toConnect.map(async (name) => {
          const { manager } = this.#device(name)
          const address = await manager.startLocalPeerDiscoveryServer()
          return /** @type {const} */ ([name, address])
        })
      )
    )
    for (const name of toConnect) {
      const connectedTo = this.#connections.get(name) ?? new Set([name])
      this.#connections.set(name, connectedTo)
      for (const otherName of toConnect) {
        if (otherName === name || connectedTo.has(otherName)) continue
        connectedTo.add(otherName)
        const address = addresses.get(otherName)
        assert(address)
        this.#device(name).manager.connectLocalPeer({
          address: '127.0.0.1',
          name: address.name,
          port: address.port,
        })
      }
    }
    await waitForPeers(toConnect.map((name) => this.#device(name).manager))
  }

  /**
   * Disconnect the listed devices (default: all) from everything. (Per-pair
   * disconnection isn't supported by the underlying transport: disconnecting
   * a device drops all of its connections.)
   *
   * @param {...string} names
   */
  async disconnect(...names) {
    const toDisconnect = this.#resolveNames(names)
    await Promise.all(
      toDisconnect.map(async (name) => {
        for (const connectedTo of this.#connections.values()) {
          connectedTo.delete(name)
        }
        this.#connections.delete(name)
        await this.#device(name).manager.stopLocalPeerDiscoveryServer({
          force: true,
        })
      })
    )
  }

  async disconnectAll() {
    await this.disconnect()
  }

  /**
   * Create documents on a device. Returns the newly-created docs, and also
   * records them (accumulating) on {@link seeded} for later assertions.
   *
   * @param {string} name
   * @param {Partial<Record<'observation' | 'preset' | 'field' | 'track', number>>} counts
   * @returns {Promise<Record<string, MapeoDoc[]>>}
   */
  async seed(name, counts) {
    const { project } = this.#device(name)
    const bySchema = (this.seeded[name] ??= {})
    /** @type {Record<string, MapeoDoc[]>} */
    const created = {}
    for (const [schemaName, count] of Object.entries(counts)) {
      const values = generate(/** @type {'observation'} */ (schemaName), {
        count,
      })
      const docs = await Promise.all(
        values.map((value) =>
          // @ts-expect-error - schemaName indexes the project dynamically
          project[schemaName].create(valueOf(value))
        )
      )
      created[schemaName] = docs
      ;(bySchema[schemaName] ??= []).push(...docs)
    }
    return created
  }

  /**
   * Add real photo/audio blobs to a device.
   *
   * @param {string} name
   * @param {{ photoCount?: number, audioCount?: number }} counts
   */
  async seedBlobs(name, { photoCount = 0, audioCount = 0 }) {
    const { project } = this.#device(name)
    return seedProjectBlobs(project, this.#t, { photoCount, audioCount })
  }

  /** @param {...string} names default: all */
  startDataSync(...names) {
    for (const name of this.#resolveNames(names)) {
      this.#device(name).project.$sync.start()
    }
  }

  /** @param {...string} names default: all */
  stopDataSync(...names) {
    for (const name of this.#resolveNames(names)) {
      this.#device(name).project.$sync.stop()
    }
  }

  /**
   * Assign a role from one device to another.
   *
   * @param {string} byName device doing the assigning
   * @param {string} targetName device whose role changes
   * @param {import('../src/roles.js').RoleIdAssignableToOthers} roleId
   */
  async assignRole(byName, targetName, roleId) {
    await this.#device(byName).project.$member.assignRole(
      this.#device(targetName).deviceId,
      roleId
    )
  }

  /**
   * Wait for sync to complete for the given target on the listed devices
   * (default: all). Waits for each device to first see the others as
   * connected sync peers, so this is safe to call immediately after
   * `connect()`.
   *
   * @param {SyncTarget} target
   * @param {ReadonlyArray<string>} [names]
   * @param {{ timeout?: number }} [opts]
   */
  async waitForSync(target, names, { timeout = 30_000 } = {}) {
    const toSync = this.#resolveNames(names)
    // Small delay for any blob download intents to propagate between peers
    await delay(100)
    await Promise.all(
      toSync.map(async (name) => {
        const { project } = this.#device(name)
        const otherDeviceIds = toSync
          .filter((other) => other !== name)
          .map((other) => this.#device(other).deviceId)
        const hasAllPeers = () => {
          const { devices } = project.$sync.getState()
          return otherDeviceIds.every((id) => id in devices)
        }
        if (!hasAllPeers()) {
          await this.#waitForSyncState(name, hasAllPeers, {
            timeout,
            message: `${name} never saw ${toSync.join(', ')} as sync peers`,
          })
        }
        await project.$sync.waitForSync(target, { timeoutMs: timeout })
      })
    )
  }

  /**
   * Resolve once `predicate(state)` is true for a device's sync state.
   *
   * @param {string} name
   * @param {(state: import('../src/sync/sync-api.js').State) => boolean} predicate
   * @param {{ timeout?: number, message?: string }} [opts]
   */
  #waitForSyncState(name, predicate, { timeout = 30_000, message } = {}) {
    const { project } = this.#device(name)
    return new Promise((res, rej) => {
      const timer = setTimeout(() => {
        project.$sync.off('sync-state', onState)
        rej(
          new Error(message || `${name}: sync-state predicate not met in time`)
        )
      }, timeout)
      /** @param {import('../src/sync/sync-api.js').State} state */
      const onState = (state) => {
        if (!predicate(state)) return
        clearTimeout(timer)
        project.$sync.off('sync-state', onState)
        res(void 0)
      }
      project.$sync.on('sync-state', onState)
      onState(project.$sync.getState())
    })
  }

  /**
   * Resolve once `predicate(state)` holds for `observerName`'s sync state.
   * Public wrapper for tests that need to await a specific reported state.
   *
   * @param {string} name
   * @param {(state: import('../src/sync/sync-api.js').State) => boolean} predicate
   * @param {{ timeout?: number, message?: string }} [opts]
   */
  waitForSyncState(name, predicate, opts) {
    return this.#waitForSyncState(name, predicate, opts)
  }

  /**
   * Start recording an invariant over a device's reported sync state: every
   * emitted state (and the current one) must satisfy `predicate`. Call the
   * returned function to assert no violation was ever seen (it also stops
   * recording).
   *
   * @param {string} name
   * @param {(state: import('../src/sync/sync-api.js').State) => boolean} predicate
   * @param {string} description
   * @returns {() => void} assert-and-stop
   */
  recordStateInvariant(name, predicate, description) {
    const { project } = this.#device(name)
    /** @type {string[]} */
    const violations = []
    /** @param {import('../src/sync/sync-api.js').State} state */
    const onState = (state) => {
      if (!predicate(state)) violations.push(JSON.stringify(state))
    }
    project.$sync.on('sync-state', onState)
    onState(project.$sync.getState())
    return () => {
      project.$sync.off('sync-state', onState)
      assert.equal(
        violations.length,
        0,
        `${name}: invariant violated (${description}). First violating state: ${violations[0]}`
      )
    }
  }

  /**
   * Assert the listed devices all hold an identical set of docs for the
   * schema. If `expected` docs are given, also assert the set is exactly
   * those docs.
   *
   * @param {ReadonlyArray<string>} names
   * @param {'observation' | 'preset' | 'field' | 'track'} schemaName
   * @param {{ expected?: ReadonlyArray<MapeoDoc> }} [opts]
   */
  async assertDocsConverged(names, schemaName, { expected } = {}) {
    assert(names.length >= 2 || expected, 'need 2+ devices or expected docs')
    /** @type {Map<string, Set<string>>} */
    const idsByDevice = new Map()
    for (const name of names) {
      const docs = await this.#device(name).project[schemaName].getMany()
      idsByDevice.set(name, new Set(docs.map((doc) => doc.docId)))
    }
    const [firstName, ...restNames] = names
    const firstIds = idsByDevice.get(firstName)
    for (const other of restNames) {
      assert.deepEqual(
        idsByDevice.get(other),
        firstIds,
        `${other} and ${firstName} hold the same ${schemaName} docs`
      )
    }
    if (expected) {
      assert.deepEqual(
        firstIds,
        new Set(expected.map((doc) => doc.docId)),
        `${firstName} holds exactly the expected ${schemaName} docs`
      )
    }
  }

  /**
   * Assert a device holds none of the given docs — used to prove data did
   * NOT sync somewhere it shouldn't have.
   *
   * @param {string} name
   * @param {ReadonlyArray<MapeoDoc>} docs
   * @param {string} [message]
   */
  async assertNeverReceived(name, docs, message) {
    assert(docs.length > 0, 'assertNeverReceived called with no docs')
    const { project } = this.#device(name)
    for (const doc of docs) {
      /** @type {MapeoDoc | null} */
      let found = null
      try {
        // @ts-expect-error - schemaName indexes the project dynamically
        found = await project[doc.schemaName].getByDocId(doc.docId)
      } catch {
        // Not found: what we want
      }
      assert.equal(
        found,
        null,
        message ||
          `${name} must not have received ${doc.schemaName} ${doc.docId}`
      )
    }
  }
}
