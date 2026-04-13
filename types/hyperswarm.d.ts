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
  export default class Hyperswarm extends TypedEmitter<SwarmEvents> {
    constructor({ keyPair: Keypair, maxPeers: number })
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
