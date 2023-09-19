// @ts-check
import { createClient } from 'rpc-reflector'
import pTimeout from 'p-timeout'
import { MANAGER_CHANNEL_ID, MAPEO_RPC_ID, SubChannel } from './sub-channel.js'
import { extractMessageEventData } from './utils.js'

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
  async function createProjectClient(projectPublicId) {
    const existingClient = existingProjectClients.get(projectPublicId)

    if (existingClient) return existingClient.instance

    await pTimeout(
      new Promise((res, rej) => {
        messagePort.addEventListener(
          'message',
          /**
           * @param {unknown} event
           */
          function handleMapeoRpcEvent(event) {
            const data = extractMessageEventData(event)

            if (!data || typeof data !== 'object') return
            if (!('id' in data && 'projectId' in data)) return

            if (data.id !== MAPEO_RPC_ID) return
            if (data.projectId !== projectPublicId) return

            messagePort.removeEventListener('message', handleMapeoRpcEvent)

            if ('error' in data && typeof data.error === 'string')
              rej(new Error(data.error))
            else res(null)
          }
        )

        messagePort.postMessage({
          id: projectPublicId,
        })
      }),
      { milliseconds: 3000 }
    )
    const projectChannel = new SubChannel(messagePort, projectPublicId)

    /** @type {import('rpc-reflector').ClientApi<import('../mapeo-project.js').MapeoProject>} */
    const projectClient = createClient(projectChannel)
    projectChannel.start()

    existingProjectClients.set(projectPublicId, {
      instance: projectClient,
      channel: projectChannel,
    })

    return projectClient
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
