import assert from 'node:assert/strict'
import test from 'node:test'
import { CREATOR_ROLE_ID, MEMBER_ROLE_ID } from '../src/roles.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'

test('role validation', async (t) => {
  const managers = await createManagers(2, t)
  const [creator, member] = managers

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const projectId = await creator.createProject({ name: 'role test' })
  await invite({
    projectId,
    invitor: creator,
    invitees: [member],
    roleId: MEMBER_ROLE_ID,
  })

  const projects = await Promise.all(
    managers.map((manager) => manager.getProject(projectId))
  )
  await waitForSync(projects, 'initial')

  const [creatorRole, memberRole] = await Promise.all(
    projects.map((project) => project.$getOwnRole())
  )
  assert.equal(creatorRole.roleId, CREATOR_ROLE_ID)
  assert.equal(memberRole.roleId, MEMBER_ROLE_ID)
})
