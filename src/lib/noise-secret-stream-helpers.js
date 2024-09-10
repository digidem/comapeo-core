/** @import { Duplex as NodeDuplex } from 'node:stream' */
/** @import { Duplex as StreamxDuplex } from 'streamx' */
/** @import NoiseSecretStream from '@hyperswarm/secret-stream' */

/**
 * @internal
 * @typedef {NodeDuplex | StreamxDuplex} RawStream
 */

/**
 * @template {RawStream} [T=RawStream]
 * @typedef {NoiseSecretStream<T> & { destroyed: true }} DestroyedNoiseStream
 */

/**
 * @template {RawStream} [T=RawStream]
 * @typedef {NoiseSecretStream<T> & {
 *   publicKey: Buffer,
 *   remotePublicKey: Buffer,
 *   handshake: Buffer,
 *   destroyed: false
 * }} OpenedNoiseStream
 */

/**
 * Utility to await a NoiseSecretStream to open, that returns a stream with the
 * correct types for publicKey and remotePublicKey (which can be null before
 * stream is opened)
 *
 * @template {RawStream} T
 * @param {NoiseSecretStream<T>} stream
 * @returns {Promise<OpenedNoiseStream<T> | DestroyedNoiseStream<T>>}
 */
export async function openedNoiseSecretStream(stream) {
  await stream.opened
  return /** @type {OpenedNoiseStream<T> | DestroyedNoiseStream<T>} */ (stream)
}
