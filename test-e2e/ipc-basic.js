import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createIpcManager,
  generateObservationThatWorksInOldVersion,
} from './utils.js'

test('basic functionality of a manager in a separate process', async (t) => {
  const manager = await createIpcManager('manager', t)
  await manager.setDeviceInfo({ name: 'manager', deviceType: 'mobile' })

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const { docId } = await project.observation.create(
    // We need to do this to satisfy TypeScript.
    //
    // Though `@comapeo/ipc`, used by this test, depends on the development
    // version of `@comapeo/core` in this repo, the types do not. That means
    // we can't use new observation fields in this test.
    generateObservationThatWorksInOldVersion()
  )

  assert(
    await project.observation.getByDocId(docId),
    'can retrieve an observation we just created'
  )
})
