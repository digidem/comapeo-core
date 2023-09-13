// @ts-check
import { createServer } from 'rpc-reflector'
import { SubChannel } from './sub-channel.js'

/**
 * @param {import('../mapeo-manager.js').MapeoManager} manager
 * @param {import('rpc-reflector/server.js').MessagePortLike} messagePort
 */
export function createMapeoServer(manager, messagePort) {
  // TODO: LRU? project.close() after time without use?
  /** @type {Map<string, { close: () => void, project: import('../mapeo-project.js').MapeoProject }>}*/
  const existing = new Map()

  const managerChannel = new SubChannel(messagePort, '@@manager')

  const managerServer = createServer(manager, managerChannel)

  messagePort.on('message', async (payload) => {
    const id = payload?.id
    if (typeof id !== 'string' || id === '@@manager') return

    if (existing.has(id)) return

    const projectChannel = new SubChannel(messagePort, id)

    const project = await manager.getProject(
      /** @type {import('../types.js').ProjectPublicId} */ (id)
    )

    const { close } = createServer(project, projectChannel)

    projectChannel.emit('message', payload.message)

    existing.set(id, { close, project })
  })

  return managerServer
}
