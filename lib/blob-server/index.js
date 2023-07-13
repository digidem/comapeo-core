// @ts-check
import http from 'node:http'
import assert from 'node:assert'
import { filetypemime } from 'magic-bytes.js'
import { SUPPORTED_BLOB_TYPES } from '../blob-store/index.js'

/** @typedef {import('../blob-store').BlobId} BlobId */
/** @typedef {Error & { statusCode: number }} HttpError */

export class BlobServer {
  #server
  #blobStore

  /**
   * @param {object} opts
   * @param {import('../blob-store').BlobStore} opts.blobStore
   */
  constructor({ blobStore }) {
    this.#blobStore = blobStore
    this.#server = http.createServer(this.requestHandler)
  }

  /**
   * Start the blob server listening for requests
   *
   * @param {number} [port] Defaults to `0` e.g. randomly selected port
   * @param {string} [hostname] Network interface to listen on, defaults to 127.0.0.1 (e.g. only local)
   */
  async listen(port = 0, hostname = '127.0.0.1') {
    return listenPromise(this.#server, port, hostname)
  }

  /**
   * Stop the blob server from listening for new requests (existing requests will complete)
   *
   * @returns {Promise<void>}
   */
  async close() {
    return new Promise((resolve) => {
      this.#server.close(() => {
        resolve()
      })
    })
  }

  /** @type {import('node:http').RequestListener} */
  async requestHandler(req, res) {
    try {
      assert(req.method === 'GET', 'Invalid Request')
      const blobId = parseRequestParams(req)

      const entry = await this.#blobStore.entry(blobId)
      const { blob, metadata } = entry.value

      const drive = this.#blobStore.getDrive(blobId.driveId)
      const blobs = await drive.getBlobs()

      const blobsStream = blobs.createReadStream(blob)

      // Extract the 'mime' property of the metadata and use it for the response header if found
      if (metadata && 'mime' in metadata && typeof metadata.mime === 'string') {
        res.setHeader('Content-Type', metadata.mime)
      } else {
        // Attempt to guess the MIME type based on the blob contents
        const blobSlice = await blobs.get(entry.value.blob, {
          start: 0,
          length: 10,
        })

        const [guessedMime] = filetypemime(Array.from(blobSlice))

        res.setHeader('Content-Type', guessedMime || 'application/octet-stream')
      }

      blobsStream.pipe(res)
    } catch (err) {
      this.#errorHandler(res, err)
    }
  }

  /**
   *
   * @param {import('node:http').ServerResponse} res
   * @param {HttpError} error
   */
  #errorHandler(res, error) {
    res.statusCode = error.statusCode || 500
    res.end()
  }
}

/**
 *
 * @param {import('node:http').IncomingMessage} req
 * @returns {BlobId}
 */
function parseRequestParams(req) {
  assert(typeof req.url === 'string', 'Invalid Request')
  const url = new URL(req.url, `http://${req.headers.host}`)
  const params = url.pathname.slice(1).split('/')
  assert(params.length === 4, 'Invalid Request')
  const [driveId, type, variant, name] = params
  assert(type in SUPPORTED_BLOB_TYPES, 'Invalid Request')
  // @ts-ignore
  assert(SUPPORTED_BLOB_TYPES[type].includes(variant), 'Invalid Request')
  return /** @type {BlobId} */ ({
    driveId,
    type,
    variant,
    name,
  })
}

/**
 *
 * @param {import('node:http').Server} server
 * @param {number} [port]
 * @param {string} [hostname]
 * @returns
 */
function listenPromise(server, port, hostname) {
  /** @type {(err: Error) => void} */
  let errEventHandler
  /** @type {Promise<void>} */
  const errEvent = new Promise((resolve, reject) => {
    errEventHandler = (err) => {
      reject(err)
    }
    server.once('error', errEventHandler)
  })
  /** @type {Promise<void>} */
  const listen = new Promise((resolve) => {
    server.listen(port, hostname, () => {
      server.removeListener('error', errEventHandler)
      resolve()
    })
  })

  return Promise.race([
    errEvent, // e.g invalid port range error is always emitted before the server listening
    listen,
  ])
}
