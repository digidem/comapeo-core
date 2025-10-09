import { iso6391To6393 } from './iso6391-to-6393.js'

/**
 * Normalize a primary language subtag to ISO 639-3 if possible.
 * @param {string} subtag - The primary language subtag to normalize.
 * @returns {string | null} - The normalized ISO 639-3 language code, or null if the input is not valid.
 */
export function normalizePrimaryLanguageSubtag(subtag) {
  if (subtag.length === 2) {
    return iso6391To6393.get(subtag) || null
  } else if (subtag.length === 3) {
    return iso6391To6393.has(subtag) ? subtag : null
  }
  // Only support ISO 639-1 and ISO 639-3 codes as primary language subtags
  return null
}
