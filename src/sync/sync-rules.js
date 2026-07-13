import {
  DATA_SYNC_NAMESPACES,
  INITIAL_SYNC_NAMESPACES,
  NAMESPACES,
} from '../constants.js'
import { ExhaustivenessError } from '../errors.js'
import { getOwn } from '../lib/get-own.js'
/** @import { Namespace } from '../types.js' */

/**
 * Pure decision logic for sync. Everything here is a function of plain data —
 * no events, no timers, no IO — so the rules that decide what to replicate
 * and when sync is complete can be unit-tested exhaustively, and every
 * consumer (public state, waitForSync, the per-peer data-sync gate, autostop)
 * derives from the same definitions and cannot disagree.
 */

/**
 * What this device is currently willing to replicate.
 * - `'stopped'`: nothing
 * - `'initial'`: only the initial namespaces (auth, config, blobIndex)
 * - `'all'`: everything
 * @typedef {'stopped' | 'initial' | 'all'} SyncMode
 */

/**
 * What a caller of `waitForSync` is waiting for.
 * @typedef {'initial' | 'all'} SyncTarget
 */

/** @typedef {'initial' | 'data'} NamespaceGroup */

/**
 * May we sync a namespace with a peer? Derived from the peer's role. Unknown
 * roles are seeded from `NO_ROLE` (auth allowed, everything else blocked).
 * @typedef {Record<Namespace, 'allowed' | 'blocked'>} SyncCapability
 */

/** @typedef {{ have: number, toReceive: number, toSend: number }} BlockCounts */

/**
 * Progress of one namespace with one device, aggregated over the namespace's
 * cores. Counts are from the local device's point of view: `toReceive` =
 * blocks we still need from this device, `toSend` = blocks this device still
 * needs from us.
 * @typedef {BlockCounts & {
 *   openingChannels: number,
 *   openChannels: number
 * }} DeviceNamespaceProgress
 */

/**
 * @typedef {object} NamespaceProgress
 * @property {number} coreCount
 * @property {BlockCounts} local `toReceive` = unique blocks we still need
 * from anyone; `toSend` = unique blocks anyone still needs from us
 * @property {Record<string, DeviceNamespaceProgress>} devices keyed by device ID
 */

/**
 * Immutable snapshot of sync progress, derived from the bitfields of every
 * core. Produced by `SyncProgress#getSnapshot()`.
 * @typedef {Record<Namespace, NamespaceProgress>} SyncProgressSnapshot
 */

/**
 * The facts about a connected peer that the rules need.
 * @typedef {object} PeerFacts
 * @property {string} deviceId
 * @property {SyncCapability} capability
 * @property {boolean} hasSyncedAuth auth sync with this peer has completed,
 * its records were indexed, and the capability re-read (the "auth gate").
 * Until then `capability` may be a placeholder (`NO_ROLE`), so non-auth
 * namespaces can be neither skipped as blocked nor counted as complete.
 */

/**
 * @param {SyncTarget} target
 * @returns {ReadonlyArray<Namespace>}
 */
export function namespacesForSyncTarget(target) {
  switch (target) {
    case 'initial':
      return INITIAL_SYNC_NAMESPACES
    case 'all':
      return NAMESPACES
    default:
      throw new ExhaustivenessError({ value: target })
  }
}

/**
 * @param {NamespaceGroup} group
 * @returns {ReadonlyArray<Namespace>}
 */
export function namespacesForGroup(group) {
  switch (group) {
    case 'initial':
      return INITIAL_SYNC_NAMESPACES
    case 'data':
      return DATA_SYNC_NAMESPACES
    default:
      throw new ExhaustivenessError({ value: group })
  }
}

/**
 * Compute the device-wide sync mode.
 *
 * While backgrounded we keep syncing until there is nothing left to transfer,
 * then stop completely — and stay stopped (even if new peers bring new data)
 * until the app is foregrounded again.
 *
 * @param {object} opts
 * @param {boolean} opts.wantsDataSync `start()` has been called (and not `stop()`)
 * @param {boolean} opts.isBackgrounded the app has requested a graceful full stop
 * @param {boolean} opts.isComplete is sync complete for what we want to sync
 * (target `'all'` if `wantsDataSync`, else `'initial'`)
 * @param {SyncMode} opts.previousMode
 * @returns {SyncMode}
 */
export function computeSyncMode({
  wantsDataSync,
  isBackgrounded,
  isComplete,
  previousMode,
}) {
  if (isBackgrounded) {
    if (previousMode === 'stopped') return 'stopped'
    if (isComplete) return 'stopped'
  }
  return wantsDataSync ? 'all' : 'initial'
}

/**
 * Which namespaces should we replicate with a peer right now?
 *
 * Namespaces enable with a peer in stages:
 *
 * 1. `auth` replicates whenever sync is not stopped. It carries the role and
 *    core-ownership records that everything else depends on.
 * 2. The other initial namespaces (`config`, `blobIndex`) wait until auth
 *    sync with this peer is complete *and its records are indexed and the
 *    peer's capability re-read* (`hasSyncedAuth`). This means a stale role
 *    record — e.g. a device that was removed from the project while we were
 *    offline — cannot cause us to exchange anything beyond auth before we
 *    have every membership record the peer can give us.
 * 3. Data namespaces additionally wait for the whole initial group to
 *    complete with this peer (`isInitialSyncComplete`), so we have the
 *    project config and blob index before bulk data transfer starts.
 *
 * @param {object} opts
 * @param {SyncMode} opts.syncMode
 * @param {SyncCapability} opts.capability
 * @param {boolean} opts.hasSyncedAuth auth sync with this peer completed,
 * its records were indexed, and the capability re-read afterwards
 * @param {boolean} opts.isInitialSyncComplete initial sync with this peer is complete
 * @returns {Set<Namespace>}
 */
export function computeEnabledNamespaces({
  syncMode,
  capability,
  hasSyncedAuth,
  isInitialSyncComplete,
}) {
  /** @type {Set<Namespace>} */
  const enabled = new Set()
  if (syncMode === 'stopped') return enabled
  if (capability.auth === 'allowed') enabled.add('auth')
  if (!hasSyncedAuth) return enabled
  for (const ns of INITIAL_SYNC_NAMESPACES) {
    if (ns === 'auth') continue
    if (capability[ns] === 'allowed') enabled.add(ns)
  }
  if (syncMode === 'all' && isInitialSyncComplete) {
    for (const ns of DATA_SYNC_NAMESPACES) {
      if (capability[ns] === 'allowed') enabled.add(ns)
    }
  }
  return enabled
}

/**
 * Have we completed the connection handshake with this device? Until the
 * project creator core's replication channel is fully open we may know
 * nothing about what the device has, so no completion question can be
 * answered yet. (Every connected peer replicates the creator core — that is
 * what makes it "connected".)
 *
 * @param {SyncProgressSnapshot} snapshot
 * @param {string} deviceId
 * @returns {boolean}
 */
function hasCompletedHandshake(snapshot, deviceId) {
  const authProgress = getOwn(snapshot.auth.devices, deviceId)
  return !!authProgress && authProgress.openChannels > 0
}

/**
 * Is there nothing left to transfer between us and this device, for the given
 * namespaces? Capability-blocked namespaces are skipped (they will never
 * sync). A replication channel still opening blocks completion: until the
 * first length/bitfield exchange for a core finishes we cannot know whether
 * the device has data we need.
 *
 * @param {SyncProgressSnapshot} snapshot
 * @param {PeerFacts} peer
 * @param {ReadonlyArray<Namespace>} namespaces
 * @returns {boolean}
 */
export function isNamespacesCompleteWithDevice(snapshot, peer, namespaces) {
  if (!hasCompletedHandshake(snapshot, peer.deviceId)) return false
  for (const ns of namespaces) {
    // Until the peer's auth gate has opened, its capability is a placeholder
    // (NO_ROLE blocks everything non-auth), so a non-auth namespace can
    // neither be skipped as "blocked" nor be complete — we don't yet know
    // what may sync. Without this, initial sync would read as complete the
    // moment auth transferred, before config was even enabled.
    if (ns !== 'auth' && !peer.hasSyncedAuth) return false
    if (peer.capability[ns] === 'blocked') continue
    const deviceProgress = getOwn(snapshot[ns].devices, peer.deviceId)
    if (!deviceProgress) return false
    if (deviceProgress.openingChannels > 0) return false
    if (deviceProgress.toReceive > 0 || deviceProgress.toSend > 0) return false
  }
  return true
}

/**
 * @param {SyncProgressSnapshot} snapshot
 * @param {PeerFacts} peer
 * @param {SyncTarget} target
 * @returns {boolean}
 */
export function isTargetCompleteWithDevice(snapshot, peer, target) {
  return isNamespacesCompleteWithDevice(
    snapshot,
    peer,
    namespacesForSyncTarget(target)
  )
}

/**
 * Is sync complete for the given target? True when we have nothing left to
 * send or receive for the target's namespaces, considering every connected
 * peer. Gating on the set of *connected* peers (rather than on whichever
 * per-core state entries happen to exist) means a disconnected peer can never
 * block completion, and a connected peer we haven't heard from yet always
 * does.
 *
 * @param {SyncProgressSnapshot} snapshot
 * @param {Iterable<PeerFacts>} connectedPeers
 * @param {SyncTarget} target
 * @returns {boolean}
 */
export function isSyncComplete(snapshot, connectedPeers, target) {
  for (const ns of namespacesForSyncTarget(target)) {
    const { local } = snapshot[ns]
    if (local.toReceive > 0 || local.toSend > 0) return false
  }
  for (const peer of connectedPeers) {
    if (!isTargetCompleteWithDevice(snapshot, peer, target)) return false
  }
  return true
}

/**
 * The public sync state exposed on `project.$sync`.
 * @typedef {object} SyncApiState
 * @property {SyncMode} syncMode what this device is currently willing to replicate
 * @property {Record<string, DeviceSyncState>} devices sync state with each
 * connected project member, keyed by device ID
 */

/**
 * @typedef {object} DeviceSyncState
 * @property {DeviceGroupProgress} initial progress of the initial namespaces
 * (auth, config, blobIndex) with this device
 * @property {DeviceGroupProgress} data progress of the data namespaces (data,
 * blob) with this device
 */

/**
 * @typedef {object} DeviceGroupProgress
 * @property {boolean} isSyncEnabled is this namespace group actively
 * replicating with this device — true only when *both* sides have enabled it
 * (replication channels are open), so this reflects whether the other device
 * is syncing with us, not just our own intent
 * @property {boolean} isComplete nothing left to send to or receive from this
 * device in this group
 * @property {number} toReceive blocks we still need from this device
 * @property {number} toSend blocks this device still needs from us
 */

/** @type {ReadonlyArray<NamespaceGroup>} */
const NAMESPACE_GROUPS = ['initial', 'data']

/**
 * Derive the public sync state. Everything comes from a single snapshot and a
 * single view of the connected peers, so the reported device list, progress
 * counts, and enabled flags cannot be mutually inconsistent.
 *
 * @param {object} opts
 * @param {SyncProgressSnapshot} opts.snapshot
 * @param {Iterable<PeerFacts>} opts.connectedPeers
 * @param {SyncMode} opts.syncMode
 * @returns {SyncApiState}
 */
export function deriveSyncApiState({ snapshot, connectedPeers, syncMode }) {
  /** @type {SyncApiState['devices']} */
  const devices = {}
  for (const peer of connectedPeers) {
    const groupProgress = /** @type {DeviceSyncState} */ ({})
    for (const group of NAMESPACE_GROUPS) {
      let toReceive = 0
      let toSend = 0
      // Enabled = replication channels are open for every non-blocked
      // namespace in the group. Channels only open when both sides
      // replicate, so this is how a consumer sees whether the *other*
      // device is syncing with us.
      let isSyncEnabled = false
      for (const ns of namespacesForGroup(group)) {
        if (peer.capability[ns] === 'blocked') continue
        const deviceProgress = getOwn(snapshot[ns].devices, peer.deviceId)
        if (!deviceProgress || deviceProgress.openChannels === 0) {
          isSyncEnabled = false
          break
        }
        isSyncEnabled = true
      }
      for (const ns of namespacesForGroup(group)) {
        if (peer.capability[ns] === 'blocked') continue
        const deviceProgress = getOwn(snapshot[ns].devices, peer.deviceId)
        if (!deviceProgress) continue
        toReceive += deviceProgress.toReceive
        toSend += deviceProgress.toSend
      }
      groupProgress[group] = {
        isSyncEnabled,
        isComplete: isNamespacesCompleteWithDevice(
          snapshot,
          peer,
          namespacesForGroup(group)
        ),
        toReceive,
        toSend,
      }
    }
    devices[peer.deviceId] = groupProgress
  }
  return { syncMode, devices }
}
