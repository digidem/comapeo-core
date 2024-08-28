declare module 'protomux' {
  import { Duplex } from 'streamx'
  import { Duplex as NodeDuplex } from 'stream'

  interface PreEncodingState {
    buffer: null
    start: number
    end: number
  }

  interface EncodingState {
    buffer: null | Buffer
    start: number
    end: number
  }

  interface Encoding {
    preencode(state: PreEncodingState, value: any): void
    encode(state: EncodingState, value: any): void
    decode(state: EncodingState): any
  }

  interface Message {
    type: number
    send(msg: any): void
    onmessage: (message: any) => void
    encoding: Encoding
  }

  type MessageOptions = Partial<Pick<Message, 'onmessage' | 'encoding'>>

  interface Channel {
    open(handshake?: any): void
    userData: any
    protocol: string
    id: Buffer
    messages: Message[]
    opened: boolean
    closed: boolean
    destroyed: boolean
    cork(): void
    uncork(): void
    close(): void
    addMessage(opts?: MessageOptions): Message
  }

  class Protomux<TStream extends Duplex | NodeDuplex = Duplex> {
    constructor(stream: TStream)
    [Symbol.iterator](): IterableIterator<Channel>
    isProtomux: true
    stream: TStream
    static from(stream: TStream): Protomux<TStream>
    static isProtomux(mux: unknown): mux is Protomux
    cork(): void
    uncork(): void
    pair(
      opts: { protocol: string; id?: null | Buffer },
      notify: (id: Buffer) => Promise<void>
    ): void
    unpair(opts: { protocol: string; id?: null | Buffer }): void
    opened(opts: { protocol: string; id?: null | Buffer }): boolean
    createChannel(opts: {
      userData?: any
      protocol: string
      aliases?: string[]
      id?: null | Buffer
      unique?: boolean
      handshake?: Encoding
      messages: MessageOptions[]
      onopen?(handshake?: any): Promise<void> | void
      onclose?(): Promise<void> | void
      ondestroy?(): Promise<void> | void
    }): Channel
    destroy(err: Error): void
  }

  export = Protomux
}
