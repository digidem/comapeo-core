/**
 * @param {import('hypercore')<'binary', any>} core
 * @param {import("protomux")} protomux
 */
export function unreplicate(core, protomux) {
  protomux.unpair({
    protocol: 'hypercore/alpha',
    id: core.discoveryKey,
  })
  for (const channel of protomux) {
    if (channel.protocol !== 'hypercore/alpha') continue
    if (!core.discoveryKey) continue // TODO: do we need to await ready() here?
    if (!channel.id.equals(core.discoveryKey)) continue
    channel.close()
  }
}
