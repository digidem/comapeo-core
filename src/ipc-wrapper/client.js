// @ts-check
import { createClient } from 'rpc-reflector'
import { MANAGER_CHANNEL_ID, SubChannel } from './sub-channel.js'

/**
 * @param {import('./sub-channel.js').MessagePortLike} messagePort
 * @returns {import('rpc-reflector/client.js').ClientApi<import('../mapeo-manager.js').MapeoManager>}
 */
export function createMapeoClient(messagePort) {
  // TODO: Use LRU cache?
  /** @type {Map<import('../types.js').ProjectPublicId, import('rpc-reflector/client.js').ClientApi<import('../mapeo-project.js').MapeoProject>>} */
  const existingProjectClients = new Map()

  const managerChannel = new SubChannel(messagePort, MANAGER_CHANNEL_ID)

  /** @type {import('rpc-reflector').ClientApi<import('../mapeo-manager.js').MapeoManager>} */
  const managerClient = createClient(managerChannel)

  managerChannel.start()

  const client = new Proxy(managerClient, {
    get(target, prop, receiver) {
      if (prop === 'getProject') {
        return createProjectClient
      } else {
        return Reflect.get(target, prop, receiver)
      }

      /**
       * @param {import('../types.js').ProjectPublicId} projectPublicId
       * @returns {Promise<import('rpc-reflector/client.js').ClientApi<import('../mapeo-project.js').MapeoProject>>}
       */
      function createProjectClient(projectPublicId) {
        const existingClient = existingProjectClients.get(projectPublicId)

        if (existingClient) return Promise.resolve(existingClient)

        const projectChannel = new SubChannel(messagePort, projectPublicId)

        /** @type {import('rpc-reflector').ClientApi<import('../mapeo-project.js').MapeoProject>} */
        const projectClient = new Proxy(createClient(projectChannel), {
          get(target, prop, receiver) {
            if (prop === 'then') {
              return projectClient
            }
            return Reflect.get(target, prop, receiver)
          },
        })

        projectChannel.start()

        existingProjectClients.set(projectPublicId, projectClient)

        return Promise.resolve(projectClient)
      }
    },
  })

  return client
}
