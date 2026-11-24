declare module 'hypercore-crypto' {
  export function discoveryKey(publicKey: Buffer | Uint8Array): Buffer
  export function namespace(
    name: string | Buffer | Uint8Array,
    count: number | number[]
  ): Buffer[]
}
