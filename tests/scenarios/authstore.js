export const scenarios = [
  {
    name: 'make peer2 a member, then update to coordinator',
    peers: ['peer1', 'peer2'],
    steps: [
      {
        action: 'createCapability',
        peer: 'peer1',
        data: {
          type: 'capabilities',
          capability: 'creator',
          identityPublicKey: 'peer1',
        },
        check: async (t, peer, data) => {
          const capabilities = await peer.authstore.getCapabilities(
            data.identityPublicKey
          )
          t.is(
            capabilities.length,
            1,
            'peer1 should have 1 capabilities statements'
          )
          t.is(
            capabilities[0].capability,
            'creator',
            'peer1 should have creator capability'
          )
        },
      },
      {
        action: 'createCapability',
        peer: 'peer1',
        data: {
          type: 'capabilities',
          capability: 'member',
          identityPublicKey: 'peer2',
        },
        check: async (t, peer, data) => {
          const capabilities = await peer.authstore.getCapabilities(
            data.identityPublicKey
          )
          t.is(
            capabilities.length,
            1,
            'peer2 should have 1 capabilities statements'
          )
          t.is(
            capabilities[0].capability,
            'member',
            'peer2 should have member capability'
          )
        },
      },
      {
        action: 'updateCapability',
        peer: 'peer1',
        data: {
          type: 'capabilities',
          capability: 'coordinator',
          identityPublicKey: 'peer2',
        },
        check: async (t, peer, data) => {
          const capabilities = await peer.authstore.getCapabilities(
            data.identityPublicKey
          )
          t.is(
            capabilities.length,
            1,
            'peer2 should have 1 capabilities statements'
          )
          t.is(
            capabilities[0].capability,
            'coordinator',
            'peer2 should have coordinator capability'
          )
        },
      },
    ],
  },
  {
    name: 'creator makes peer2 a coordinator, peer2 makes peer3 a coordinator, creator makes peer3 a member',
    peers: ['creator', 'peer2', 'peer3'],
    steps: [
      {
        action: 'createCapability',
        peer: 'creator',
        data: {
          type: 'capabilities',
          capability: 'coordinator',
          identityPublicKey: 'peer2',
        },
        check: async (t, peer, data) => {
          const capabilities = await peer.authstore.getCapabilities(
            data.identityPublicKey
          )
          t.is(
            capabilities.length,
            1,
            'peer2 should have 1 capabilities statements'
          )
          t.is(
            capabilities[0].capability,
            'coordinator',
            'peer2 should have coordinator capability'
          )
        },
      },
      {
        action: 'createCapability',
        peer: 'peer2',
        data: {
          type: 'capabilities',
          capability: 'coordinator',
          identityPublicKey: 'peer3',
        },
        check: async (t, peer, data) => {
          const capabilities = await peer.authstore.getCapabilities(
            data.identityPublicKey
          )
          t.is(
            capabilities.length,
            1,
            'peer3 should have 1 capabilities statements'
          )
          t.is(
            capabilities[0].capability,
            'coordinator',
            'peer3 should have coordinator capability'
          )
        },
      },
      {
        action: 'createCapability',
        peer: 'creator',
        data: {
          type: 'capabilities',
          capability: 'member',
          identityPublicKey: 'peer3',
        },
        check: async (t, peer, data) => {
          const capabilities = await peer.authstore.getCapabilities(
            data.identityPublicKey
          )
          t.is(
            capabilities.length,
            1,
            'peer3 should have 1 capabilities statements'
          )
          t.is(
            capabilities[0].capability,
            'member',
            'peer3 should have member capability'
          )
        },
      },
    ],
  },
]
