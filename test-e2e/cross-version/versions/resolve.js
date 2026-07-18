/**
 * Resolves `@comapeo/core<version>` aliases installed in this sub-package.
 * This module must live inside the sub-package so that `import.meta.resolve`
 * searches `./node_modules` (Node only searches `node_modules` directories in
 * a module's own ancestor chain).
 *
 * @param {string} version
 * @returns {Promise<string | undefined>} URL of the resolved entry point, or
 *   undefined if the version is not installed here (e.g. the sub-package has
 *   not been installed, or the version is a root-package alias instead).
 */
export async function resolveOldCoreVersion(version) {
  try {
    return await import.meta.resolve?.('@comapeo/core' + version)
  } catch {
    return undefined
  }
}
