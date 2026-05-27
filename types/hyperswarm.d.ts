declare module 'hyperswarm' {
  import { TypedEmitter } from 'tiny-typed-emitter'
  import NoiseSecretStream from '@hyperswarm/secret-stream'

  interface PeerInfo {
    publicKey: Buffer
    topics: Buffer[]
    ban(banStatus: boolean)
  }

  interface Keypair {
    publicKey: Buffer
    secretKey: Buffer
  }

  interface SwarmEvents {
    connection(socket: NoiseSecretStream, PeerInfo: PeerInfo): void
  }

  interface SwarmOpts {
    keyPair?: Keypair
    maxPeers?: number
    dht?: HyperDHT
  }

  export default class Hyperswarm extends TypedEmitter<SwarmEvents> {
    constructor(swarmOpts: SwarmOpts)
    get peers(): Map<string, PeerInfo>
    get connections(): Set<NoiseSecretStream>
    listen(): Promise<void>
    flush(): Promise<void>
    suspend(): Promise<void>
    resume(): Promise<void>
    destroy(): Promise<void>
    joinPeer(noisePublicKey: Buffer): void
    leavePeer(noisePublicKey: Buffer): void
    join(
      topic: Buffer,
      opts?: { limit?: number; client?: boolean; server?: boolean }
    ): PeerDiscovery
    leave(topic: Buffer): void
  }

  export class PeerDiscovery {
    flushed(): Promise<void>
    refresh({ client: boolean, server: boolean }): Promise<void>
    destroy(): Promise<void>
  }
}

declare module 'hyperdht' {
  export default class HyperDHT {}
}

declare module 'hyperdht/testnet.js' {
  interface TestnetOpts {
    teardown?: TestnetTearDownFn
    host?: string
    port?: number
  }

  type TestnetTearDownFn = (
    opts: TestnetOpts,
    onFinishTeardown: () => Promise<void>
  ) => void | Promise<void>

  class TestNet {
    nodes: HyperDHT[]
    bootstrap: string[]
    destroy(): Promise<void>
  }

  export default function createTestnet(
    size?: number,
    opts?: TestnetOpts | TestnetTearDownFn
  ): Promise<TestNet>
}
