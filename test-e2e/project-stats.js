import test from 'node:test'
import assert from 'node:assert/strict'
import { pEvent } from 'p-event'

import {
  createManagers,
  createManager,
  connectPeers,
  seedProjectDatabase,
} from './utils.js'
import { roles } from '../src/index.js'

/** @import { Readable } from 'streamx' */

const DEFAULT_OBSERVATIONS = 2
const DEFAULT_TRACKS = 2

test('Tracks exist for project', async (t) => {
  const manager = createManager('test', t)

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  await seedProjectDatabase(project, {
    schemas: ['observation', 'track'],
    seedCounts: new Map([
      ['observation', DEFAULT_OBSERVATIONS],
      ['track', DEFAULT_TRACKS],
    ]),
  })

  const stats = project.$getStats()

  assert(
    stats.observations.values[0][0].startsWith(
      new Date().getFullYear().toString()
    ),
    'Week for this year'
  )
  assert.equal(
    stats.observations.values[0][1],
    DEFAULT_OBSERVATIONS,
    'Count of observations'
  )
  assert.equal(stats.tracks.values[0][1], DEFAULT_TRACKS, 'Count of tracks')
  assert(stats.members !== undefined, 'Members exists')
})

test('sendStats state persists', async (t) => {
  const manager = createManager('test', t)

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const { sendStats: initialSendStats } = await project.$getProjectSettings()

  assert(initialSendStats !== true, 'default sendStats not true')

  await project.$setProjectSettings({ sendStats: true })

  const { sendStats: updatedSendStats } = await project.$getProjectSettings()

  assert(updatedSendStats, 'send stats got updated')
})

test('sendStats set inside invite', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  const project = await invitor.getProject(projectId)
  await project.$setProjectSettings({ sendStats: true })

  const gotInvite = pEvent(invitee.invite, 'invite-received')
  project.$member.invite(invitee.deviceId, {
    roleId: roles.MEMBER_ROLE_ID,
  })

  const invite = await gotInvite

  assert(invite.sendStats, 'Invite mentions send stats')
})
