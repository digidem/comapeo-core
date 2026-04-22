import fsPromises from 'node:fs/promises'
import path from 'node:path'

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
  const entries = await fsPromises.readdir(storagePath, {
    withFileTypes: true,
  })

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
export async function calculateCoreSizes(storagePath) {
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
    const fullPath = path.join(entry.path, entry.name)
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
 * Calculate storage breakdown per project.
 *
 * @param {string} storagePath - Path to the top-level storage directory
 * @returns {Promise<Record<string, { totalSize: number, coreCount: number, cores: Record<string, number> }>>}
 *         Map of project IDs to storage info
 */
export async function calculateStoragePerProject(storagePath) {
  const projectIds = await listProjectsFromStorage(storagePath)

  /** @type {Record<string, { totalSize: number, coreCount: number, cores: Record<string, number> }>} */
  const projectStorage = {}

  for (const projectId of projectIds) {
    // Pass the corestore path, not the project storage path
    const projectCorestorePath = path.join(storagePath, projectId, 'corestore')
    const coreSizes = await calculateCoreSizes(projectCorestorePath)

    const totalSize = Object.values(coreSizes).reduce(
      (sum, size) => sum + size,
      0
    )
    const coreCount = Object.keys(coreSizes).length

    projectStorage[projectId] = {
      totalSize,
      coreCount,
      cores: coreSizes,
    }
  }

  return projectStorage
}
