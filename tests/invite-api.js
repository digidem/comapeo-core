import test from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { MapeoRPC } from '../src/rpc/index.js'
import { InviteApi } from '../src/invite-api.js'
import { replicate } from './helpers/rpc.js'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import pDefer from 'p-defer'

test('invite-received event has expected payload', async (t) => {
  t.plan(5)

  const { rpc: r1, projectKey, encryptionKeys } = setup()

  const projects = new Map()

  const r2 = new MapeoRPC()

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async (projectId) => {
        return projects.has(projectId)
      },
      addProject: async (invite) => {
        projects.set(invite.projectKey.toString('hex'), invite)
      },
    },
  })

  let expectedInvitorPeerId

  r2.on('peers', (peers) => {
    t.is(peers.length, 1)
    expectedInvitorPeerId = peers[0].id
  })

  r1.on('peers', (peers) => {
    t.is(peers.length, 1)

    r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys,
      projectInfo: {
        name: 'Mapeo',
      },
    })
  })

  inviteApi.on(
    'invite-received',
    async ({ peerId, projectId, projectName }) => {
      t.is(peerId, expectedInvitorPeerId)
      t.is(projectName, 'Mapeo')
      t.is(projectId, projectKey.toString('hex'))
    }
  )

  replicate(r1, r2)
})

test('Accept invite', async (t) => {
  t.plan(4)

  const { rpc: r1, projectKey, encryptionKeys } = setup()

  const projects = new Map()

  const r2 = new MapeoRPC()

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async (projectId) => {
        return projects.has(projectId)
      },
      addProject: async (invite) => {
        projects.set(invite.projectKey.toString('hex'), invite)
      },
    },
  })

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)

    const response = await r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys,
    })

    t.is(response, MapeoRPC.InviteResponse.ACCEPT)
  })

  inviteApi.on('invite-received', async ({ projectId }) => {
    t.is(projectId, projectKey.toString('hex'))

    await inviteApi.accept(projectId)

    t.ok(projects.has(projectId), 'project successfully added')
  })

  replicate(r1, r2)
})

test('Reject invite', async (t) => {
  t.plan(4)

  const { rpc: r1, projectKey, encryptionKeys } = setup()

  const projects = new Map()

  const r2 = new MapeoRPC()

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async (projectId) => {
        return projects.has(projectId)
      },
      addProject: async (invite) => {
        projects.set(invite.projectKey.toString('hex'), invite)
      },
    },
  })

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)

    const response = await r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys,
    })

    t.is(response, MapeoRPC.InviteResponse.REJECT)
  })

  inviteApi.on('invite-received', async ({ projectId }) => {
    t.is(projectId, projectKey.toString('hex'))

    await inviteApi.reject(projectId)

    t.is(projects.has(projectId), false, 'project not added')
  })

  replicate(r1, r2)
})

test('Receiving invite for project that peer already belongs to', async (t) => {
  t.test('was member prior to connection', async (t) => {
    t.plan(2)

    const { rpc: r1, projectKey, encryptionKeys } = setup()

    const r2 = new MapeoRPC()

    const inviteApi = new InviteApi({
      rpc: r2,
      queries: {
        isMember: async () => {
          return true
        },
        addProject: async () => {
          t.fail('should not add project')
        },
      },
    })

    r1.on('peers', async (peers) => {
      t.is(peers.length, 1)

      const response = await r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys,
      })

      t.is(
        response,
        MapeoRPC.InviteResponse.ALREADY,
        'invited peer automatically responds with "ALREADY"'
      )
    })

    inviteApi.on('invite-received', () => {
      t.fail('invite-received event should not have been emitted')
    })

    replicate(r1, r2)
  })

  t.test(
    'became member (somehow!) between receiving invite and accepting',
    async (t) => {
      t.plan(3)

      const { rpc: r1, projectKey, encryptionKeys } = setup()

      const r2 = new MapeoRPC()
      let isMember = false

      const inviteApi = new InviteApi({
        rpc: r2,
        queries: {
          isMember: async () => {
            return isMember
          },
          addProject: async () => {
            t.fail('should not add project')
          },
        },
      })

      r1.on('peers', async (peers) => {
        t.is(peers.length, 1)

        const response = await r1.invite(peers[0].id, {
          projectKey,
          encryptionKeys,
        })

        t.is(
          response,
          MapeoRPC.InviteResponse.ALREADY,
          'invited peer automatically responds with "ALREADY"'
        )
      })

      inviteApi.on('invite-received', async ({ projectId }) => {
        isMember = true
        await inviteApi.accept(projectId)
        t.pass('sending accept does not throw')
      })

      replicate(r1, r2)
    }
  )

  t.test('became member from accepting prior invite', async (t) => {
    t.plan(3)

    const { rpc: r1, projectKey, encryptionKeys } = setup()

    const projects = new Map()

    const r2 = new MapeoRPC()

    const inviteApi = new InviteApi({
      rpc: r2,
      queries: {
        isMember: async (projectId) => {
          return projects.has(projectId)
        },
        addProject: async (invite) => {
          projects.set(invite.projectKey.toString('hex'), invite)
        },
      },
    })

    r1.on('peers', async (peers) => {
      const response1 = await r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys,
      })

      t.is(response1, MapeoRPC.InviteResponse.ACCEPT)

      const response2 = await r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys,
      })

      t.is(response2, MapeoRPC.InviteResponse.ALREADY)
    })

    let inviteReceivedEventCount = 0

    inviteApi.on('invite-received', ({ projectId }) => {
      inviteReceivedEventCount += 1
      t.is(inviteReceivedEventCount, 1)

      inviteApi.accept(projectId)
    })

    replicate(r1, r2)
  })
})

test('trying to accept or reject non-existent invite throws', async (t) => {
  const rpc = new MapeoRPC()
  const inviteApi = new InviteApi({
    rpc,
    queries: {
      isMember: async () => {},
      addProject: async () => {},
    },
  })
  await t.exception(() => {
    return inviteApi.accept(randomBytes(32))
  })
  await t.exception(() => {
    return inviteApi.reject(randomBytes(32))
  })
})

test('invitor disconnecting results in accept throwing', async (t) => {
  t.plan(3)

  const { rpc: r1, projectKey, encryptionKeys } = setup()

  const r2 = new MapeoRPC()

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async () => false,
      addProject: async () => {
        t.fail('should not try to add project if could not accept')
      },
    },
  })

  r1.on('peers', async (peers) => {
    if (peers.length !== 1 || peers[0].status === 'disconnected') return

    await t.exception(() => {
      return r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys,
      })
    }, 'Invite fails')
  })

  inviteApi.on('invite-received', async ({ projectId }) => {
    t.is(projectId, projectKey.toString('hex'), 'received invite')
    await disconnect()
    await t.exception(() => {
      return inviteApi.accept(projectId)
    })
  })

  const disconnect = replicate(r1, r2)
})

test('invitor disconnecting results in invite reject response not throwing', async (t) => {
  t.plan(3)

  const { rpc: r1, projectKey, encryptionKeys } = setup()

  const r2 = new MapeoRPC()

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async () => {},
      addProject: async () => {},
    },
  })

  r1.on('peers', async (peers) => {
    if (peers.length !== 1 || peers[0].status === 'disconnected') return

    await t.exception(() => {
      return r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys,
      })
    }, 'invite fails')
  })

  inviteApi.on('invite-received', async ({ projectId }) => {
    t.is(projectId, projectKey.toString('hex'), 'received invite')
    await disconnect()
    await inviteApi.reject(projectId)
    t.pass()
  })

  const disconnect = replicate(r1, r2)
})

test('invitor disconnecting results in invite already response not throwing', async (t) => {
  t.plan(3)

  const { rpc: r1, projectKey, encryptionKeys } = setup()

  const r2 = new MapeoRPC()

  let isMember = false

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async () => {
        return isMember
      },
      addProject: async () => {},
    },
  })

  r1.on('peers', async (peers) => {
    if (peers.length !== 1 || peers[0].status === 'disconnected') return

    await t.exception(() => {
      return r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys,
      })
    }, 'invite fails')
  })

  inviteApi.on('invite-received', async ({ projectId }) => {
    t.is(projectId, projectKey.toString('hex'), 'received invite')
    await disconnect()
    isMember = true
    await inviteApi.accept(projectId)
    t.pass()
  })

  const disconnect = replicate(r1, r2)
})

test('addProject throwing results in invite accept throwing', async (t) => {
  t.plan(1)

  const { rpc: r1, projectKey, encryptionKeys } = setup()

  const r2 = new MapeoRPC()

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async () => {},
      addProject: async () => {
        throw new Error('Failed to add project')
      },
    },
  })

  r1.on('peers', (peers) => {
    r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys,
    })
  })

  inviteApi.on('invite-received', async ({ projectId }) => {
    t.exception(async () => {
      return inviteApi.accept(projectId)
    })
  })

  replicate(r1, r2)
})

test('Invite from multiple peers', async (t) => {
  const invitorCount = 10
  t.plan(5 + invitorCount)

  const { projectKey, encryptionKeys } = setup()
  const invitee = new MapeoRPC()
  const inviteeKeyPair = NoiseSecretStream.keyPair()

  const projects = new Map()

  const inviteApi = new InviteApi({
    rpc: invitee,
    queries: {
      isMember: async (projectId) => {
        return projects.has(projectId)
      },
      addProject: async (invite) => {
        const projectId = invite.projectKey.toString('hex')
        t.absent(projects.has(projectId), 'add project called only once')
        projects.set(projectId, invite)
      },
    },
  })

  let first
  let connected = 0
  const deferred = pDefer()

  inviteApi.on('invite-received', async ({ projectId, peerId }) => {
    t.is(projectId, projectKey.toString('hex'), 'expected project id')
    t.absent(first, 'should only receive invite once')
    first = peerId

    // Wait for all the invites to be sent before we accept
    await deferred.promise
    await inviteApi.accept(projectId)

    t.ok(projects.has(projectId), 'project successfully added')
  })

  for (let i = 0; i < invitorCount; i++) {
    const invitor = new MapeoRPC()
    const keyPair = NoiseSecretStream.keyPair()
    invitor.on('peers', async (peers) => {
      if (++connected === invitorCount) deferred.resolve()
      const response = await invitor.invite(peers[0].id, {
        projectKey,
        encryptionKeys,
      })
      if (first === keyPair.publicKey.toString('hex')) {
        t.pass('One invitor did receive accept response')
        t.is(response, MapeoRPC.InviteResponse.ACCEPT, 'accept response')
      } else {
        t.is(response, MapeoRPC.InviteResponse.ALREADY, 'already response')
      }
    })
    replicate(invitee, invitor, { kp1: inviteeKeyPair, kp2: keyPair })
  }
})

// TODO: for now this is not handled
test.skip('Invite from multiple peers, first disconnects before accepted, receives invite from next in queue', async (t) => {
  const invitorCount = 10
  t.plan(8 + invitorCount)

  const { projectKey, encryptionKeys } = setup()
  const invitee = new MapeoRPC()
  const inviteeKeyPair = NoiseSecretStream.keyPair()

  const projects = new Map()

  const inviteApi = new InviteApi({
    rpc: invitee,
    queries: {
      isMember: async (projectId) => {
        return projects.has(projectId)
      },
      addProject: async (invite) => {
        const projectId = invite.projectKey.toString('hex')
        t.absent(projects.has(projectId), 'add project called only once')
        projects.set(projectId, invite)
      },
    },
  })

  let invitesReceived = []
  let connected = 0
  const disconnects = new Map()
  const deferred = pDefer()

  inviteApi.on('invite-received', async ({ projectId, peerId }) => {
    t.is(projectId, projectKey.toString('hex'), 'expected project id')
    t.ok(invitesReceived.length < 2, 'should only receive two invites')
    invitesReceived.push(peerId)
    const isFirst = (invitesReceived.length = 1)

    // Wait for all the invites to be sent before we accept
    await deferred.promise
    if (isFirst) {
      await disconnects.get(peerId)()

      await t.exception(() => {
        return inviteApi.accept(projectId)
      }, 'accept throws')
    } else {
      await inviteApi.accept(projectId)
      t.ok(projects.has(projectId), 'project successfully added')
    }
  })

  for (let i = 0; i < invitorCount; i++) {
    const invitor = new MapeoRPC()
    const keyPair = NoiseSecretStream.keyPair()
    const invitorId = keyPair.publicKey.toString('hex')
    invitor.on('peers', async (peers) => {
      if (peers[0].status !== 'connected') return
      if (++connected === invitorCount) deferred.resolve()
      try {
        const response = await invitor.invite(peers[0].id, {
          projectKey,
          encryptionKeys,
        })
        if (invitorId === invitesReceived[1]) {
          t.pass('One invitor did receive accept response')
          t.is(response, MapeoRPC.InviteResponse.ACCEPT, 'accept response')
        } else {
          t.is(response, MapeoRPC.InviteResponse.ALREADY, 'already response')
        }
      } catch (e) {
        t.is(
          invitorId,
          invitesReceived[0],
          'first invitor invite throws because disconnected'
        )
      }
    })
    const disconnect = replicate(invitee, invitor, {
      kp1: inviteeKeyPair,
      kp2: keyPair,
    })
    disconnects.set(invitorId, disconnect)
  }
})

function setup() {
  const encryptionKeys = { auth: randomBytes(32) }
  const projectKey = KeyManager.generateProjectKeypair().publicKey
  const rpc = new MapeoRPC()

  return {
    rpc,
    projectKey,
    encryptionKeys,
  }
}
