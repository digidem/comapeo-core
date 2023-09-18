// @ts-check
import { EventEmitter } from 'eventemitter3'
import { extractMessageEventData } from './utils.js'

// Ideally unique ID used for identifying "global" Mapeo IPC messages
export const MAPEO_IPC_ID = '@@mapeo'
// Ideally unique ID used for identifying messages specific to a MapeoManager instance
export const MANAGER_CHANNEL_ID = '@@manager'

/**
 * @typedef {Object} Events
 * @property {(message: any) => void} message
 */

/**
 * Node's built-in types for MessagePort are misleading so we opt for this limited type definition
 * that fits our usage and works in both Node and browser contexts
 * @typedef {EventTarget & { postMessage: (message: any) => void }} MessagePortLike
 */

export class SubChannel extends EventEmitter {
  #id
  #messagePort
  /** @type {'idle' | 'active' | 'closed'} */
  #state
  /** @type {Array<{id: string, message: any}>} */
  #queued
  #handleMessageEvent

  /**
   * @param {MessagePortLike} messagePort Parent channel to add namespace to
   * @param {string} id ID for the subchannel
   */
  constructor(messagePort, id) {
    super()

    this.#id = id
    this.#messagePort = messagePort
    this.#state = 'idle'
    this.#queued = []

    /**
     * @param {unknown} event
     */
    this.#handleMessageEvent = (event) => {
      const value = extractMessageEventData(event)

      if (!isRelevantEvent(value)) return

      const { id, message } = value

      if (this.#id !== id) return

      switch (this.#state) {
        case 'idle': {
          this.#queued.push(value)
          break
        }
        case 'active': {
          this.emit('message', message)
          break
        }
        case 'closed': {
          // no-op if closed (the event listener should be removed anyway)
          break
        }
      }
    }

    this.#messagePort.addEventListener('message', this.#handleMessageEvent)
  }

  get id() {
    return this.#id
  }

  /**
   * Send messages with the subchannel's ID
   * @param {any} message
   */
  postMessage(message) {
    this.#messagePort.postMessage({ id: this.#id, message })
  }

  start() {
    if (this.#state !== 'idle') return

    this.#state = 'active'

    /** @type {{id: string, message: any} | undefined} */
    let event
    while ((event = this.#queued.shift())) {
      this.#handleMessageEvent(event)
    }
  }

  close() {
    if (this.#state !== 'closed') return

    this.#state = 'closed'
    this.#queued = []

    // Node types are incorrect (as of v14, Node's MessagePort should also extend [EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget))
    this.#messagePort.removeEventListener('message', this.#handleMessageEvent)
  }
}

/**
 * @param {unknown} event
 * @returns {event is { id: string, message: any }}
 */
function isRelevantEvent(event) {
  if (!event || typeof event !== 'object') return false
  if (!('id' in event && 'message' in event)) return false
  if (typeof event.id !== 'string') return false
  return true
}
