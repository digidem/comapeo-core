import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveMasterKeyFromRootKey } from '@comapeo/crypto'

import { createManager } from './utils.js'

const ROOT_KEY = Buffer.from('9de4a01b1a0a5db1eaf5d9cd3d81a2bb', 'hex')
const DEVICE_ID =
  '85d55ec763140a44d07174df13fda83bbf59b99a87b29b498bdd7b7b9c262ba1'

test('masterKey option preserves deviceId', async (t) => {
  const derived = createManager('master-key-derived', t, { rootKey: ROOT_KEY })
  const cached = createManager('master-key-cached', t, {
    rootKey: ROOT_KEY,
    masterKey: deriveMasterKeyFromRootKey(ROOT_KEY),
  })

  // Pinned: a change here means every existing device loses its identity.
  assert.equal(derived.deviceId, DEVICE_ID)
  assert.equal(cached.deviceId, derived.deviceId)
})

test('masterKey option is actually used', async (t) => {
  const wrong = createManager('master-key-wrong', t, {
    rootKey: ROOT_KEY,
    masterKey: Buffer.alloc(32, 9),
  })

  assert.notEqual(wrong.deviceId, DEVICE_ID)
})
