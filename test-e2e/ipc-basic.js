import test from 'node:test'
import assert from 'node:assert/strict'
import { createIpcManager } from './utils.js'

test('basic functionality of a manager in a separate process', async (t) => {
  const manager = await createIpcManager('manager', t)
  await manager.setDeviceInfo({ name: 'manager', deviceType: 'mobile' })

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const { docId } = await project.observation.create({
    schemaName: 'observation',
    attachments: [],
    tags: {},
  })

  assert(
    await project.observation.getByDocId(docId),
    'can retrieve an observation we just created'
  )
})
