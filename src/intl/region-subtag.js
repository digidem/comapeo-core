import { iso31661 } from 'iso-3166'
import { iso31661Alpha3ToAlpha2 } from 'iso-3166'
import { unM49 as unM49Array } from 'un-m49'

/**
 * Map of UN M.49 country codes to their corresponding ISO 3166-1 alpha-2 country codes.
 */
const unM49ToIso31661Alpha2 = new Map()

for (const region of unM49Array) {
  if (!region.iso3166) continue
  const alpha2 = iso31661Alpha3ToAlpha2[region.iso3166]
  if (!alpha2) continue
  unM49ToIso31661Alpha2.set(region.code, alpha2)
}

/**
 * Normalizes the region subtag of the IETF language tag validating that the
 * subtag is a valid UN M.49 geographical region code or a valid ISO 3166-1
 * alpha-2 country code, and using the ISO 3166-1 alpha-2 country code if one
 * exists for countries represented by UN M.49 codes.
 *
 * @param {string} subtag - A region subtag from an IETF BCP 47 language tag.
 * @returns {string | null} - The normalized region subtag, or null if the input is not valid.
 */
export function normalizeRegionSubtag(subtag) {
  if (!unM49.has(subtag) && !iso31661Alpha2.has(subtag)) {
    return null
  }
  if (unM49ToIso31661Alpha2.has(subtag)) {
    subtag = unM49ToIso31661Alpha2.get(subtag)
  }
  return subtag.toUpperCase()
}

/**
 * Set of all valid UN M.49 geographical region codes.
 */
export const unM49 = new Set(unM49Array.map((region) => region.code))

/**
 * Set of all valid ISO 3166-1 alpha-2 country codes.
 */
export const iso31661Alpha2 = new Set(iso31661.map((country) => country.alpha2))
