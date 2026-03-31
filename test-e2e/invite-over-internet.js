import test from 'node:test'
import { createManagers } from './utils.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import assert from 'node:assert/strict'

test('invite over internet and join from URL', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  const gotProjectId = await invitee.joinProjectOverInternet(url)

  assert.equal(gotProjectId, projectId, 'joined expected project')
})
