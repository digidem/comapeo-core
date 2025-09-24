import ensureError from 'ensure-error'
import { workerData, parentPort } from 'worker_threads'
import { IndexWriter } from './index-writer.js'
import { Logger } from '../logger.js'
import Database from 'better-sqlite3'

/** @import {WorkerRequest, BatchRequestData, DeleteSchemaRequestData, BatchResponseData, DeleteSchemaResponseData, WorkerData, WorkerResponse} from './index-writer-proxy.js' */

const { schemas, dbPath, parentLoggerNamespace, deviceId } =
  /** @type {WorkerData} */ (workerData)

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode=WAL')

const indexWriter = new IndexWriter({
  schemas,
  sqlite,
  logger: new Logger({
    ns: parentLoggerNamespace,
    deviceId: deviceId || '<unknown>',
  }),
})

if (!parentPort) {
  throw new Error('This module must be run in a worker thread.')
}

parentPort.on('message', handleMessage)

/**
 * @param {WorkerRequest<'batch', BatchRequestData> | WorkerRequest<'deleteSchema', DeleteSchemaRequestData>} msg
 * @returns {Promise<void>}
 */
async function handleMessage({ id, type, data }) {
  if (!parentPort) {
    throw new Error('This module must be run in a worker thread.')
  }
  try {
    switch (type) {
      case 'batch': {
        // Need to convert b
        for (const item of data) {
          item.block = Buffer.from(item.block)
        }
        const result = await indexWriter.batch(data)
        /** @type {WorkerResponse<BatchResponseData>} */
        const msg = { id, data: result }
        parentPort.postMessage(msg)
        return
      }
      case 'deleteSchema': {
        await indexWriter.deleteSchema(data)
        /** @type {WorkerResponse<DeleteSchemaResponseData>} */
        const msg = { id, data: null }
        parentPort.postMessage(msg)
        return
      }
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    parentPort.postMessage({
      id,
      error: ensureError(error).message,
      errorStack: ensureError(error).stack,
    })
  }
}
