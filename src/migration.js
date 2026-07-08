import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { store as migrateStore } from 'hypercore-storage/migrations/0/index.js'
import CorestoreStorage from 'hypercore-storage'
import { ensureKnownError } from './errors.js'

export const MIGRATION_REASON_NEEDS_UPGRADE = 0
export const MIGRATION_REASON_ALREADY_UPGRADED = 1
export const MIGRATION_REASON_NO_SPACE = 2

export const AVAILABLE_SPACE_MULTIPLIER = 1.5

/** @typedef {MIGRATION_REASON_NEEDS_UPGRADE|MIGRATION_REASON_ALREADY_UPGRADED|MIGRATION_REASON_NO_SPACE} MigrationReason*/

/**
 * List all project directories in a storage folder.
 *
 * MapeoManager stores data per project in subdirectories:
 * storagePath/{projectId}/corestore/...
 *
 * @param {string} storagePath - Path to the top-level storage directory
 * @returns {Promise<Array<string>>} - Array of project IDs
 */
export async function listProjectsFromStorage(storagePath) {
  let entries
  try {
    entries = await fsPromises.readdir(storagePath, {
      withFileTypes: true,
    })
  } catch (err) {
    // @ts-expect-error
    if (err.code === 'ENOENT') return []
    throw err
  }

  const projectIds = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Verify this is a project directory by checking for a corestore subdirectory
      const corestoreDir = path.join(storagePath, entry.name, 'corestore')
      try {
        await fsPromises.access(corestoreDir)
        projectIds.push(entry.name)
      } catch {
        // Not a project directory
      }
    }
  }

  return projectIds
}

/**
 * Calculate the total size of all hypercore data in a storage directory.
 *
 * Hypercore stores data in a nested structure:
 * storagePath/cores/{id[0:2]}/{id[2:4]}/{discoveryKey}/{files}
 *
 * @param {string} storagePath - Path to the corestore directory (should contain 'cores' subdirectory)
 * @returns {Promise<Record<string, number>>} - Map of discovery keys to total size in bytes
 */
async function calculateCoreSizes(storagePath) {
  const coresDir = path.join(storagePath, 'cores')

  // Get all directories recursively
  const allEntries = await fsPromises.readdir(coresDir, {
    recursive: true,
    withFileTypes: true,
  })

  /** @type {Record<string, number>} */
  const coreSizes = {}

  // Collect core directories (depth 3 from coresDir)
  const coreDirs = new Map()
  for (const entry of allEntries) {
    if (!entry.isDirectory()) continue

    // entry.path is the parent directory, entry.name is the directory name
    const fullPath = path.join(entry.path ?? entry.parentPath, entry.name)
    const relativePath = path.relative(coresDir, fullPath)
    const depth = relativePath.split(path.sep).length

    if (depth === 3) {
      // This is a core directory (e.g., cores/18/76/1876...)
      coreDirs.set(fullPath, entry.name)
    }
  }

  // Calculate size for each core
  for (const [corePath, discoveryKey] of coreDirs) {
    const coreFiles = await fsPromises.readdir(corePath)

    // Skip if not a valid hypercore directory
    if (!coreFiles.includes('oplog')) {
      continue
    }

    // Calculate total size of all files in this core
    let totalSize = 0
    for (const file of coreFiles) {
      const filePath = path.join(corePath, file)
      const stats = await fsPromises.stat(filePath)
      totalSize += stats.size
    }

    coreSizes[discoveryKey] = totalSize
  }

  return coreSizes
}

/**
 * Calculate how much data the hypercore data in a project is using
 * @param {string} projectCorestorePath
 * @returns
 */
export async function storageForProject(projectCorestorePath) {
  // Pass the corestore path, not the project storage path
  const coreSizes = await calculateCoreSizes(projectCorestorePath)

  let largestCoreSize = 0
  let totalSize = 0
  let coreCount = 0
  for (const size of Object.values(coreSizes)) {
    totalSize += size
    if (size > largestCoreSize) largestCoreSize = size
    coreCount++
  }
  return {
    totalSize,
    coreCount,
    largestCoreSize,
  }
}

/**
 * @param {string} path
 * @returns
 */
export function makeDefaultCorestoreStorage(path) {
  return new CorestoreStorage(path, {
    readOnly: false,
  })
}

/**
 * Run a migration dry-run for all projects in a MapeoManager storage folder.
 *
 * This performs a dry-run of the hypercore-storage migration (v0 -> v1) for each
 * project's corestore. In dry-run mode, the migration analyzes what changes would
 * be made without actually modifying the storage.
 *
 * @param {string} managerPath - Path to the MapeoManager storage folder
 * @param {(doneSoFar: number, totalCores: number) => void} [onProgress] - Callcback called after each core migrates
 * @returns {Promise<Record<string, { migrated: boolean, error?: Error }>>}
 *         Map of project IDs to migration status
 */
export async function migrateStorage(
  managerPath,
  onProgress,
  makeStorage = makeDefaultCorestoreStorage
) {
  const projectIds = await listProjectsFromStorage(managerPath)

  // Pre-count total cores across all projects that need migration
  let totalCoresToMigrate = 0
  for (const projectId of projectIds) {
    const projectCorestorePath = path.join(managerPath, projectId, 'corestore')
    if (await needsMigration(projectCorestorePath)) {
      const { coreCount } = await storageForProject(projectCorestorePath)
      totalCoresToMigrate += coreCount
    }
  }

  /** @type {Record<string, { migrated: boolean, error?: Error }>} */
  const results = {}
  let migratedSoFar = 0
  onProgress?.(migratedSoFar, totalCoresToMigrate)

  for (const projectId of projectIds) {
    const projectCorestorePath = path.join(managerPath, projectId, 'corestore')
    if (!(await needsMigration(projectCorestorePath))) continue

    try {
      // Initialize CorestoreStorage for this project
      const storage = makeStorage(projectCorestorePath)

      try {
        // Wait for the storage to be ready
        await storage.ready()

        // Run migration on corestore
        await migrateStore(storage, {
          version: 1,
          dryRun: false,
          gc: true,
        })

        for await (const { discoveryKey } of storage.createCoreStream()) {
          // Will trigger core migration
          await storage.resumeCore(discoveryKey)
          migratedSoFar++
          onProgress?.(migratedSoFar, totalCoresToMigrate)
        }

        results[projectId] = {
          migrated: true,
        }
      } finally {
        // Clean up
        await storage.close()
      }
    } catch (error) {
      console.log(error)
      results[projectId] = {
        migrated: false,
        error: ensureKnownError(error),
      }
    }
  }

  return results
}

/**
 * Check if a project's corestore needs migration from v0 to v1.
 *
 * Migration is needed if the storage uses the old flat file format (v0)
 * instead of the new RocksDB-based format (v1).
 *
 * @param {string} corestorePath - Path to the corestore directory
 * @returns {Promise<boolean>} - True if migration is needed
 */
export async function needsMigration(corestorePath) {
  const coresDir = path.join(corestorePath, 'cores')

  // Check for old v0 format (flat files in cores/)
  const hasCoresDir = await hasEntity(coresDir)

  return hasCoresDir
}

/**
 * Checks if it makes sense to migrate. Are we already migrated? Do we have enough storage to migrate?
 * Available space needs to be at least 1.5x the largest core
 * @param {string} managerPath Folder where the MapeoManager stores its data
 * @param {number} availableStorage How much storage is available to migrate.
 * @returns {Promise<{shouldUpgrade:boolean, useFallback: boolean, reason: MigrationReason}>}
 */
export async function checkShouldMigrate(managerPath, availableStorage) {
  const projectIds = await listProjectsFromStorage(managerPath)

  let needsUpgrade = false

  for (const projectId of projectIds) {
    const projectCorestorePath = path.join(managerPath, projectId, 'corestore')
    if (!(await needsMigration(projectCorestorePath))) continue
    needsUpgrade = true
    const { largestCoreSize } = await storageForProject(projectCorestorePath)
    if (largestCoreSize * AVAILABLE_SPACE_MULTIPLIER >= availableStorage) {
      return {
        shouldUpgrade: false,
        useFallback: true,
        reason: MIGRATION_REASON_NO_SPACE,
      }
    }
  }

  if (!needsUpgrade) {
    return {
      shouldUpgrade: false,
      useFallback: false,
      reason: MIGRATION_REASON_ALREADY_UPGRADED,
    }
  }

  return {
    shouldUpgrade: true,
    useFallback: false,
    reason: MIGRATION_REASON_NEEDS_UPGRADE,
  }
}

/**
 * @param {string} path
 * @returns
 */
async function hasEntity(path) {
  return await fsPromises
    .access(path)
    .then(() => true)
    .catch(() => false)
}
