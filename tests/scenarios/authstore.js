export const authstoreScenarios = [
  {
    name: 'make peer2 a member',
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
      },
      {
        action: 'updateCapability',
        peer: 'peer1',
        data: {
          type: 'capabilities',
          capability: 'member',
          identityPublicKey: 'peer2',
        },
      },
    ],
  },
  {
    name: 'make peer2 a coordinator',
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
      },
      {
        action: 'updateCapability',
        peer: 'peer1',
        data: {
          type: 'capabilities',
          capability: 'coordinator',
          identityPublicKey: 'peer2',
        },
      },
    ],
  },
]
