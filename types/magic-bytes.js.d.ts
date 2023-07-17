// Augment definition as in https://github.com/LarsKoelpin/magic-bytes/commit/57e40c8ce6b6ceaf7ff07cc557861cf042857c7d
// Has not yet been published to npm
declare module 'magic-bytes.js' {
  export const filetypename: (
    bytes: number[] | Uint8Array | Uint8ClampedArray
  ) => string[]
  export const filetypemime: (
    bytes: number[] | Uint8Array | Uint8ClampedArray
  ) => string[]
  export const filetypeextension: (
    bytes: number[] | Uint8Array | Uint8ClampedArray
  ) => string[]
}
