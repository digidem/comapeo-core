import { MissingDiscoveryKeyError } from '../errors.js'

/**
 * @param {import('hypercore')<'binary', any>} core Core to unreplicate. Must be ready.
 * @param {import('protomux')} protomux
 */
export function unreplicate(core, protomux) {
  if (!core.discoveryKey) {
    throw new MissingDiscoveryKeyError()
  }
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
