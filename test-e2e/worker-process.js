import { createMapeoServer } from '@comapeo/ipc'
import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import * as process from 'node:process'
import { isMainThread, MessagePort, workerData } from 'node:worker_threads'
import { MapeoManager } from '../src/mapeo-manager.js'

/**
 * @internal
 * @typedef {ConstructorParameters<typeof MapeoManager>[0]} MapeoManagerConstructorOptions
 */

const mapeoManagerConstructorOptionsType = Type.Partial(
  Type.Object({
    rootKey: Type.Uint8Array(),
    dbFolder: Type.String(),
    coreStorage: Type.String(),
    projectMigrationsFolder: Type.String(),
    clientMigrationsFolder: Type.String(),
    defaultConfigPath: Type.String(),
    customMapPath: Type.String(),
    fallbackMapPath: Type.String(),
    defaultOnlineStyleUrl: Type.String(),
  })
)

/**
 * @internal
 * @typedef {object} ParsedWorkerData
 * @prop {MessagePort} childPort
 * @prop {Partial<MapeoManagerConstructorOptions>} managerConstructorOverrides
 */

/**
 * Parse data passed to this worker. If the data is invalid (which can happen
 * if run with `node --test`), returns `null`.
 *
 * @param {unknown} workerData
 * @return {null | ParsedWorkerData}
 */
function parseWorkerData(workerData) {
  try {
    assert(
      workerData &&
        typeof workerData === 'object' &&
        'childPort' in workerData &&
        workerData.childPort instanceof MessagePort &&
        'managerConstructorOverrides' in workerData
    )
    return {
      childPort: workerData.childPort,
      managerConstructorOverrides: Value.Parse(
        mapeoManagerConstructorOptionsType,
        workerData.managerConstructorOverrides
      ),
    }
  } catch {
    return null
  }
}

async function main() {
  if (isMainThread) return

  const parsedWorkerData = parseWorkerData(workerData)
  if (!parsedWorkerData) return
  const { managerConstructorOverrides, childPort } = parsedWorkerData

  const { dbFolder, coreStorage } = managerConstructorOverrides

  if (!dbFolder || !coreStorage) {
    throw new Error('Must supply dbFolder and coreStorage for worker')
  }

  const manager = new MapeoManager({
    rootKey: randomBytes(16),
    projectMigrationsFolder: new URL('../drizzle/project', import.meta.url)
      .pathname,
    clientMigrationsFolder: new URL('../drizzle/client', import.meta.url)
      .pathname,
    dbFolder,
    coreStorage,
    fastify: Fastify(),
    ...managerConstructorOverrides,
  })

  // This `any` cast is needed because `@comapeo/ipc` expects a `MapeoManager`
  // from the `@comapeo/core` install from npm, not our local development one.
  createMapeoServer(/** @type {any} */ (manager), childPort)

  childPort.start()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
