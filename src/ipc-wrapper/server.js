// @ts-check
import { createServer } from 'rpc-reflector'
import { MANAGER_CHANNEL_ID, SubChannel } from './sub-channel.js'
import { extractMessageEventData } from './utils.js'

/**
 * @param {import('../mapeo-manager.js').MapeoManager} manager
 * @param {import('./sub-channel.js').MessagePortLike} messagePort
 */
export function createMapeoServer(manager, messagePort) {
  // TODO: Use LRU cache and call project.close() after time without use?
  /** @type {Map<string, { close: () => void, channel: SubChannel }>}*/
  const existingProjectServers = new Map()

  const managerChannel = new SubChannel(messagePort, MANAGER_CHANNEL_ID)

  const managerServer = createServer(manager, managerChannel)

  managerChannel.start()

  messagePort.addEventListener('message', handleMessageEvent)

  return {
    close() {
      messagePort.removeEventListener('message', handleMessageEvent)

      for (const [id, server] of existingProjectServers.entries()) {
        server.close()
        server.channel.close()
        existingProjectServers.delete(id)
      }

      managerServer.close()
    },
  }

  /**
   * @param {any} payload
   */
  async function handleMessageEvent(payload) {
    const data = extractMessageEventData(payload)

    const id = data?.id

    if (typeof id !== 'string' || id === '@@manager') return

    if (existingProjectServers.has(id)) return

    const projectChannel = new SubChannel(messagePort, id)

    const project = await manager.getProject(
      /** @type {import('../types.js').ProjectPublicId} */ (id)
    )

    const { close } = createServer(project, projectChannel)

    existingProjectServers.set(id, { close, channel: projectChannel })

    projectChannel.emit('message', data.message)

    projectChannel.start()
  }
}
