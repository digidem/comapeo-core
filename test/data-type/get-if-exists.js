import { testenv } from './test-helpers.js'
import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { getByDocIdIfExists } from '../../src/datatype/get-if-exists.js'
import { valueOf } from '@comapeo/schema'
import { generate } from '@mapeo/mock-data'

describe('getByDocIdIfExists', () => {
  test('resolves with null if no document exists with that ID', async () => {
    const { dataType } = await testenv()
    assert.equal(await getByDocIdIfExists(dataType, 'foo bar'), null)
  })

  test('resolves with the document if it exists', async () => {
    const { dataType } = await testenv()
    const fixture = valueOf(generate('observation')[0])
    const observation = await dataType.create(fixture)
    assert(await getByDocIdIfExists(dataType, observation.docId))
  })
})
