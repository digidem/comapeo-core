// TODO: create types for these modules

// The following are defined in lib/types.js:
// - KeyPair
// - DHTNode

type IdentifiedDHTNode = DHTNode & {
  id: Buffer
}

declare module 'hyperswarm'
declare module 'udx-native' {
  import EventEmitter from 'events'
  import { Duplex } from 'streamx'

  // https://github.com/hyperswarm/libudx/blob/e8cdf8f6edb598b7617784867087a69f958d84c3/lib/network-interfaces.js
  export class NetworkInterfaces extends EventEmitter {
    readonly interfaces: {
      name: string
      host: string
      family: number
      internal: boolean
    }[]

    // TODO: Does using `this` work?
    watch(): NetworkInterfaces
    // TODO: Does using `this` work?
    unwatch(): NetworkInterfaces
    destroy(): Promise<void>

    // TODO: Have no idea if this actually works
    [Symbol.iterator](): NetworkInterfaces['interfaces'][typeof Symbol.iterator]
  }

  // https://github.com/hyperswarm/libudx/blob/e8cdf8f6edb598b7617784867087a69f958d84c3/lib/socket.js
  export class UDXSocket extends EventEmitter {
    readonly udx: UDX
    readonly streams: Set<UDXStream>

    constructor(udx: UDX)

    static isIPv4(host: string): boolean
    static isIPv6(host: string): boolean
    static isIP(host: string): boolean

    get bound(): boolean
    get closing(): boolean
    get idle(): boolean
    get busy(): boolean

    address(): { host: string | null; family: number; port: number }
    bind(port?: number, host?: number): void
    close(): Promise<boolean | undefined>
    setTTL(ttl: number): void
    getRecvBufferSize(): number
    setRecvBufferSize(size: number): null
    getSendBufferSize(): number
    setSendBufferSize(size: number): number
    send(
      buffer: Buffer,
      port: number,
      host?: string,
      ttl?: number
    ): Promise<boolean | undefined>
    trySend(buffer: Buffer, port: number, host?: string, ttl?: number): void
  }

  // https://github.com/hyperswarm/libudx/blob/e8cdf8f6edb598b7617784867087a69f958d84c3/lib/stream.js
  class UDXStream extends Duplex {
    readonly udx: UDX
    readonly socket: UDXSocket | null

    constructor(
      udx: UDX,
      id: number,
      opts?: {
        firewall?: (socket: UDXSocket, port: number, host: string) => boolean
        framed?: boolean
        seq?: number
      }
    )

    get connected(): boolean
    get mtu(): number
    get rtt(): number
    get cwnd(): number
    get inflight(): number
    get localhost(): string | null
    get localFamily(): number
    get localPort(): number

    setInteractive(bool: boolean): void
    setMTU(mtu: number): void
    connect(
      socket: UDXSocket,
      remoteId: number,
      port: number,
      host?: string | { ack?: number },
      opts?: { ack?: number }
    ): void
    relayTo(destination: Buffer): void
    send(buffer: Buffer): Promise<void>
    trySend(buffer: Buffer): void
  }

  // https://github.com/hyperswarm/libudx/blob/e8cdf8f6edb598b7617784867087a69f958d84c3/lib/udx.js
  class UDX {
    createSocket(): UDXSocket
    createStream(id: Buffer, opts?: {}): UDXStream
    networkInterfaces(): NetworkInterfaces['interfaces']
    watchNetworkInterfaces(
      onchange?: (interfaces: NetworkInterfaces['interfaces']) => void
    ): NetworkInterfaces
    lookup(
      host: string,
      opts?: { family?: number }
    ): Promise<{ host: string; family: number }>
  }

  export default UDX
}
declare module 'dht-rpc' {
  import { EventEmitter, Readable } from 'stream'
  import UDX, { NetworkInterfaces, UDXSocket } from 'udx-native'

  // TODO: See `kademlia-routing-table`
  class Table {}
  // TODO: See `time-ordered-set`
  class TOS {}

  // TODO: Potentially incomplete?
  type Reply = {
    error: number
    closerNodes: IdentifiedDHTNode[]
    from: IdentifiedDHTNode
  }

  export interface QueryOpts {
    map?: <R extends Reply>(reply: Reply) => R
    concurrency?: number
    maxSlow?: number
    commit?:
      | boolean
      | ((reply: Reply, dht: DHT, query: Query) => Promise<Request>)
    nodes?: IdentifiedDHTNode[]
    closestNodes?: IdentifiedDHTNode[]
    replies?: Reply[]
    closestReplies?: Reply[]
  }

  // https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/lib/query.js
  export class Query extends Readable {
    readonly dht: DHT
    readonly k: number
    readonly target: Buffer
    readonly internal: boolean
    readonly command: Buffer
    readonly value: Buffer | null
    readonly errors: number
    readonly successes: number
    readonly concurrency: number
    readonly inflight: number
    readonly map: <R extends Reply>(reply: Reply) => R
    readonly maxSlow: number
    readonly closestReplies: Reply[]

    constructor(
      dht: DHT,
      target: Buffer,
      internal: boolean,
      command: Buffer,
      value: Buffer | null,
      opts?: QueryOpts
    )

    get closestNodes(): IdentifiedDHTNode[]
    finished(): Promise<void>
  }

  // https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/lib/io.js#L376
  class CongestionWindow {
    constructor(maxWindow: number)

    isFull(): boolean
    recv(): void
    send(): void
    drain(): void
  }

  // TODO: Unsure, based on https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/lib/io.js#L62-L80
  interface Response {
    tid: number
    from: { id: null; host: string; port: number }
    to: IdentifiedDHTNode
    token: Buffer
    closerNodes: IdentifiedDHTNode[]
    error: number
    value: Buffer
  }

  // https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/lib/io.js#L214
  class Request {
    constructor(
      io: IO,
      socket: UDXSocket,
      tid: number,
      from: IdentifiedDHTNode,
      to: IdentifiedDHTNode,
      token: Buffer | null,
      internal: boolean,
      command: Buffer,
      target: Buffer | null,
      value: Buffer | null
    )

    static decode(
      io: IO,
      socket: UDXSocket,
      from: IdentifiedDHTNode,
      state: {
        start: number
        end: number
      }
    ): Request | null

    reply(
      value: Buffer | null,
      opts?: {
        to?: IdentifiedDHTNode
        from?: IdentifiedDHTNode
        socket?: UDXSocket
        token?: Buffer | null | boolean
        closerNodes?: IdentifiedDHTNode[] | boolean
      }
    ): void
    error(
      code: number,
      opts?: {
        to?: IdentifiedDHTNode
        from?: IdentifiedDHTNode
        socket?: UDXSocket
        token?: Buffer | boolean
        closerNodes?: IdentifiedDHTNode[] | boolean
      }
    ): void
    relay(
      value: Buffer | null,
      to: IdentifiedDHTNode,
      opts?: {
        socket: UDXSocket
      }
    ): void
    send(force?: boolean): void
    sendReply(
      error: number,
      value: Buffer,
      token: Buffer,
      hasCloserNodes: boolean
    ): void
    destroy(): void
  }

  class IO {
    readonly table: Table
    readonly udx: UDX
    readonly inflight: []
    readonly clientSocket: UDXSocket | null
    readonly serverSocket: UDXSocket | null
    readonly firewalled: boolean
    readonly ephemeral: boolean
    readonly congestion: CongestionWindow
    readonly networkInterfaces: NetworkInterfaces
    readonly onrequest: (req: Request, external: boolean) => void
    readonly onresponse: (res: Response, external: boolean) => void
    readonly ontimeout: (req: Request) => void

    constructor(
      table: Table,
      udx: UDX,
      opts?: {
        maxWindow?: number
        port?: number
        host?: string
        anyPort?: boolean
        firewalled?: boolean
        onrequest?: (req: Request, external: boolean) => void
        onresponse?: (res: Response, external: boolean) => void
        ontimeout?: (req: Request) => void
      }
    )

    onmessage(
      socket: UDXSocket,
      buffer: Buffer,
      addr: { host: string; port: number }
    ): void
    token(addr: { host: string; port: number }, i: number): Buffer
    destroy(): Promise<void>
    bind(): Promise<void>
    createRequest(
      to: IdentifiedDHTNode,
      token: Buffer | null,
      internal: boolean,
      command: Buffer,
      target: Buffer | null,
      value: Buffer | null
    ): Request
  }

  interface DHTOpts {
    id?: Buffer
    udx?: UDX
    bootstrap?: DHTNode[]
    concurrency?: number
    ephemeral?: boolean
    adaptive?: boolean
    port?: number
    host?: number
    quickFirewall?: boolean
    addNode?: boolean
    nodes?: DHTNode[]
  }

  // https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/index.js
  class DHT extends EventEmitter {
    readonly bootstrapNodes: DHTNode[]
    readonly table: Table
    readonly nodes: TOS
    readonly udx: UDX
    readonly io: IO
    readonly concurrency: boolean
    readonly bootstrapped: boolean
    readonly ephemeral: boolean
    readonly firewalled: boolean
    readonly adaptive: boolean
    readonly destroyed: boolean

    constructor(opts?: DHTOpts)

    static bootstrapper(port: number, host: string, opts?: DHTOpts): DHT

    get id(): Buffer | null
    get host(): string | null
    get port(): number
    get socket(): UDXSocket

    onmessage(socket: UDXSocket, buf: Buffer, rinfo: DHTNode): void
    bind(): Promise<void>
    address(): string | null
    addNode(node: DHTNode): void
    toArray(): DHTNode[]
    ready(): Promise<void>
    findNode(target: Buffer, opts?: QueryOpts): Query
    query(params: {
      target: Buffer
      command: Buffer
      value: Buffer | null
    }): Query
    ping(
      addr: { host: string; port: number },
      opts?: {
        socket?: UDXSocket
        retry?: boolean
      }
    ): Promise<Response>
    request(
      params: {
        token?: Buffer | null
        command: Buffer
        target: Buffer | null
        value: Buffer | null
      },
      addr: { host: string; port: number },
      opts?: {
        socket?: UDXSocket
        retry?: boolean
      }
    ): Promise<Response>
    refresh(): void
    destroy: IO['destroy']
    onrequest(req: Request): void
  }

  export default DHT
}
declare module '@hyperswarm/dht' {
  import { EventEmitter } from 'stream'
  import { Query, QueryOpts } from 'dht-rpc'
  import SecretStream from '@hyperswarm/secret-stream'

  interface HandshakePayload {
    isInitiator: boolean
    publicKey: Buffer
    remotePublicKey: Buffer
    remoteId: Buffer
    hash: Buffer
    rx: Buffer
    tx: Buffer
  }

  interface ServerOpts {
    onconnection?: (encryptedSocket: SecretStream) => void
    firewall?: (
      remotePublicKey: Buffer,
      remoteHandshakePayload: HandshakePayload
    ) => boolean | Promise<boolean>
  }

  // TODO: Incomplete
  // https://github.com/hyperswarm/dht/blob/4190b7505c365ef8a6ad607fc3862780c65eb482/lib/server.js
  interface Server extends EventEmitter {
    constructor: (dht: DHT, opts: any) => Server

    listen: (keyPair?: KeyPair) => Promise<void>
    address: () => {
      host: string
      port: number
      publicKey: Buffer
    }
    publicKey: Buffer
    close: () => Promise<void>
    closed: boolean
    on: ((
      event: 'connection',
      listener: (encryptedSocket: SecretStream) => void
    ) => this) &
      ((event: 'listening', listener: () => void) => this) &
      ((event: 'close', listener: () => void) => this) &
      ((event: string | symbol, listener: (...args: any[]) => void) => this)
  }

  export interface DHTOpts {
    keyPair?: KeyPair
    port?: number
    bootstrap?: { host: string; port: number }[]
    maxSize?: number
    maxAge?: number
    seed?: Buffer
    debug?: {
      handshake?: {
        latency?: number
      }
      // TODO: Use definition from https://github.com/digidem/mapeo-core-next/pull/34 when merged
      stream?: SecretStream
    }
  }

  // TODO: Incomplete
  // https://github.com/hyperswarm/dht/blob/4190b7505c365ef8a6ad607fc3862780c65eb482/index.js
  class DHT {
    readonly defaultKeyPair: KeyPair
    readonly destroyed: boolean
    readonly listening: Server[]

    constructor(opts?: DHTOpts)

    static keyPair: (seed?: Buffer) => KeyPair
    static create: (opts: DHTOpts & { relays?: string[] }) => Promise<DHT>
    static hash(data: Buffer): Buffer

    connect(
      remotePublicKey: Buffer,
      options?: { nodes: DHTNode[]; keyPair: KeyPair }
    ): SecretStream
    createServer(
      options?: ServerOpts | ((encryptedSocket: SecretStream) => void),
      onconnection?: (encryptedSocket: SecretStream) => void
    ): Server
    destroy(opts?: { force?: boolean }): Promise<void>
    findPeer(publicKey: Buffer, opts?: QueryOpts): Query
    lookup(target: Buffer, options?: QueryOpts): Query
    lookupAndUnannounce(
      target: Buffer,
      keyPair: KeyPair,
      opts?: QueryOpts & {
        // TODO: Maybe incomplete
        signUnannounce?: (
          target: Buffer,
          token: Buffer,
          id: Buffer,
          ann: {
            peer: {
              publicKey: Buffer
              // TODO: Not sure what this is supposed to be
              relayAddresses: any[]
            }
            signature: Buffer | null
          },
          secretKey: Buffer
        ) => Buffer
      }
    ): Query
    unannounce(
      target: Buffer,
      keyPair: KeyPair,
      opts?: QueryOpts
    ): Promise<void>
    announce: (
      target: Buffer,
      keyPair: KeyPair,
      relayAddresses: any[],
      opts?: QueryOpts & {
        // TODO: Maybe incomplete
        signAnnounce?: (
          target: Buffer,
          token: Buffer,
          id: Buffer,
          ann: {
            peer: {
              publicKey: Buffer
              // TODO: Not sure what this is supposed to be
              relayAddresses: any[]
            }
            refresh: null
            signature: Buffer | null
          },
          secretKey: Buffer
        ) => Buffer
      }
    ) => Query
  }

  export default DHT
}
declare module '@hyperswarm/testnet' {
  import DHT, { DHTOpts } from '@hyperswarm/dht'

  class Testnet {
    readonly nodes: DHT[]
    readonly bootstrap: DHTNode[]

    constructor(nodes: DHT[], bootstrap: DHTNode[])

    createNode(opts: DHTOpts): DHT
    destroy(): Promise<void>
    // TODO: Not sure if this actually works
    [Symbol.iterator](): Testnet['nodes'][typeof Symbol.iterator]
  }

  function createTestnet(
    size: number,
    opts?:
      | (() => Promise<void>)
      | {
          host?: string
          port?: number
          teardown?: () => Promise<void>
        }
  ): Promise<Testnet>

  export = createTestnet
}
declare module '@hyperswarm/secret-stream' {
  import { Duplex as NodeDuplex } from 'stream'
  import { Duplex, DuplexEvents } from 'streamx'

  interface Opts {
    autostart?: boolean
    // TODO: Use https://github.com/chm-diederichs/noise-handshake/blob/main/noise.js for specific patterns
    pattern?: string
    remotePublicKey?: Buffer
    keyPair?: KeyPair
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

    static keyPair(seed?: Buffer): KeyPair

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
declare module 'random-access-storage' {
  import EventEmitter from 'events'

  type Cb<T> = (err: any, val?: T) => void

  class Request {
    readonly type: number
    readonly offset: number
    readonly size: number
    readonly data: Buffer
    readonly storage: RandomAccessStorage

    constructor(
      self: RandomAccessStorage,
      type: number,
      offset: number,
      size: number,
      data: Buffer,
      cb: Cb<any>
    )

    callback: Cb<any>
  }

  class RandomAccessStorage extends EventEmitter {
    readonly opened: boolean
    readonly suspended: boolean
    readonly closed: boolean
    readonly unlinked: boolean
    readonly writing: boolean
    readonly readable: boolean
    readonly writable: boolean
    readonly deletable: boolean
    readonly truncatable: boolean
    readonly statable: boolean

    constructor(opts?: {
      open?: boolean
      read?: boolean
      write?: boolean
      del?: boolean
      truncate?: boolean
      stat?: boolean
      suspend?: boolean
      close?: boolean
      unlink?: boolean
    })

    read(offset: number, size: number, cb: Cb<any>): void
    write(offset: number, data: Buffer, cb?: Cb<any>): void
    del(offset: number, size: number, cb?: Cb<any>): void
    truncate(offset: number, cb?: Cb<any>): void
    stat(cb: Cb<any>): void
    open(cb?: Cb<any>): void
    suspend(cb?: Cb<any>): void
    close(cb?: Cb<any>): void
    unlink(cb?: Cb<any>): void
    run(req: Request, writing?: boolean): void
  }

  export = RandomAccessStorage
}
declare module 'random-access-memory' {
  import RandomAccessStorage from 'random-access-storage'

  class RandomAccessMemory extends RandomAccessStorage {
    readonly length: number
    readonly pageSize: number
    readonly buffers: Buffer[]

    constructor(
      opts?:
        | number
        | Buffer
        | { length?: number; buffer?: Buffer; pageSize?: number }
    )

    toBuffer(): Buffer
    clone(): RandomAccessMemory
  }

  export = RandomAccessMemory
}
declare module 'random-access-file'
declare module 'randombytes'
declare module 'b4a'
