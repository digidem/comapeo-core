import { parse as simpleParseBcp47 } from 'bcp-47'
import { bcp47Normalize } from 'bcp-47-normalize'
import { normalizePrimaryLanguageSubtag } from './primary-language-subtag.js'
import { normalizeRegionSubtag } from './region-subtag.js'

/**
 * A stricter parsing of BCP 47 language tags than the one provided by the
 * `bcp-47` package, which does not check if the subtags are valid, and does not
 * normalize the subtag. Primary language subtags other than ISO 639-1 or ISO
 * 639-3 are ignored (parses as null). Subtags other than primary language and
 * region are ignored. ISO 639-1 codes are converted to their ISO 639-3
 * equivalent. UN M.49 region codes are converted to their ISO 3166-1 alpha-2
 * equivalent if one exists.
 *
 * @param {string} languageTag - A BCP 47 language tag.
 * @returns {{language: string | null | undefined, region: string | null | undefined}} - The parsed and normalized language and region subtags, or null if the input is not valid.
 */
export function parseBcp47(languageTag) {
  const normalized = bcp47Normalize(languageTag)
  const { language, region } = simpleParseBcp47(normalized)
  return {
    language: language && normalizePrimaryLanguageSubtag(language),
    region: region && normalizeRegionSubtag(region),
  }
}
