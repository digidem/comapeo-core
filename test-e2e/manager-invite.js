import { test } from 'brittle'
import { MEMBER_ROLE_ID } from '../src/capabilities.js'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import { once } from 'node:events'
import {
  connectPeers,
  createManagers,
  disconnectPeers,
  waitForPeers,
} from './utils-new.js'

test('member invite accepted', async (t) => {
  const [creator, joiner] = await createManagers(2)
  connectPeers([creator, joiner])
  await waitForPeers([creator, joiner])

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
  connectPeers([creator, joiner])
  await waitForPeers([creator, joiner])

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
