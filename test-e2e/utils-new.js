// @ts-check
import sodium from 'sodium-universal'
import RAM from 'random-access-memory'

import { MapeoManager } from '../src/index.js'
import { kRPC } from '../src/mapeo-manager.js'
import { MEMBER_ROLE_ID } from '../src/capabilities.js'
import { once } from 'node:events'

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
  } else {
    // TODO: replicate all managers, for faster tests (discovery can take extra time)
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
 * @returns {Promise<import('type-fest').ReadonlyTuple<MapeoManager, T>>}
 */
export async function createManagers(count) {
  // @ts-ignore
  return Promise.all(
    Array(count)
      .fill(null)
      .map(async (_, i) => {
        const name = 'device' + i
        const manager = createManager(name)
        await manager.setDeviceInfo({ name })
        return manager
      })
  )
}

/** @param {string} [seed] */
export function createManager(seed) {
  return new MapeoManager({
    rootKey: getRootKey(seed),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
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
