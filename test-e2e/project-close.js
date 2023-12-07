import test from 'brittle'
import { COORDINATOR_ROLE_ID } from '../src/capabilities.js'
import { createManagers, connectPeers, invite, addMockData } from './utils.js'

test('Close while indexing waits for indexing to finish', async (t) => {
  const COUNT = 2
  const managers = await createManagers(COUNT, t)
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject()
  const invitorProject = await invitor.getProject(projectId)
  await addMockData(invitorProject, 'observation', 2000)

  const disconnect = connectPeers(managers, { discovery: false })
  await invite({
    invitor,
    invitees: [invitee],
    projectId,
    roleId: COORDINATOR_ROLE_ID,
  })
  const inviteeProject = await invitee.getProject(projectId)

  for (const project of [invitorProject, inviteeProject]) {
    project.$sync.start()
  }
  await dataSyncStarted(invitorProject)

  await Promise.all([invitorProject, inviteeProject].map((p) => p.close()))
  t.pass('Closed projects without error')
  await disconnect()
})

/**
 * Wait until data sync has started and resolve
 * @param {import('../src/mapeo-project.js').MapeoProject} project
 * @returns
 */
function dataSyncStarted(project) {
  return new Promise((resolve) => {
    project.$sync.on('sync-state', function onState(state) {
      if (state.data.dataToSync) {
        project.$sync.removeListener('sync-state', onState)
        resolve(null)
      }
    })
  })
}
