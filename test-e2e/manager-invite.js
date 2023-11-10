import { test } from 'brittle'
import RAM from 'random-access-memory'
import { MEMBER_ROLE_ID } from '../src/capabilities.js'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import { MapeoManager, kManagerReplicate, kRPC } from '../src/mapeo-manager.js'
import { once } from 'node:events'
import sodium from 'sodium-universal'

test('member invite accepted', async (t) => {
  const [creator, joiner] = await createManagers(2)
  await connectPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  await t.exception(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance before being invited and added to project'
  )

  const responsePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const [invite] = await once(joiner.invite, 'invite-received')
  t.is(invite.projectId, createdProjectId, 'projectId of invite matches')
  t.is(invite.peerId, creator.deviceId, 'deviceId of invite matches')
  t.is(invite.projectName, 'Mapeo', 'project name of invite matches')

  await joiner.invite.accept(invite.projectId)

  t.is(
    await responsePromise,
    InviteResponse_Decision.ACCEPT,
    'correct invite response'
  )

  /// After invite flow has completed...

  t.alike(
    await joiner.listProjects(),
    await creator.listProjects(),
    'project info recorded in joiner successfully'
  )

  const joinerProject = await joiner.getProject(createdProjectId)

  t.alike(
    await joinerProject.$getProjectSettings(),
    await creatorProject.$getProjectSettings(),
    'Project settings match'
  )

  t.alike(
    await creatorProject.$member.getMany(),
    await joinerProject.$member.getMany(),
    'Project members match'
  )

  await disconnectPeers([creator, joiner])
})

test('member invite rejected', async (t) => {
  const [creator, joiner] = await createManagers(2)
  await connectPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  await t.exception(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance before being invited and added to project'
  )

  const responsePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const [invite] = await once(joiner.invite, 'invite-received')
  t.is(invite.projectId, createdProjectId, 'projectId of invite matches')
  t.is(invite.peerId, creator.deviceId, 'deviceId of invite matches')
  t.is(invite.projectName, 'Mapeo', 'project name of invite matches')

  await joiner.invite.reject(invite.projectId)

  t.is(
    await responsePromise,
    InviteResponse_Decision.REJECT,
    'correct invite response'
  )

  /// After invite flow has completed...

  const joinerListedProjects = await joiner.listProjects()

  t.is(joinerListedProjects.length, 0, 'project not added to joiner')

  await t.exception(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance'
  )

  t.is(
    (await creatorProject.$member.getMany()).length,
    1,
    'Only 1 member in project still'
  )

  await disconnectPeers([creator, joiner])
})

/**
 * @param {MapeoManager} mm1
 * @param {MapeoManager} mm2
 */
export function replicate(mm1, mm2) {
  const r1 = mm1[kManagerReplicate](true)
  const r2 = mm2[kManagerReplicate](false)

  r1.pipe(r2).pipe(r1)

  /** @param {Error} [e] */
  return async function destroy(e) {
    return Promise.all([
      /** @type {Promise<void>} */
      (
        new Promise((res) => {
          r1.on('close', res)
          r1.destroy(e)
        })
      ),
      /** @type {Promise<void>} */
      (
        new Promise((res) => {
          r2.on('close', res)
          r2.destroy(e)
        })
      ),
    ])
  }
}

/**
 * @param {MapeoManager[]} managers
 */
async function disconnectPeers(managers) {
  return Promise.all(
    managers.map(async (manager) => {
      return manager.stopLocalPeerDiscovery({ force: true })
    })
  )
}

/**
 * @param {MapeoManager[]} managers
 */
async function connectPeers(managers) {
  for (const manager of managers) {
    manager.startLocalPeerDiscovery()
  }
  return new Promise((res) => {
    managers[0][kRPC].on('peers', function onPeers(peers) {
      if (peers.length !== managers.length - 1) return
      if (!peers.every((peerInfo) => peerInfo.status === 'connected')) return
      managers[0][kRPC].off('peers', onPeers)
      res(null)
    })
  })
}

/** @param {number} count */
async function createManagers(count) {
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
function createManager(seed) {
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
