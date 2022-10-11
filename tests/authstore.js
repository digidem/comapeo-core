import test from 'brittle'
import { addCores, createAuthStore, replicate } from './helpers/index.js'

test('get capabilities and check access levels', async (t) => {
  t.plan(6)

  const auth1 = await createAuthStore()
  const auth2 = await createAuthStore({
    projectKeyPair: auth1.projectKeyPair,
  })

  replicate(auth1, auth2)
  addCores(auth1, auth2)

  await auth1.authstore.append({
    type: 'capabilities',
    capability: 'admin',
    identityPublicKey: auth1.identityKeyPair.publicKey.toString('hex'),
  })

  await auth1.authstore.append({
    type: 'capabilities',
    capability: 'member',
    identityPublicKey: auth2.identityKeyPair.publicKey.toString('hex'),
  })

  t.is(
    (await auth1.authstore.getCapabilities()).length,
    4,
    'auth1 should have 2 capabilities statements'
  )

  t.is(
    (await auth2.authstore.getCapabilities()).length,
    4,
    'auth2 should have 2 capabilities statements'
  )

  t.is(
    await auth1.authstore.hasCapability({
      capability: 'admin',
      identityPublicKey: auth1.identityKeyPair.publicKey.toString('hex'),
    }),
    true,
    'auth1 should have admin capability'
  )

  t.is(
    await auth1.authstore.hasCapability({
      capability: 'admin',
      identityPublicKey: auth2.identityKeyPair.publicKey.toString('hex'),
    }),
    false,
    'auth2 should not have admin capability'
  )

  t.is(
    await auth2.authstore.hasCapability({
      capability: 'admin',
      identityPublicKey: auth1.identityKeyPair.publicKey.toString('hex'),
    }),
    true,
    'auth1 should have admin capability'
  )

  t.is(
    await auth2.authstore.hasCapability({
      capability: 'admin',
      identityPublicKey: auth2.identityKeyPair.publicKey.toString('hex'),
    }),
    false,
    'auth2 should not have admin capability'
  )
})

test('resolve fork at lowest capability', async (t) => {
  t.plan(3)

  const auth1 = await createAuthStore()
  const auth2 = await createAuthStore({ projectKeyPair: auth1.projectKeyPair })
  const auth3 = await createAuthStore({ projectKeyPair: auth1.projectKeyPair })

  replicate(auth1, auth2)
  replicate(auth1, auth3)
  replicate(auth2, auth3)

  auth1.authstore.addCore(auth2.authstore.key)
  auth1.authstore.addCore(auth3.authstore.key)

  auth2.authstore.addCore(auth1.authstore.key)
  auth2.authstore.addCore(auth3.authstore.key)

  auth3.authstore.addCore(auth2.authstore.key)
  auth3.authstore.addCore(auth1.authstore.key)

  await auth1.authstore.append({
    type: 'capabilities',
    capability: 'admin',
    identityPublicKey: auth1.identityKeyPair.publicKey.toString('hex'),
  })

  await auth1.authstore.append({
    type: 'capabilities',
    capability: 'admin',
    identityPublicKey: auth2.identityKeyPair.publicKey.toString('hex'),
  })

  await auth2.authstore.append({
    type: 'capabilities',
    capability: 'none',
    identityPublicKey: auth3.authstore.identityPublicKeyString,
  })

  await auth1.authstore.append({
    type: 'capabilities',
    capability: 'member',
    identityPublicKey: auth3.authstore.identityPublicKeyString,
  })

  const capabilities = await auth1.authstore.getCapabilities(
    auth3.authstore.identityPublicKeyString
  )

  const auth2capabilities = await auth2.authstore.getCapabilities(
    auth3.authstore.identityPublicKeyString
  )

  const isAdmin = await auth1.authstore.hasCapability({
    capability: 'admin',
    identityPublicKey: auth3.authstore.identityPublicKeyString,
  })

  t.is(isAdmin, false, 'auth3 should not be admin')

  const isMember = await auth1.authstore.hasCapability({
    capability: 'member',
    identityPublicKey: auth3.authstore.identityPublicKeyString,
  })

  t.is(isMember, false, 'auth3 should not be member')

  const isBanned = await auth1.authstore.hasCapability({
    capability: 'none',
    identityPublicKey: auth3.authstore.identityPublicKeyString,
  })

  t.is(isBanned, true, 'auth3 should have no access to the project')
})
