/**
 * Curated list of published @comapeo/core versions used by the cross-version
 * sync tests. Each entry is a version that shipped in a released CoMapeo
 * Mobile app, so this list matches what is actually in the field. The current
 * working tree is tested against every version here, in both directions —
 * because every release is tested against all shipped versions *before* it
 * ships, any pair of published versions has also been tested, so this list
 * does not need to grow combinatorially.
 *
 * Each entry REQUIRES a matching alias in ./versions/package.json.
 *
 * To add a version:
 *   1. npm install --prefix test-e2e/cross-version/versions \
 *        -D "@comapeo/core<X.Y.Z>@npm:@comapeo/core@X.Y.Z"
 *      (commit the sub-package package.json + package-lock.json changes)
 *   2. Add an entry below (newest last). Set `schemaVersion` to the
 *      @comapeo/schema version that the installed alias resolves.
 *   3. Only if that schema version rejects current mock documents: add an
 *      adapter in ./fixtures.js keyed by the schema version.
 *
 * To remove a version (e.g. when its app release line is no longer
 * supported): reverse the steps above.
 *
 * The sub-package's `overrides` field pins transitive dependencies of old
 * versions where a floating range now resolves to something incompatible
 * with what actually shipped (e.g. core 5.1.x–5.2.x declare a drizzle-orm
 * range that today resolves to a release rejecting their shipped migration
 * files — shipped apps were protected by their lockfiles). Only add an
 * override for a concrete breakage like this, never preemptively.
 *
 * Do NOT special-case versions inside test bodies — express version
 * differences here as capability flags, or in ./fixtures.js as adapters.
 */

/**
 * @typedef {object} VersionEntry
 * @prop {string} coreVersion Exact published core version. Must match an
 *   alias in ./versions/package.json.
 * @prop {string} appRelease The released app line(s) that shipped this
 *   version (provenance — why the version is on this list).
 * @prop {string} schemaVersion The schema version this core version uses.
 *   Selects document adapters in ./fixtures.js.
 * @prop {{ serverPeers: boolean, blobSync: boolean }} capabilities
 *   serverPeers: whether this version supports syncing with a cloud server
 *   (member.addServerPeer + sync.connectServers). blobSync: whether blob
 *   (photo attachment) sync is testable against this version with the
 *   current test helpers.
 */

/** @type {VersionEntry[]} */
export const VERSIONS = [
  {
    coreVersion: '2.3.1',
    appRelease: 'CoMapeo Mobile v2.x',
    schemaVersion: '1.4.1',
    capabilities: { serverPeers: true, blobSync: true },
  },
  {
    coreVersion: '3.1.1',
    appRelease: 'CoMapeo Mobile v3.x',
    schemaVersion: '1.5.0',
    capabilities: { serverPeers: true, blobSync: true },
  },
  {
    coreVersion: '4.1.4',
    appRelease: 'CoMapeo Mobile v5.0',
    schemaVersion: '2.0.0',
    capabilities: { serverPeers: true, blobSync: true },
  },
  {
    coreVersion: '4.4.0',
    appRelease: 'CoMapeo Mobile v6.x',
    schemaVersion: '2.1.1',
    capabilities: { serverPeers: true, blobSync: true },
  },
  {
    coreVersion: '5.1.2',
    appRelease: 'CoMapeo Mobile v7.x',
    schemaVersion: '2.2.0',
    capabilities: { serverPeers: true, blobSync: true },
  },
  {
    coreVersion: '5.1.4',
    appRelease: 'CoMapeo Mobile v8.0–v8.2',
    schemaVersion: '2.2.0',
    capabilities: { serverPeers: true, blobSync: true },
  },
  {
    coreVersion: '5.2.1',
    appRelease: 'CoMapeo Mobile v8.3',
    schemaVersion: '2.2.0',
    capabilities: { serverPeers: true, blobSync: true },
  },
  {
    coreVersion: '5.4.1',
    appRelease: 'CoMapeo Mobile v9.0',
    schemaVersion: '2.2.0',
    capabilities: { serverPeers: true, blobSync: true },
  },
  {
    coreVersion: '5.5.0',
    appRelease: 'CoMapeo Mobile v10.x',
    schemaVersion: '2.2.0',
    capabilities: { serverPeers: true, blobSync: true },
  },
  {
    coreVersion: '7.1.0',
    appRelease: 'CoMapeo Mobile v12.x',
    schemaVersion: '2.2.0',
    capabilities: { serverPeers: true, blobSync: true },
  },
  {
    coreVersion: '7.4.0',
    appRelease: 'CoMapeo Mobile v13.0',
    schemaVersion: '2.3.0',
    capabilities: { serverPeers: true, blobSync: true },
  },
]

// The weekly CI job also tests against whatever is currently published as
// @comapeo/core@latest, to catch packaging or compatibility problems that
// only appear post-publish. CI installs the alias with:
//   npm install --prefix test-e2e/cross-version/versions --no-save \
//     "@comapeo/corelatest@npm:@comapeo/core@latest"
if (process.env.CROSS_VERSION_INCLUDE_LATEST) {
  VERSIONS.push({
    coreVersion: 'latest',
    appRelease: 'npm dist-tag latest',
    schemaVersion: 'current',
    capabilities: { serverPeers: true, blobSync: true },
  })
}

/**
 * @param {'serverPeers' | 'blobSync'} capability
 * @returns {VersionEntry[]}
 */
export function versionsWithCapability(capability) {
  return VERSIONS.filter((version) => version.capabilities[capability])
}
