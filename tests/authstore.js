import test from 'brittle'
import { createAuthStores } from './helpers/authstore.js'
import { waitForIndexing } from './helpers/index.js'

test('core ownership, project creator', async (t) => {
  t.plan(7)

  const [peer1, peer2] = await createAuthStores(2)
  await waitForIndexing([peer1.authstore, peer2.authstore])

  const peer1Owner = await peer1.authstore.getCoreOwner({
    coreId: peer1.authstore.id,
  })
  const peer2Owner = await peer2.authstore.getCoreOwner({
    coreId: peer2.authstore.id,
  })

  t.is(peer1Owner.id, peer1.identityId, 'peer1 owns their core')
  t.is(peer2Owner.id, peer2.identityId, 'peer2 owns their core')

  const peer1OwnerRemote = await peer2.authstore.getCoreOwner({
    coreId: peer1.authstore.id,
  })
  const peer2OwnerRemote = await peer1.authstore.getCoreOwner({
    coreId: peer2.authstore.id,
  })

  t.is(peer1OwnerRemote.id, peer1.identityId, 'peer1 owns their core')
  t.is(peer2OwnerRemote.id, peer2.identityId, 'peer2 owns their core')

  const peer2NotOwner = peer2.authstore.verifyCoreOwner({
    id: peer2.identityId,
    coreId: peer1.authstore.id,
    signature: peer1Owner.signature,
  })

  await t.exception(peer2NotOwner, 'peer2 cannot verify as owner of peer1 core')

  const projectCreator = await peer1.authstore.getProjectCreator()
  t.is(projectCreator.id, peer1.identityId, 'peer1 is project creator')

  const onlyOneProjectCreator = peer2.authstore.setProjectCreator({
    projectId: peer2.authstore.projectId,
  })

  await t.exception(
    onlyOneProjectCreator,
    'peer2 cannot set themselves as project creator'
  )
})

test('device add, remove, restore, set role', async (t) => {
  t.plan(10)

  const [peer1, peer2] = await createAuthStores(2)
  await waitForIndexing([peer1.authstore, peer2.authstore])

  const peer2Device = await peer1.authstore.addDevice({
    identityId: peer2.identityId,
  })

  t.ok(peer2Device)
  await waitForIndexing([peer1.authstore, peer2.authstore])

  const peer2DeviceRemote = await peer2.authstore.getDevice({
    identityId: peer2.identityId,
  })

  t.ok(peer2DeviceRemote, 'peer2 device added')

  const peer1NotRemoved = peer2.authstore.removeDevice({
    identityId: peer1.identityId,
  })

  await t.exception(peer1NotRemoved, 'project creator cannot be removed')

  const peer2Removed = await peer1.authstore.removeDevice({
    identityId: peer2.identityId,
  })

  t.is(peer2Removed.action, 'device:remove', 'peer2 device removed')

  const peer2NotRemovedTwice = peer1.authstore.removeDevice({
    identityId: peer2.identityId,
  })

  await t.exception(
    peer2NotRemovedTwice,
    'peer2 device cannot be removed twice'
  )

  const peer2Restored = await peer1.authstore.restoreDevice({
    identityId: peer2.identityId,
  })

  t.is(peer2Restored.action, 'device:restore', 'peer2 device restored')

  const peer2NotRestoredTwice = peer1.authstore.restoreDevice({
    identityId: peer2.identityId,
  })

  await t.exception(
    peer2NotRestoredTwice,
    'peer2 device cannot be restored twice'
  )

  const peer2Contributor = await peer1.authstore.setRole({
    role: 'contributor',
    identityId: peer2.identityId,
  })

  t.is(peer2Contributor.role, 'contributor', 'peer2 role set to member')

  const noChangingProjectCreator = peer2.authstore.setRole({
    role: 'member',
    identityId: peer1.identityId,
  })

  await t.exception(
    noChangingProjectCreator,
    'project creator cannot be changed'
  )

  const peer2NonMember = await peer1.authstore.setRole({
    role: 'nonmember',
    identityId: peer2.identityId,
  })

  t.is(peer2NonMember.role, 'nonmember', 'peer2 role set to nonmember')
})
