import bench from 'nanobench'
import {
  PeerState,
  deriveState,
} from '../src/core-manager/core-replication-state.js'
import RemoteBitfield from '../src/core-manager/remote-bitfield.js'
import createRandom from 'math-random-seed'

bench('deriveState x 1,000; 10 peers; 10,000 blocks', function (b) {
  const length = 10000
  const remotePeers = new Map()
  for (let i = 0; i < 10; i++) {
    remotePeers.set(i, createPeer(length, i + ''))
  }
  const localPeer = createPeer(length, 'local')

  const state = {
    length,
    localState: localPeer,
    remoteStates: remotePeers,
  }

  b.start()
  for (let i = 0; i < 1000; i++) {
    deriveState(state)
  }
  b.end()
})

function createPeer(length, seed) {
  const peer = new PeerState()
  peer.setHavesBitfield(createBitfield(length, seed))
  return peer
}

function createBitfield(length, seed) {
  const random = createRandom(seed)
  const b = new RemoteBitfield()
  let i = random() < 0.5 ? 0 : Math.ceil(random() * 200)
  while (i < length) {
    const length = Math.ceil(random() * 200)
    b.setRange(i, length, true)
    i += length + Math.ceil(random() * 200)
  }
  return b
}
