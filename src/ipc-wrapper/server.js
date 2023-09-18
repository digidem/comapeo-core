// @ts-check
import { createServer } from 'rpc-reflector'
import { MANAGER_CHANNEL_ID, MAPEO_IPC_ID, SubChannel } from './sub-channel.js'

/**
 * @param {import('../mapeo-manager.js').MapeoManager} manager
 * @param {import('./sub-channel.js').MessagePortLike} messagePort
 */
export function createMapeoServer(manager, messagePort) {
  /** @type {Map<string, { close: () => void, channel: SubChannel }>} */
  const existingProjectServers = new Map()

  const mapeoIpcChannel = new SubChannel(messagePort, MAPEO_IPC_ID)
  mapeoIpcChannel.start()

  mapeoIpcChannel.on('message', handleGetProject)

  const managerChannel = new SubChannel(messagePort, MANAGER_CHANNEL_ID)
  managerChannel.start()

  const managerServer = createServer(manager, managerChannel)

  return {
    close() {
      mapeoIpcChannel.off('message', handleGetProject)

      for (const [id, server] of existingProjectServers.entries()) {
        server.close()
        server.channel.close()
        existingProjectServers.delete(id)
      }

      mapeoIpcChannel.close()
      managerServer.close()
      managerChannel.close()
    },
  }

  /**
   *
   * @param {import('./utils.js').MapeoIpcMessagePayload} payload
   */
  async function handleGetProject(payload) {
    const { type, projectId } = payload

    if (type !== 'get_project') return
    if (existingProjectServers.has(projectId)) return

    let project
    try {
      project = await manager.getProject(
        /** @type {import('../types.js').ProjectPublicId} */ (projectId)
      )
    } catch (err) {
      mapeoIpcChannel.postMessage({
        type: 'get_project',
        projectId,
        error:
          err instanceof Error
            ? err.message
            : `Could not get project with ID ${projectId}`,
      })
      return
    }

    const projectChannel = new SubChannel(messagePort, projectId)
    projectChannel.start()

    const { close } = createServer(project, projectChannel)

    existingProjectServers.set(projectId, { close, channel: projectChannel })

    mapeoIpcChannel.postMessage({
      type: 'get_project',
      projectId,
    })
  }
}
