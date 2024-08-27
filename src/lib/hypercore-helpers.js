import { assert } from '../utils.js'

/**
 * @param {import('hypercore')<'binary', any>} core
 * @param {import('protomux')} protomux
 */
export function unreplicate(core, protomux) {
  assert(core.discoveryKey, 'Core should have a discovery key')
  protomux.unpair({
    protocol: 'hypercore/alpha',
    id: core.discoveryKey,
  })
  for (const channel of protomux) {
    if (channel.protocol !== 'hypercore/alpha') continue
    if (!channel.id.equals(core.discoveryKey)) continue
    channel.close()
  }
}
