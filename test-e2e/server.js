import assert from 'node:assert/strict'
import test from 'node:test'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import { createManager, createManagers, getManagerOptions } from './utils.js'
import createServer from '../src/server/app.js'

// TODO: test invalid hostname
// TODO: test bad requests

test('adding a server peer', async (t) => {
  const manager = createManager('device0', t)
  await manager.setDeviceInfo({ name: 'device0', deviceType: 'mobile' }) // TODO: necessary?
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const serverHost = await createTestServer(t)

  await project.$member.addServerPeer(serverHost, {
    dangerouslyAllowInsecureConnections: true,
  })

  const members = await project.$member.getMany()
  // TODO: Ensure that this peer doesn't exist before adding?
  const hasServerPeer = members.some(
    (member) =>
      // TODO: use server device type
      member.deviceType === 'desktop' && member.role.roleId === MEMBER_ROLE_ID
  )
  assert(hasServerPeer, 'expected a server peer to be found by the client')
})

test("can't add a server to two different projects", async (t) => {
  const [managerA, managerB] = await createManagers(2, t, 'mobile')
  const projectIdA = await managerA.createProject()
  const projectIdB = await managerB.createProject()
  const projectA = await managerA.getProject(projectIdA)
  const projectB = await managerB.getProject(projectIdB)

  const serverHost = await createTestServer(t)

  await projectA.$member.addServerPeer(serverHost, {
    dangerouslyAllowInsecureConnections: true,
  })

  await assert.rejects(async () => {
    await projectB.$member.addServerPeer(serverHost, {
      dangerouslyAllowInsecureConnections: true,
    })
  }, Error)
})

/**
 *
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>} server host
 */
async function createTestServer(t) {
  const server = createServer({
    ...getManagerOptions('test server'),
    serverName: 'test server',
  })
  const serverAddress = await server.listen()
  t.after(() => server.close())
  return new URL(serverAddress).host
}
