import { and, eq, sql } from 'drizzle-orm'
import ReadyResource from 'ready-resource'
import { pendingInvitesTable } from '../schema/client.js'
import { isRoleIdForNewInvite } from '../roles.js'
import {
  ensureKnownError,
  getErrorCode,
  PendingInviteAlreadyExistsError,
} from '../errors.js'
import { deNullify } from '../utils.js'

/** @import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3' */
/** @import { InviteOptions } from '../member-api.js' */

/**
 * @typedef {object} PendingInviteRecord
 * @property {string} inviteId Hex string invite ID (primary key)
 * @property {Buffer} inviteIdBuffer Binary invite ID
 * @property {string} url Invite URL
 * @property {import('../roles.js').RoleIdForNewInvite} roleId
 * @property {string} [roleName]
 * @property {string} [roleDescription]
 * @property {string} [inviteeDeviceId] Device ID of invitee (set when redeemed)
 * @property {number} createdAt Timestamp when created
 */

/**
 * @typedef {object} PendingInviteCreate
 * @property {string} projectId
 * @property {string} inviteId
 * @property {Buffer} inviteIdBuffer
 * @property {string} url
 * @property {InviteOptions} opts
 */

/**
 * @typedef {object} PendingInviteUpdate
 * @property {string} inviteeDeviceId
 */

const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000

export class PendingInvitesApiForProject {
  #projectId
  /** @type {PendingInvitesApi} */
  #pendingInvitesApi

  /**
   *
   * @param {string} projectId
   * @param {PendingInvitesApi} pendingInvitesApi
   */
  constructor(projectId, pendingInvitesApi) {
    this.#projectId = projectId
    this.#pendingInvitesApi = pendingInvitesApi
  }

  /**
   * Create a new pending invite record
   * @param {Omit<PendingInviteCreate, 'projectId'>} data
   * @returns {Promise<void>}
   */
  async create(data) {
    await this.#pendingInvitesApi.ready()
    return this.#pendingInvitesApi.create({
      ...data,
      projectId: this.#projectId,
    })
  }

  /**
   * Get a pending invite by invite ID
   * @param {string} inviteId
   * @returns {Promise<PendingInviteRecord | undefined>}
   */
  async getById(inviteId) {
    await this.#pendingInvitesApi.ready()
    return this.#pendingInvitesApi.getById(inviteId, this.#projectId)
  }

  /**
   * Get all pending invites for the project
   * @returns {Promise<PendingInviteRecord[]>}
   */
  async getAll() {
    await this.#pendingInvitesApi.ready()
    return this.#pendingInvitesApi.getAllForProject(this.#projectId)
  }

  /**
   * Update a pending invite (e.g., set invitee device ID when redeemed)
   * @param {string} inviteId
   * @param {PendingInviteUpdate} updates
   * @returns {Promise<void>}
   */
  async update(inviteId, updates) {
    await this.#pendingInvitesApi.ready()
    return this.#pendingInvitesApi.update(inviteId, this.#projectId, updates)
  }

  /**
   * Delete a pending invite
   * @param {string} inviteId
   * @returns {Promise<void>}
   */
  async delete(inviteId) {
    await this.#pendingInvitesApi.ready()
    return this.#pendingInvitesApi.delete(inviteId)
  }

  /**
   * Delete all pending invites for the project
   * @returns {Promise<void>}
   */
  async deleteAll() {
    await this.#pendingInvitesApi.ready()
    return this.#pendingInvitesApi.deleteAllFrom(this.#projectId)
  }
}

/**
 * API for CRUD operations on pending invites over internet
 */
/**
 * @type {ReadyResource}
 */
export class PendingInvitesApi extends ReadyResource {
  /** @type {BetterSQLite3Database} */
  #db
  #sql
  /** @type {(shouldListen: boolean) => Promise<void>} */
  #setShouldListenOverInternet

  /**
   * @param {BetterSQLite3Database} db Drizzle database instance
   * @param {(shouldListen: boolean) => Promise<void>} setShouldListenOverInternet
   */
  constructor(db, setShouldListenOverInternet) {
    super()
    this.#db = db
    this.#setShouldListenOverInternet = setShouldListenOverInternet
    this.#sql = {
      getById: db
        .select()
        .from(pendingInvitesTable)
        .where(
          and(
            eq(pendingInvitesTable.inviteId, sql.placeholder('inviteId')),
            eq(pendingInvitesTable.projectId, sql.placeholder('projectId'))
          )
        )
        .limit(1)
        .prepare(),
      getAll: db.select().from(pendingInvitesTable).prepare(),
      getAllForProject: db
        .select()
        .from(pendingInvitesTable)
        .where(eq(pendingInvitesTable.projectId, sql.placeholder('projectId')))
        .prepare(),
      getExpired: db
        .select()
        .from(pendingInvitesTable)
        .where(
          sql`${pendingInvitesTable.createdAt} < ${sql.placeholder('cutoff')}`
        )
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
  }

  /**
   * Delete all pending invites whose createdAt timestamp is older than 24 hours.
   */
  async #clearExpired() {
    const cutoff = Date.now() - INVITE_EXPIRY_MS
    const expired = this.#sql.getExpired.all({ cutoff })
    for (const row of expired) {
      await this.#db
        .delete(pendingInvitesTable)
        .where(eq(pendingInvitesTable.inviteId, row.inviteId))
    }
    // Update the listen state once, after all deletions
    if (expired.length > 0) {
      await this.#checkSetShouldListenOverInternet(false)
    }
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
    }
  }

  /**
   * Create a new pending invite record
   * @param {PendingInviteCreate} data
   * @returns {Promise<void>}
   */
  async create(data) {
    await this.ready()
    try {
      await this.#db.insert(pendingInvitesTable).values({
        projectId: data.projectId,
        inviteId: data.inviteId,
        inviteIdBuffer: data.inviteIdBuffer,
        url: data.url,
        roleId: data.opts.roleId,
        roleName: data.opts.roleName,
        roleDescription: data.opts.roleDescription,
        createdAt: Date.now(),
      })

      await this.#checkSetShouldListenOverInternet(true)
    } catch (err) {
      if (getErrorCode(err) === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        throw new PendingInviteAlreadyExistsError({ inviteId: data.inviteId })
      }
      throw ensureKnownError(err)
    }
  }

  /**
   * Get a pending invite by invite ID
   * @param {string} inviteId
   * @param {string} projectId
   * @returns {Promise<PendingInviteRecord | undefined>}
   */
  async getById(inviteId, projectId) {
    await this.ready()
    await this.#clearExpired()
    const row = this.#sql.getById.get({ inviteId, projectId })
    if (!row) return undefined

    if (!isRoleIdForNewInvite(row.roleId)) {
      throw new Error(`Invalid roleId in database: ${row.roleId}`)
    }

    return /** @type {PendingInviteRecord} */ (deNullify(row))
  }

  /**
   * Get all pending invites
   * @returns {Promise<PendingInviteRecord[]>}
   */
  async getAll() {
    await this.ready()
    await this.#clearExpired()
    const rows = this.#sql.getAll.all()

    return rows.map((row) => {
      if (!isRoleIdForNewInvite(row.roleId)) {
        throw new Error(`Invalid roleId in database: ${row.roleId}`)
      }
      return /** @type {PendingInviteRecord} */ (deNullify(row))
    })
  }

  /**
   * Get all pending invites
   * @param {string} projectId
   * @returns {Promise<PendingInviteRecord[]>}
   */
  async getAllForProject(projectId) {
    await this.ready()
    await this.#clearExpired()
    const rows = this.#sql.getAllForProject.all({
      projectId,
    })

    return rows.map((row) => {
      if (!isRoleIdForNewInvite(row.roleId)) {
        throw new Error(`Invalid roleId in database: ${row.roleId}`)
      }
      return /** @type {PendingInviteRecord} */ (deNullify(row))
    })
  }

  /**
   * Update a pending invite (e.g., set invitee device ID when redeemed)
   * @param {string} inviteId
   * @param {string} projectId
   * @param {PendingInviteUpdate} updates
   * @returns {Promise<void>}
   */
  async update(inviteId, projectId, updates) {
    await this.ready()
    await this.#clearExpired()
    await this.#db
      .update(pendingInvitesTable)
      .set(updates)
      .where(
        and(
          eq(pendingInvitesTable.inviteId, inviteId),
          eq(pendingInvitesTable.projectId, projectId)
        )
      )
  }

  /**
   * Delete a pending invite
   * @param {string} inviteId
   * @returns {Promise<void>}
   */
  async delete(inviteId) {
    await this.ready()
    await this.#db
      .delete(pendingInvitesTable)
      .where(eq(pendingInvitesTable.inviteId, inviteId))

    await this.#checkSetShouldListenOverInternet(false)
  }

  /**
   * Delete all pending invites
   * @returns {Promise<void>}
   */
  async deleteAll() {
    await this.ready()
    await this.#db.delete(pendingInvitesTable)
    await this.#setShouldListenOverInternet(false)
  }

  /**
   * Delete all pending invites in a specific project
   * @param {string} projectId
   */
  async deleteAllFrom(projectId) {
    await this.ready()
    await this.#db
      .delete(pendingInvitesTable)
      .where(eq(pendingInvitesTable.projectId, projectId))

    await this.#checkSetShouldListenOverInternet(false)
  }
}
