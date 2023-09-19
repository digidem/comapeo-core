/**
 * @typedef {Object} MapeoGetProjectPayload
 * @property {'get_project'} type
 * @property {string} projectId
 * @property {string} [error]
 *
 * @typedef {MapeoGetProjectPayload} MapeoIpcMessagePayload
 *
 */

/**
 * @template T
 * @param {T} event
 * @returns {T extends { data: infer D } ? D : T}
 */
export function extractMessageEventData(event) {
  // In browser-like contexts, the actual payload will live in the `event.data` field
  // https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/message_event#event_properties
  if (event && typeof event === 'object' && 'data' in event) {
    return /** @type {any} */ (event.data)
  }

  // In Node the event is the actual data that was sent
  return /** @type {any} */ (event)
}
