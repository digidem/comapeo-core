import { valueOf } from '@comapeo/schema'
import { generate } from '@mapeo/mock-data'
import { excludeKeys } from 'filter-obj'

/** @import { VersionEntry } from './versions.js' */

/**
 * @typedef {ReturnType<typeof generateCurrentObservation>} ObservationValue
 */

/**
 * Strips the attachment fields added in schema version 1.7.0. Core versions
 * using an older schema have `create()` types that reject them; at runtime
 * the fields would be dropped in the protobuf round-trip on the old peer
 * anyway.
 *
 * @param {ObservationValue} value
 */
function stripPost1_7_0AttachmentFields(value) {
  return {
    ...value,
    attachments: value.attachments.map((attachment) => {
      if (attachment.type === 'photo') {
        return excludeKeys(
          attachment,
          /** @type {const} */ ([
            'position',
            'createdAt',
            'photoExif',
            'external',
          ])
        )
      } else {
        return excludeKeys(
          attachment,
          /** @type {const} */ (['position', 'createdAt', 'external'])
        )
      }
    }),
  }
}

/**
 * Adapters that convert a current-schema observation value into one that an
 * old version's `observation.create()` accepts, keyed by that version's
 * `schemaVersion` (see ./versions.js). Versions without an entry accept
 * current-schema values unchanged.
 *
 * @type {Record<string, (value: ObservationValue) => unknown>}
 */
const OBSERVATION_ADAPTERS = {
  '1.4.1': stripPost1_7_0AttachmentFields,
  '1.5.0': stripPost1_7_0AttachmentFields,
}

/**
 * A mock observation value using the current (working-tree) schema.
 */
export function generateCurrentObservation() {
  return valueOf(generate('observation')[0])
}

/**
 * A mock observation value that `observation.create()` on the given old core
 * version accepts. Typed `any` because it is passed to an old (untyped)
 * version's `create()`.
 *
 * @param {VersionEntry} version
 * @returns {any}
 */
export function generateObservationFor(version) {
  const adapt = OBSERVATION_ADAPTERS[version.schemaVersion]
  const observation = generateCurrentObservation()
  return adapt ? adapt(observation) : observation
}
