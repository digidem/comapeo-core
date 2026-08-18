declare module 'hypercore-storage/migrations/0/index.js' {
  import type CorestoreStorage from 'hypercore-storage'

  interface MigrationOptions {
    version: number
    dryRun?: boolean
    gc?: boolean
  }

  interface CoreMigrationOptions {
    version: number
    dryRun?: boolean
    gc?: boolean
  }

  /**
   * Migrate a CorestoreStorage from version 0 to the target version.
   *
   * @param storage - The CorestoreStorage instance to migrate
   * @param opts - Migration options
   * @param opts.version - Target version to migrate to
   * @param opts.dryRun - If true, only analyze without modifying (default: true)
   * @param opts.gc - If true, remove old files after migration (default: true)
   */
  export function store(
    storage: CorestoreStorage,
    opts: MigrationOptions
  ): Promise<void>

  /**
   * Migrate an individual core from version 0 to the target version.
   *
   * @param core - The core instance to migrate (must have store, read, write methods)
   * @param opts - Migration options
   * @param opts.version - Target version to migrate to
   * @param opts.dryRun - If true, only analyze without modifying (default: true, not supported for core)
   * @param opts.gc - If true, remove old files after migration (default: true)
   */
  export function core(core: any, opts: CoreMigrationOptions): Promise<void>
}
