// @ts-check
import { createClient } from 'rpc-reflector'
import pDefer from 'p-defer'
import { MANAGER_CHANNEL_ID, MAPEO_RPC_ID, SubChannel } from './sub-channel.js'

const CLOSE = Symbol('close')

/**
 * @param {import('./sub-channel.js').MessagePortLike} messagePort
 * @returns {import('rpc-reflector/client.js').ClientApi<import('../mapeo-manager.js').MapeoManager>}
 */
export function createMapeoClient(messagePort) {
  /** @type {Map<string, Promise<import('rpc-reflector/client.js').ClientApi<import('../mapeo-project.js').MapeoProject>>>} */
  const projectClientPromises = new Map()

  const managerChannel = new SubChannel(messagePort, MANAGER_CHANNEL_ID)
  const mapeoRpcChannel = new SubChannel(messagePort, MAPEO_RPC_ID)

  /** @type {import('rpc-reflector').ClientApi<import('../mapeo-manager.js').MapeoManager>} */
  const managerClient = createClient(managerChannel)
  /** @type {import('rpc-reflector').ClientApi<import('./server.js').MapeoRpcApi>} */
  const mapeoRpcClient = createClient(mapeoRpcChannel)

  mapeoRpcChannel.start()
  managerChannel.start()

  const client = new Proxy(managerClient, {
    get(target, prop, receiver) {
      if (prop === CLOSE) {
        return async () => {
          managerChannel.close()
          createClient.close(managerClient)

          const projectClientResults = await Promise.allSettled(
            projectClientPromises.values()
          )

          for (const result of projectClientResults) {
            if (result.status === 'fulfilled') {
              createClient.close(result.value)
            }
          }
        }
      }

      if (prop === 'getProject') {
        return createProjectClient
      }

      return Reflect.get(target, prop, receiver)
    },
  })

  return client

  /**
   * @param {string} projectPublicId
   * @returns {Promise<import('rpc-reflector/client.js').ClientApi<import('../mapeo-project.js').MapeoProject>>}
   */
  async function createProjectClient(projectPublicId) {
    const existingClientPromise = projectClientPromises.get(projectPublicId)

    if (existingClientPromise) return existingClientPromise

    /** @type {import('p-defer').DeferredPromise<import('rpc-reflector/client.js').ClientApi<import('../mapeo-project.js').MapeoProject>>}*/
    const deferred = pDefer()

    projectClientPromises.set(projectPublicId, deferred.promise)

    try {
      await mapeoRpcClient.assertProjectExists(projectPublicId)
    } catch (err) {
      deferred.reject(err)
      throw err
    }

    const projectChannel = new SubChannel(messagePort, projectPublicId)

    /** @type {import('rpc-reflector').ClientApi<import('../mapeo-project.js').MapeoProject>} */
    const projectClient = createClient(projectChannel)
    projectChannel.start()

    deferred.resolve(projectClient)

    return projectClient
  }
}

/**
 * @param {import('rpc-reflector').ClientApi<import('../mapeo-manager.js').MapeoManager>} client client created with `createMapeoClient`
 * @returns {Promise<void>}
 */
export async function closeMapeoClient(client) {
  // @ts-expect-error
  return client[CLOSE]()
}
