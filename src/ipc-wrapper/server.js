// @ts-check
import { createServer } from 'rpc-reflector'
import { MANAGER_CHANNEL_ID, MAPEO_RPC_ID, SubChannel } from './sub-channel.js'
import { extractMessageEventData } from './utils.js'

/**
 * @param {import('../mapeo-manager.js').MapeoManager} manager
 * @param {import('./sub-channel.js').MessagePortLike} messagePort
 */
export function createMapeoServer(manager, messagePort) {
  /** @type {Map<string, { close: () => void, channel: SubChannel }>} */
  const existingProjectServers = new Map()

  const managerChannel = new SubChannel(messagePort, MANAGER_CHANNEL_ID)

  const managerServer = createServer(manager, managerChannel)

  managerChannel.start()

  messagePort.addEventListener('message', createProjectServer)

  return {
    close() {
      messagePort.removeEventListener('message', createProjectServer)

      for (const [id, server] of existingProjectServers.entries()) {
        server.close()
        server.channel.close()
        existingProjectServers.delete(id)
      }

      managerServer.close()
      managerChannel.close()
    },
  }

  /**
   * @param {unknown} payload
   */
  async function createProjectServer(payload) {
    const data = extractMessageEventData(payload)

    if (!data || typeof data !== 'object') return

    const id = 'id' in data && typeof data.id === 'string' ? data.id : null

    if (!id || id === MANAGER_CHANNEL_ID || id === MAPEO_RPC_ID) return

    if (existingProjectServers.has(id)) return

    const projectChannel = new SubChannel(messagePort, id)

    let project
    try {
      project = await manager.getProject(
        /** @type {import('../types.js').ProjectPublicId} */ (id)
      )
      messagePort.postMessage({
        id: MAPEO_RPC_ID,
        projectId: id,
      })
    } catch (err) {
      messagePort.postMessage({
        id: MAPEO_RPC_ID,
        projectId: id,
        error:
          err instanceof Error
            ? err.message
            : `Could not get project with ID ${id}`,
      })
      return
    }

    const { close } = createServer(project, projectChannel)

    existingProjectServers.set(id, { close, channel: projectChannel })

    if ('message' in data) {
      projectChannel.emit('message', data.message)
    }

    projectChannel.start()
  }
}
