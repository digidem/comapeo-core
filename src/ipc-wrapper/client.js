// @ts-check
import { createClient } from 'rpc-reflector'
import { MANAGER_CHANNEL_ID, SubChannel } from './sub-channel.js'

const CLOSE = Symbol('close')

/**
 * @param {import('./sub-channel.js').MessagePortLike} messagePort
 * @returns {import('rpc-reflector/client.js').ClientApi<import('../mapeo-manager.js').MapeoManager>}
 */
export function createMapeoClient(messagePort) {
  /** @type {Map<import('../types.js').ProjectPublicId, { instance: import('rpc-reflector/client.js').ClientApi<import('../mapeo-project.js').MapeoProject>, channel: SubChannel }>} */
  const existingProjectClients = new Map()

  const managerChannel = new SubChannel(messagePort, MANAGER_CHANNEL_ID)

  /** @type {import('rpc-reflector').ClientApi<import('../mapeo-manager.js').MapeoManager>} */
  const managerClient = createClient(managerChannel)

  managerChannel.start()

  const client = new Proxy(managerClient, {
    get(target, prop, receiver) {
      if (prop === CLOSE) {
        return () => {
          managerChannel.close()
          createClient.close(managerClient)
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
   * @param {import('../types.js').ProjectPublicId} projectPublicId
   * @returns {Promise<import('rpc-reflector/client.js').ClientApi<import('../mapeo-project.js').MapeoProject>>}
   */
  function createProjectClient(projectPublicId) {
    const existingClient = existingProjectClients.get(projectPublicId)

    if (existingClient) return Promise.resolve(existingClient.instance)

    const projectChannel = new SubChannel(messagePort, projectPublicId)

    /** @type {import('rpc-reflector').ClientApi<import('../mapeo-project.js').MapeoProject>} */
    const projectClient = createClient(projectChannel)
    projectChannel.start()

    existingProjectClients.set(projectPublicId, {
      instance: projectClient,
      channel: projectChannel,
    })

    return Promise.resolve(projectClient)
  }
}

/**
 * @param {import('rpc-reflector').ClientApi<import('../mapeo-manager.js').MapeoManager>} client client created with `createMapeoClient`
 * @returns {void}
 */
export function closeMapeoClient(client) {
  // @ts-expect-error
  return client[CLOSE]()
}
