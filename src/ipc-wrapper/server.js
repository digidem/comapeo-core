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

  managerChannel.on('message', async (payload) => {
    // TODO: figure out better way to know that this is the project public id
    const projectPublicId = payload[payload.length - 1]

    if (typeof projectPublicId !== 'string') return
    if (existing.has(projectPublicId)) return

    const projectChannel = new SubChannel(messagePort, projectPublicId)

    const project = await manager.getProject(
      /** @type {import('../types.js').ProjectPublicId} */ (projectPublicId)
    )

    const { close } = createServer(project, projectChannel)

    projectChannel.emit('message', payload)

    existing.set(projectPublicId, { close, project })
  })

  return managerServer
}
