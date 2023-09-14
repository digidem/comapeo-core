// @ts-check
import { createClient } from 'rpc-reflector'
import QuickLRU from 'quick-lru'
import { MANAGER_CHANNEL_ID, SubChannel } from './sub-channel.js'

const PROJECT_CLIENT_MAX_AGE = 1000 * 60 * 60 // 1 hour

/**
 * @param {import('./sub-channel.js').MessagePortLike} messagePort
 * @returns {import('rpc-reflector/client.js').ClientApi<import('../mapeo-manager.js').MapeoManager>}
 */
export function createMapeoClient(messagePort) {
  /** @type {QuickLRU<import('../types.js').ProjectPublicId, { instance: import('rpc-reflector/client.js').ClientApi<import('../mapeo-project.js').MapeoProject>, channel: SubChannel }>} */
  const existingProjectClients = new QuickLRU({
    maxSize: 3,
    maxAge: PROJECT_CLIENT_MAX_AGE,
    onEviction: (_id, { instance, channel }) => {
      createClient.close(instance)
      channel.close()
    },
  })

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

        if (existingClient) return Promise.resolve(existingClient.instance)

        const projectChannel = new SubChannel(messagePort, projectPublicId)

        /** @type {import('rpc-reflector').ClientApi<import('../mapeo-project.js').MapeoProject>} */
        const projectClientProxy = new Proxy(createClient(projectChannel), {
          get(target, prop, receiver) {
            if (prop === 'then') {
              return projectClientProxy
            }
            return Reflect.get(target, prop, receiver)
          },
        })

        projectChannel.start()

        existingProjectClients.set(projectPublicId, {
          instance: projectClientProxy,
          channel: projectChannel,
        })

        return Promise.resolve(projectClientProxy)
      }
    },
  })

  return client
}
