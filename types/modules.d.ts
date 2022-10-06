// TODO: create types for these modules
declare module 'hyperswarm'
declare module '@hyperswarm/secret-stream' {
  import { Duplex as NodeDuplex } from 'stream'
  import { Duplex, DuplexEvents } from 'streamx'

  interface Opts {
    autostart?: boolean
    // TODO: Use https://github.com/chm-diederichs/noise-handshake/blob/main/noise.js for specific patterns
    pattern?: string
    remotePublicKey?: Buffer
    keyPair?: { publicKey: Buffer; secretKey: Buffer }
    handshake?: {
      tx: Buffer
      rx: Buffer
      hash: Buffer
      publicKey: Buffer
      remotePublicKey: Buffer
    }
  }

  type NoiseStreamEvents = {
    connect: () => void
  }

  class NoiseSecretStream<
    RawStream extends NodeDuplex | Duplex = Duplex
  > extends Duplex<
    any,
    any,
    any,
    any,
    true,
    true,
    DuplexEvents<any, any> & NoiseStreamEvents
  > {
    readonly publicKey: Buffer
    readonly remotePublicKey: Buffer
    readonly handshakeHash: Buffer
    readonly rawStream: RawStream
    readonly isInitiator: boolean
    readonly noiseStream: this
    readonly opened: Promise<boolean>
    readonly userData: any

    constructor(isInitiator: boolean, rawStream?: RawStream, opts?: Opts)

    static keyPair(seed?: Buffer): {
      publicKey: Buffer
      secretKey: Buffer
    }

    start(rawStream?: NodeDuplex, opts?: Opts): void
    setTimeout(ms?: number): void
    setKeepAlive(ms?: number): void
  }

  export = NoiseSecretStream
}
declare module '@hyperswarm/testnet'
declare module 'base32.js'
declare module '@mapeo/crypto'
declare module 'hypercore'
declare module 'corestore'
declare module 'random-access-memory'
declare module 'random-access-file'
declare module 'randombytes'
declare module 'b4a'
