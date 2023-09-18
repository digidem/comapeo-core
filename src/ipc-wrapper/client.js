// @ts-check
import { createClient } from 'rpc-reflector'
import pTimeout from 'p-timeout'
import { MANAGER_CHANNEL_ID, MAPEO_IPC_ID, SubChannel } from './sub-channel.js'

const CLOSE = Symbol('close')

/**
 * @param {import('./sub-channel.js').MessagePortLike} messagePort
 * @returns {import('rpc-reflector/client.js').ClientApi<import('../mapeo-manager.js').MapeoManager>}
 */
export function createMapeoClient(messagePort) {
  /** @type {Map<import('../types.js').ProjectPublicId, { instance: import('rpc-reflector/client.js').ClientApi<import('../mapeo-project.js').MapeoProject>, channel: SubChannel }>} */
  const existingProjectClients = new Map()

  const mapeoIpcChannel = new SubChannel(messagePort, MAPEO_IPC_ID)
  mapeoIpcChannel.start()

  const managerChannel = new SubChannel(messagePort, MANAGER_CHANNEL_ID)
  managerChannel.start()

  /** @type {import('rpc-reflector').ClientApi<import('../mapeo-manager.js').MapeoManager>} */
  const managerClient = createClient(managerChannel)

  const client = new Proxy(managerClient, {
    get(target, prop, receiver) {
      if (prop === CLOSE) {
        return () => {
          mapeoIpcChannel.close()
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

    // Wait for the server to confirm that it could retrieve the desired project
    await pTimeout(
      new Promise((res, rej) => {
        mapeoIpcChannel.on(
          'message',
          /**
           * @param {import('./utils.js').MapeoIpcMessagePayload} payload
           */
          function handleGetProjectResponse(payload) {
            const { type, projectId, error } = payload

            if (type !== 'get_project') return
            if (projectId !== projectPublicId) return

            mapeoIpcChannel.off('message', handleGetProjectResponse)

            if (error) rej(new Error(error))
            else res(null)
          }
        )

        mapeoIpcChannel.postMessage({
          type: 'get_project',
          projectId: projectPublicId,
        })
      }),
      { milliseconds: 3000 }
    )

    const projectChannel = new SubChannel(messagePort, projectPublicId)

    projectChannel.start()

    /** @type {import('rpc-reflector').ClientApi<import('../mapeo-project.js').MapeoProject>} */
    const projectClientProxy = new Proxy(createClient(projectChannel), {
      get(target, prop, receiver) {
        if (prop === 'then') {
          return projectClientProxy
        }
        return Reflect.get(target, prop, receiver)
      },
    })

    existingProjectClients.set(projectPublicId, {
      instance: projectClientProxy,
      channel: projectChannel,
    })

    return projectClientProxy
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
