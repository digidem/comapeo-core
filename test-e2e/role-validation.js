import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COORDINATOR_ROLE_ID,
  kTestOnlyAllowAnyRoleToBeAssigned,
  MEMBER_ROLE_ID,
} from '../src/roles.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'

// TODO(evanhahn) This should be moved into another file, probably the members.js tests

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
  const [creatorProject, memberProject] = projects
  await waitForSync(projects, 'initial')

  assert.equal(
    (await creatorProject.$member.getById(member.deviceId)).role.roleId,
    MEMBER_ROLE_ID,
    'test setup: creator sees correct role for member'
  )

  await memberProject.$member.assignRole(member.deviceId, COORDINATOR_ROLE_ID, {
    [kTestOnlyAllowAnyRoleToBeAssigned]: true,
  })
  await waitForSync(projects, 'initial')

  assert.equal(
    (await creatorProject.$member.getById(member.deviceId)).role.roleId,
    MEMBER_ROLE_ID,
    "creator is not fooled by member's bogus role assignment"
  )

  await creatorProject.$member.assignRole(member.deviceId, COORDINATOR_ROLE_ID)
  assert.equal(
    (await creatorProject.$member.getById(member.deviceId)).role.roleId,
    COORDINATOR_ROLE_ID,
    "creator can update the member's role"
  )

  await creatorProject.$member.assignRole(member.deviceId, MEMBER_ROLE_ID)
  assert.equal(
    (await creatorProject.$member.getById(member.deviceId)).role.roleId,
    MEMBER_ROLE_ID,
    "creator can update the member's role again"
  )
})
