import test from 'node:test'
import assert from 'node:assert/strict'
import { isBlank } from '../../src/lib/string.js'

test('isBlank()', () => {
  // See [what JavaScript considers white space][0].
  // [0]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#white_space
  const unicodeWhitespace = [
    ...' \t\v\f\u00a0\ufeff\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000',
  ]

  const blanks = [
    '',
    ...unicodeWhitespace,
    ...unicodeWhitespace.map((c) => c.repeat(2)),
    ...unicodeWhitespace.flatMap((a) => unicodeWhitespace.map((b) => a + b)),
  ]
  for (const str of blanks) {
    assert(isBlank(str), `${formatCodePoints(str)} is blank`)
  }

  const notBlanks = [
    'x',
    ...unicodeWhitespace.map((c) => c + 'x'),
    ...unicodeWhitespace.map((c) => 'x' + c),
  ]
  for (const str of notBlanks) {
    assert(!isBlank(str), `${formatCodePoints(str)} is not blank`)
  }
})

/** @param {string} str */
function formatCodePoints(str) {
  /** @type {string[]} */
  let result = []
  for (const c of str) {
    const codePoint = c.codePointAt(0) ?? 0
    result.push(formatCodePoint(codePoint))
  }
  return result.join(' ')
}

/** @param {number} codePoint */
function formatCodePoint(codePoint) {
  return 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0')
}
