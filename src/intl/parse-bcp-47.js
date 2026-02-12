import { parse as simpleParseBcp47 } from 'bcp-47'
import { bcp47Normalize } from 'bcp-47-normalize'
import { iso6391To6393, iso6393 } from './iso639.js'
import { iso31661 } from 'iso-3166'
import { iso31661Alpha3ToAlpha2 } from 'iso-3166'
import { unM49 as unM49Array } from 'un-m49'
import { InvalidLanguageTagError } from '../errors.js'

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
function normalizeRegionSubtag(subtag) {
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
const unM49 = new Set(unM49Array.map((region) => region.code))

/**
 * Set of all valid ISO 3166-1 alpha-2 country codes.
 */
const iso31661Alpha2 = new Set(iso31661.map((country) => country.alpha2))

/**
 * Normalize a primary language subtag to ISO 639-3 if possible.
 * @param {string} subtag - The primary language subtag to normalize.
 * @returns {string | null} - The normalized ISO 639-3 language code, or null if the input is not valid.
 */
function normalizePrimaryLanguageSubtag(subtag) {
  if (subtag.length === 2) {
    return iso6391To6393.get(subtag) || null
  } else if (subtag.length === 3) {
    return iso6393.has(subtag) ? subtag : null
  }
  // Only support ISO 639-1 and ISO 639-3 codes as primary language subtags
  return null
}

/**
 * A stricter parsing of BCP 47 language tags than the one provided by the
 * `bcp-47` package, which does not check if the subtags are valid, and does not
 * normalize the subtag. Primary language subtags other than ISO 639-1 or ISO
 * 639-3 are ignored (parses as null). Subtags other than primary language and
 * region are ignored. ISO 639-1 codes are converted to their ISO 639-3
 * equivalent. UN M.49 region codes are converted to their ISO 3166-1 alpha-2
 * equivalent if one exists.
 *
 * Will throw an error if the input is not a valid BCP 47 language tag, but will
 * return language: null without throwing if the primary language subtag does
 * not match our stricter criteria of requiring an ISO 639-1 or ISO 639-3
 * subtag.
 *
 * @param {string} languageTag - A BCP 47 language tag.
 * @returns {{language: string | null | undefined, region: string | null | undefined}} - The parsed and normalized language and region subtags, or null if the input is not valid.
 */
export function parseBcp47(languageTag) {
  const normalized = bcp47Normalize(languageTag)
  const { language, region } = simpleParseBcp47(normalized)
  if (!language) {
    throw new InvalidLanguageTagError(languageTag)
  }
  return {
    language: normalizePrimaryLanguageSubtag(language),
    region: region && normalizeRegionSubtag(region),
  }
}
