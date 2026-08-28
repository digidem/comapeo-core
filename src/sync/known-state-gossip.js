import { eq, and } from 'drizzle-orm'

const AUTH_INDEX = 'authIndex'
const CONFIG_INDEX = 'configIndex'
const DATA_INDEX = 'dataIndex'

import { knownStatesTable } from '../schema/project.js'

export default class KnownStateGossip extends TypedEmitter {
  #ownId = ''
  #db = null

  constructor({ ownId, db }) {
    super()
    this.#ownId = ownId
    this.#db = db
  }

  receiveGossipedStates({ peers }) {
    for (const { deviceId, states } of peers) {
      if (eq(deviceId, this.#ownId)) continue
      for (const { writerDeviceId, ...state } of states) {
        this.#updateKnown(deviceId, writerDeviceId, state)
      }
    }
  }

  doesPeerKnowEvent(knowerId, writerDeviceId, dataType, eventIndex) {
    // TODO: SQL query,
    const result = this.#db
      .select()
      .from(knownStatesTable)
      .where(
        and(
          eq(knownStatesTable.deviceId, knowerId),
          eq(knownStatesTable.writerDeviceId, writerDeviceId),
          eq(knownStatesTable.dataType, dataType)
        )
      )
      .get()
    if (!result) return false
    const { index } = result

    return index > eventIndex
  }

  updateOwnState(writerDeviceId, states) {
    this.#updateKnown(this.#ownId, writerDeviceId, states)
    const peers = [this.getKnownFor(this.#ownId)]
    this.broadcastKnownUpdate({ peers })
  }

  // Call this when we get a new peer connection
  broadcastKnown() {
    this.#broadcastKnownUpdate(this.#getAllKnown())
  }

  #broadcastKnownUpdate(knownStates) {
    this.emit('update', knownStates)
  }

  #getKnownFor(deviceId) {
    // Search for known states for specific peer
    const states = []

    return { deviceId, states }
  }

  #getAllKnown() {
    // Search known states
    const all = this.#db.select().from(knownStatesTable).all()

    const groups = new Map()
    // Group by peerKnows deviceID
    const peers = {}
    return { peers }
  }

  #updateKnown(deviceId, writerDeviceId, state) {
    // Split out states fior each index
    // Upsert items if one with a smaller index does not exist
    // Return if upsert happened or not
    return false
  }
}
