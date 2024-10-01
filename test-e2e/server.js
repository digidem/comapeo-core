import assert from 'node:assert/strict'
import test from 'node:test'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import { createManager, getManagerOptions } from './utils.js'
import createServer from '../src/server/app.js'

// TODO: test invalid hostname
// TODO: test bad requests

test('adding a server peer', async (t) => {
  console.log('@@@@', 'adding a server peer')
  const manager = createManager('device0', t)
  await manager.setDeviceInfo({ name: 'device0', deviceType: 'mobile' }) // TODO: necessary?
  console.log('@@@@', 'created manager', manager.deviceId)
  const projectId = await manager.createProject()
  console.log('@@@@', 'created project')
  const project = await manager.getProject(projectId)

  console.log('@@@@', 'creating the project')

  const server = createTestServer()

  const serverAddress = await server.listen()
  console.log('@@@@', serverAddress)

  t.after(() => server.close())
  const serverHost = new URL(serverAddress).host

  await project.$member.addServerPeer(serverHost, {
    dangerouslyAllowInsecureConnections: true,
  })

  const members = await project.$member.getMany()
  console.log('@@@@', members)
  // TODO: Ensure that this peer doesn't exist before adding?
  const hasServerPeer = members.some(
    (member) =>
      // TODO: use server device type
      member.deviceType === 'desktop' && member.role.roleId === MEMBER_ROLE_ID
  )
  assert(hasServerPeer, 'expected a server peer to be found by the client')
})

function createTestServer() {
  return createServer({
    ...getManagerOptions('test server'),
    serverName: 'test server',
    logger: true,
  })
}
