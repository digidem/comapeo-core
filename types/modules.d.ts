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

  class SecretStream<
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
    public publicKey: Buffer
    public remotePublicKey: Buffer
    public handshakeHash: Buffer
    public rawStream: RawStream
    public isInitiator: boolean
    public noiseStream: this
    public opened: Promise<boolean>
    public userData: any

    constructor(isInitiator: boolean, rawStream?: RawStream, opts?: Opts)

    static keyPair(seed?: Buffer): {
      publicKey: Buffer
      secretKey: Buffer
    }

    public start(rawStream?: NodeDuplex, opts?: Opts): void

    public setTimeout(ms?: number): void

    public setKeepAlive(ms?: number): void
  }

  export = SecretStream
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
