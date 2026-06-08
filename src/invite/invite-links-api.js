import { and, eq, sql } from 'drizzle-orm'
import ReadyResource from 'ready-resource'
import { inviteLinksTable } from '../schema/client.js'
import { isRoleIdForNewInvite } from '../roles.js'
import {
  ensureKnownError,
  getErrorCode,
  InviteLinkAlreadyExistsError,
} from '../errors.js'
import { deNullify } from '../utils.js'

/** @import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3' */
/** @import { InviteOptions } from '../member-api.js' */

/**
 * @typedef {object} InviteLinkRecord
 * @property {string} inviteId Hex string invite ID (primary key)
 * @property {Buffer} inviteIdBuffer Binary invite ID
 * @property {string} url Invite URL
 * @property {import('../roles.js').RoleIdForNewInvite} roleId
 * @property {string} [roleName]
 * @property {string} [roleDescription]
 * @property {number} createdAt Timestamp when created
 * @property {number} expiresAt Timestamp when the invite expires
 */

/**
 * @typedef {object} InviteLinkCreate
 * @property {string} projectId
 * @property {string} inviteId
 * @property {Buffer} inviteIdBuffer
 * @property {string} url
 * @property {InviteOptions} opts
 */

export const DEFAULT_INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000

export class InviteLinksApiForProject {
  #projectId
  /** @type {InviteLinksApi} */
  #inviteLinksApi

  /**
   *
   * @param {string} projectId
   * @param {InviteLinksApi} inviteLinksApi
   */
  constructor(projectId, inviteLinksApi) {
    this.#projectId = projectId
    this.#inviteLinksApi = inviteLinksApi
  }

  /**
   * Create a new invite link record
   * @param {Omit<InviteLinkCreate, 'projectId'>} data
   * @returns {Promise<void>}
   */
  async create(data) {
    await this.#inviteLinksApi.ready()
    return this.#inviteLinksApi.create({
      ...data,
      projectId: this.#projectId,
    })
  }

  /**
   * Get an invite link by invite ID
   * @param {string} inviteId
   * @returns {Promise<InviteLinkRecord | undefined>}
   */
  async getById(inviteId) {
    await this.#inviteLinksApi.ready()
    return this.#inviteLinksApi.getById(inviteId, this.#projectId)
  }

  /**
   * Get all invite links for the project
   * @returns {Promise<InviteLinkRecord[]>}
   */
  async getAll() {
    await this.#inviteLinksApi.ready()
    return this.#inviteLinksApi.getAllForProject(this.#projectId)
  }

  /**
   * Delete an invite link
   * @param {string} inviteId
   * @returns {Promise<void>}
   */
  async delete(inviteId) {
    await this.#inviteLinksApi.ready()
    return this.#inviteLinksApi.delete(inviteId)
  }

  /**
   * Delete all invite links for the project
   * @returns {Promise<void>}
   */
  async deleteAll() {
    await this.#inviteLinksApi.ready()
    return this.#inviteLinksApi.deleteAllFrom(this.#projectId)
  }
}

/**
 * API for CRUD operations on invite links over internet
 */
/**
 * @type {ReadyResource}
 */
export class InviteLinksApi extends ReadyResource {
  /** @type {BetterSQLite3Database} */
  #db
  #sql
  /** @type {(shouldListen: boolean) => Promise<void>} */
  #setShouldListenOverInternet
  /** @type {ReturnType<typeof setTimeout> | null} */
  #clearExpiredTimer = null
  /** @type {number} */
  #expiryMs

  /**
   * @param {BetterSQLite3Database} db Drizzle database instance
   * @param {(shouldListen: boolean) => Promise<void>} setShouldListenOverInternet
   * @param {number} [expiryMs] milliseconds before invites expire (default: 24 hours)
   */
  constructor(
    db,
    setShouldListenOverInternet,
    expiryMs = DEFAULT_INVITE_EXPIRY_MS
  ) {
    super()
    this.#db = db
    this.#setShouldListenOverInternet = setShouldListenOverInternet
    this.#expiryMs = expiryMs
    this.#sql = {
      getById: db
        .select()
        .from(inviteLinksTable)
        .where(
          and(
            eq(inviteLinksTable.inviteId, sql.placeholder('inviteId')),
            eq(inviteLinksTable.projectId, sql.placeholder('projectId'))
          )
        )
        .limit(1)
        .prepare(),
      getAll: db.select().from(inviteLinksTable).prepare(),
      getAllForProject: db
        .select()
        .from(inviteLinksTable)
        .where(eq(inviteLinksTable.projectId, sql.placeholder('projectId')))
        .prepare(),
      getExpired: db
        .select()
        .from(inviteLinksTable)
        .where(
          sql`${inviteLinksTable.expiresAt} < ${sql.placeholder('cutoff')}`
        )
        .prepare(),
      getOldest: db
        .select()
        .from(inviteLinksTable)
        .orderBy(sql`${inviteLinksTable.createdAt} ASC`)
        .limit(1)
        .prepare(),
    }
  }

  async _open() {
    // Clear expired invites and check if listening should be enabled
    await this.#clearExpired()
    const count = this.#sql.getAll.all().length
    if (count > 0) {
      await this.#setShouldListenOverInternet(true)
    }
    this.#scheduleExpired()
  }

  async _close() {
    this.#cancelScheduleExpired()
  }

  /**
   * Delete all invite links whose createdAt timestamp is older than 24 hours.
   */
  async #clearExpired() {
    const cutoff = Date.now()
    const expired = this.#sql.getExpired.all({ cutoff })
    for (const row of expired) {
      await this.#db
        .delete(inviteLinksTable)
        .where(eq(inviteLinksTable.inviteId, row.inviteId))
    }
    // Update the listen state once, after all deletions
    if (expired.length > 0) {
      await this.#checkSetShouldListenOverInternet(false)
    }
  }

  /**
   * Cancel the scheduled expiry timer
   */
  #cancelScheduleExpired() {
    if (this.#clearExpiredTimer !== null) {
      clearTimeout(this.#clearExpiredTimer)
      this.#clearExpiredTimer = null
    }
  }

  /**
   * Schedule a timeout to clear expired invites a few seconds after the oldest
   * invite is expected to expire. Fires once, then reschedules itself.
   */
  #scheduleExpired() {
    this.#cancelScheduleExpired()
    const oldest = this.#sql.getOldest.get()
    if (!oldest) return
    const delay = Math.max(0, oldest.expiresAt - Date.now())
    this.#clearExpiredTimer = setTimeout(async () => {
      this.#clearExpiredTimer = null
      await this.#clearExpired()
      this.#scheduleExpired()
    }, delay)
    this.#clearExpiredTimer.unref()
  }

  /**
   * Check if we should be listening over the internet based on
   * total invite count across all projects.
   * Only calls the callback when transitioning from 0 to 1 (true)
   * or from 1 to 0 (false).
   * @param {boolean} direction - true if we just added, false if we just removed
   */
  async #checkSetShouldListenOverInternet(direction) {
    const count = this.#sql.getAll.all().length
    if (direction && count === 1) {
      await this.#setShouldListenOverInternet(true)
    } else if (!direction && count === 0) {
      await this.#setShouldListenOverInternet(false)
      // Cancel the scheduled expiry timer since there are no invites left
      this.#cancelScheduleExpired()
    }
  }

  getSeedTime() {
    const oldest = this.#sql.getOldest.get()
    if (!oldest) return Date.now()
    return oldest.seedTime
  }

  /**
   * Create a new invite link record
   * @param {InviteLinkCreate} data
   * @returns {Promise<void>}
   */
  async create(data) {
    await this.ready()
    try {
      await this.#db.insert(inviteLinksTable).values({
        projectId: data.projectId,
        inviteId: data.inviteId,
        inviteIdBuffer: data.inviteIdBuffer,
        url: data.url,
        roleId: data.opts.roleId,
        roleName: data.opts.roleName,
        roleDescription: data.opts.roleDescription,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.#expiryMs,
        seedTime: this.getSeedTime(),
      })

      await this.#checkSetShouldListenOverInternet(true)
      // If this is the only invite, schedule expiry cleanup
      const count = this.#sql.getAll.all().length
      if (count === 1) {
        this.#scheduleExpired()
      }
    } catch (err) {
      if (getErrorCode(err) === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        throw new InviteLinkAlreadyExistsError({ inviteId: data.inviteId })
      }
      throw ensureKnownError(err)
    }
  }

  /**
   * Get a invite link by invite ID
   * @param {string} inviteId
   * @param {string} projectId
   * @returns {Promise<InviteLinkRecord | undefined>}
   */
  async getById(inviteId, projectId) {
    await this.ready()
    const row = this.#sql.getById.get({ inviteId, projectId })
    if (!row) return undefined

    if (!isRoleIdForNewInvite(row.roleId)) {
      throw new Error(`Invalid roleId in database: ${row.roleId}`)
    }

    return /** @type {InviteLinkRecord} */ (deNullify(row))
  }

  /**
   * Get all invite links
   * @returns {Promise<InviteLinkRecord[]>}
   */
  async getAll() {
    await this.ready()
    const rows = this.#sql.getAll.all()

    return rows.map((row) => {
      if (!isRoleIdForNewInvite(row.roleId)) {
        throw new Error(`Invalid roleId in database: ${row.roleId}`)
      }
      return /** @type {InviteLinkRecord} */ (deNullify(row))
    })
  }

  /**
   * Get all invite links
   * @param {string} projectId
   * @returns {Promise<InviteLinkRecord[]>}
   */
  async getAllForProject(projectId) {
    await this.ready()
    const rows = this.#sql.getAllForProject.all({
      projectId,
    })

    return rows.map((row) => {
      if (!isRoleIdForNewInvite(row.roleId)) {
        throw new Error(`Invalid roleId in database: ${row.roleId}`)
      }
      return /** @type {InviteLinkRecord} */ (deNullify(row))
    })
  }

  /**
   * Delete a invite link
   * @param {string} inviteId
   * @returns {Promise<void>}
   */
  async delete(inviteId) {
    await this.ready()
    await this.#db
      .delete(inviteLinksTable)
      .where(eq(inviteLinksTable.inviteId, inviteId))

    await this.#checkSetShouldListenOverInternet(false)
  }

  /**
   * Delete all invite links
   * @returns {Promise<void>}
   */
  async deleteAll() {
    await this.ready()
    await this.#db.delete(inviteLinksTable)
    await this.#setShouldListenOverInternet(false)
    this.#cancelScheduleExpired()
  }

  /**
   * Delete all invite links in a specific project
   * @param {string} projectId
   */
  async deleteAllFrom(projectId) {
    await this.ready()
    await this.#db
      .delete(inviteLinksTable)
      .where(eq(inviteLinksTable.projectId, projectId))

    await this.#checkSetShouldListenOverInternet(false)
  }
}
