import test from 'node:test'
import assert from 'node:assert/strict'
import { ManagerCustodian } from './utils.js'

test('restoring data from a previous run', async (t) => {
  const custodian = new ManagerCustodian(t)

  const projectId = await custodian.withManagerInSeparateProcess((manager1) =>
    manager1.createProject({ name: 'Foo Bar' })
  )

  const nameInOtherProcess = await custodian.withManagerInSeparateProcess(
    async (manager2, projectId) => {
      const project = await manager2.getProject(projectId)
      const settings = await project.$getProjectSettings()
      return settings.name
    },
    projectId
  )

  assert.equal(nameInOtherProcess, 'Foo Bar')
})
