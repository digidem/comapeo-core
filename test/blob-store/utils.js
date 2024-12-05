import test from 'node:test'
import assert from 'node:assert/strict'
import { filePathMatchesFilter } from '../../src/blob-store/utils.js'

test('filePathMatchesFilter', () => {
  const filter = {
    photo: ['a', 'b'],
    video: [],
  }

  const shouldMatch = [
    '/photo/a/foo.jpg',
    '/photo/b/foo.jpg',
    '/photo/a/',
    '/video/foo.mp4',
    '/video/foo/bar.mp4',
    '/video/',
    '/video///',
  ]
  for (const filePath of shouldMatch) {
    assert(
      filePathMatchesFilter(filter, filePath),
      `${filePath} matches filter`
    )
  }

  const shouldntMatch = [
    '/photo/c/foo.jpg',
    '/photo/c/',
    '/photo/a',
    '/photo/ax/foo.jpg',
    '/photo/c/../a/foo.jpg',
    '/photo',
    '/photo/',
    '/photo//',
    '/PHOTO/a/foo.jpg',
    '/audio/a/foo.mp3',
    'photo/a/foo.jpg',
    '//photo/a/foo.jpg',
    ' /photo/a/foo.jpg',
    '/hasOwnProperty/',
    '/hasOwnProperty/a/foo.jpg',
  ]
  for (const filePath of shouldntMatch) {
    assert(
      !filePathMatchesFilter(filter, filePath),
      `${filePath} doesn't match filter`
    )
  }
})
