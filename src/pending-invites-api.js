import { eq, sql } from 'drizzle-orm'
import { pendingInvitesTable } from './schema/project.js'
import { isRoleIdForNewInvite } from './roles.js'
import {
  ensureKnownError,
  getErrorCode,
  PendingInviteAlreadyExistsError,
} from './errors.js'

/** @import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3' */
/** @import { InviteOptions } from './member-api.js' */

/**
 * @typedef {object} PendingInviteRecord
 * @property {string} inviteId Hex string invite ID (primary key)
 * @property {Buffer} inviteIdBuffer Binary invite ID
 * @property {string} url Invite URL
 * @property {import('./roles.js').RoleIdForNewInvite} roleId
 * @property {string} [roleName]
 * @property {string} [roleDescription]
 * @property {string} [inviteeDeviceId] Device ID of invitee (set when redeemed)
 * @property {number} createdAt Timestamp when created
 */

/**
 * @typedef {object} PendingInviteCreate
 * @property {string} inviteId
 * @property {Buffer} inviteIdBuffer
 * @property {string} url
 * @property {InviteOptions} opts
 */

/**
 * @typedef {object} PendingInviteUpdate
 * @property {string} inviteeDeviceId
 */

/**
 * API for CRUD operations on pending invites over internet
 */
export class PendingInvitesApi {
  /** @type {BetterSQLite3Database} */
  #db
  #sql

  /**
   * @param {BetterSQLite3Database} db Drizzle database instance
   */
  constructor(db) {
    this.#db = db
    this.#sql = {
      getById: db
        .select()
        .from(pendingInvitesTable)
        .where(eq(pendingInvitesTable.inviteId, sql.placeholder('inviteId')))
        .limit(1)
        .prepare(),
      getAll: db.select().from(pendingInvitesTable).prepare(),
    }
  }

  /**
   * Create a new pending invite record
   * @param {PendingInviteCreate} data
   * @returns {Promise<void>}
   */
  async create(data) {
    try {
      await this.#db.insert(pendingInvitesTable).values({
        inviteId: data.inviteId,
        inviteIdBuffer: data.inviteIdBuffer,
        url: data.url,
        roleId: data.opts.roleId,
        roleName: data.opts.roleName,
        roleDescription: data.opts.roleDescription,
        createdAt: Date.now(),
      })
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
   * @returns {Promise<PendingInviteRecord | undefined>}
   */
  async getById(inviteId) {
    const row = this.#sql.getById.get({ inviteId })
    if (!row) return undefined

    if (!isRoleIdForNewInvite(row.roleId)) {
      throw new Error(`Invalid roleId in database: ${row.roleId}`)
    }

    return /** @type {PendingInviteRecord} */ ({
      ...row,
      inviteeDeviceId: row.inviteeDeviceId ?? undefined,
    })
  }

  /**
   * Get all pending invites
   * @returns {Promise<PendingInviteRecord[]>}
   */
  async getAll() {
    const rows = this.#sql.getAll.all()

    return rows.map((row) => {
      if (!isRoleIdForNewInvite(row.roleId)) {
        throw new Error(`Invalid roleId in database: ${row.roleId}`)
      }
      return /** @type {PendingInviteRecord} */ ({
        ...row,
        inviteeDeviceId: row.inviteeDeviceId ?? undefined,
      })
    })
  }

  /**
   * Update a pending invite (e.g., set invitee device ID when redeemed)
   * @param {string} inviteId
   * @param {PendingInviteUpdate} updates
   * @returns {Promise<void>}
   */
  async update(inviteId, updates) {
    await this.#db
      .update(pendingInvitesTable)
      .set(updates)
      .where(eq(pendingInvitesTable.inviteId, inviteId))
  }

  /**
   * Delete a pending invite
   * @param {string} inviteId
   * @returns {Promise<void>}
   */
  async delete(inviteId) {
    await this.#db
      .delete(pendingInvitesTable)
      .where(eq(pendingInvitesTable.inviteId, inviteId))
  }

  /**
   * Delete all pending invites
   * @returns {Promise<void>}
   */
  async deleteAll() {
    await this.#db.delete(pendingInvitesTable)
  }
}
