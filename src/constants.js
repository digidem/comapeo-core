/** @import { Namespace } from './types.js' */

// WARNING: Changing these will break things for existing apps, since namespaces
// are used for key derivation
export const NAMESPACES = /** @type {const} */ ([
  'auth',
  'config',
  'data',
  'blobIndex',
  'blob',
])

/** @type {ReadonlyArray<Namespace>} */
export const PRESYNC_NAMESPACES = ['auth', 'config', 'blobIndex']

/** @type {ReadonlyArray<Namespace>} */
export const DATA_NAMESPACES = NAMESPACES.filter(
  (namespace) => !PRESYNC_NAMESPACES.includes(namespace)
)

export const NAMESPACE_SCHEMAS = /** @type {const} */ ({
  data: ['observation', 'track', 'remoteDetectionAlert'],
  config: [
    'translation',
    'preset',
    'field',
    'projectSettings',
    'deviceInfo',
    'icon',
  ],
  auth: ['coreOwnership', 'role'],
})

export const SUPPORTED_CONFIG_VERSION = 1

// WARNING: This value is persisted. Be careful when changing it.
export const DRIZZLE_MIGRATIONS_TABLE = '__drizzle_migrations'

// Oldest possible time, ensure it gets overwritten with any updates
export const UNIX_EPOCH_DATE = new Date(0).toISOString()
