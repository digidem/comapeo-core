// @ts-check
import test from 'brittle'
import RAM from 'random-access-memory'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomBytes } from 'node:crypto'

import IconApi, { kGetIcon, getBestVariant } from '../src/icon-api.js'
import { DataType } from '../src/datatype/index.js'
import { DataStore } from '../src/datastore/index.js'
import { createCoreManager } from './helpers/core-manager.js'
import { iconTable } from '../src/schema/project.js'
import { IndexWriter } from '../src/index-writer/index.js'

const expectedSmallIcon = randomBytes(128)
const expectedMediumIcon = randomBytes(128)
const expectedLargeIcon = randomBytes(128)
const cm = createCoreManager()
const sqlite = new Database(':memory:')
const db = drizzle(sqlite)
migrate(db, {
  migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
})

const indexWriter = new IndexWriter({
  tables: [iconTable],
  sqlite,
})

const iconDataStore = new DataStore({
  namespace: 'config',
  coreManager: cm,
  storage: () => new RAM(),
  batch: async (entries) => indexWriter.batch(entries),
})

const iconDataType = new DataType({
  dataStore: iconDataStore,
  table: iconTable,
  db,
})
const projectId = randomBytes(32).toString('hex')
const iconApi = new IconApi({
  iconDataStore,
  iconDataType,
  projectId,
})

// eslint-disable-next-line no-unused-vars
test('icon api - create and get with one variant', async (t) => {
  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: expectedSmallIcon,
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon]({
    iconId: iconDoc.docId,
    size: 'small',
    mimeType: 'image/png',
    pixelDensity: 1,
  })
  t.alike(icon, expectedSmallIcon)
})

test(`icon api - create and fail to find variant with matching mimeType`, async (t) => {
  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: Buffer.from(expectedSmallIcon),
      },
    ],
  })

  await t.exception(async () => {
    await iconApi[kGetIcon]({
      iconId: iconDoc.docId,
      size: 'small',
      pixelDensity: 1,
      mimeType: 'image/png',
    })
  }, 'no matching mimeType for icon')
})

test('icon api - create and get with different variants', async (t) => {
  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: Buffer.from(expectedSmallIcon),
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: Buffer.from(expectedMediumIcon),
      },
      {
        size: 'large',
        pixelDensity: 2,
        mimeType: 'image/png',
        blob: Buffer.from(expectedLargeIcon),
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon]({
    mimeType: 'image/png',
    pixelDensity: 2,
    iconId: iconDoc.docId,
    size: 'large',
  })
  t.alike(icon, expectedLargeIcon)
})

test('icon api - create and get with variants, choosing the variant with more matching criteria', async (t) => {
  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: expectedSmallIcon,
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: expectedMediumIcon,
      },
      {
        size: 'large',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: expectedLargeIcon,
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon]({
    iconId: iconDoc.docId,
    size: 'large',
    pixelDensity: 1,
    mimeType: 'image/png',
  })
  t.alike(icon, expectedLargeIcon)
})

test('icon api - create and get with variants, choosing the first variant with the first best score', async (t) => {
  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: expectedSmallIcon,
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: expectedMediumIcon,
      },
      {
        size: 'large',
        pixelDensity: 2,
        mimeType: 'image/png',
        blob: expectedLargeIcon,
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon]({
    iconId: iconDoc.docId,
    size: 'large',
    pixelDensity: 1,
    mimeType: 'image/svg+xml',
  })
  t.alike(icon, expectedMediumIcon)
})

test(`icon api - getIconUrl, test matching url`, async (t) => {
  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: expectedSmallIcon,
      },
    ],
  })

  const size = 'small'
  const pixelDensity = 1
  const expectedUrl = `/${projectId}/${iconDoc.docId}/${size}/${pixelDensity}`
  const url = await iconApi.getIconUrl({
    iconId: iconDoc.docId,
    size: 'small',
    pixelDensity: 1,
  })
  t.is(url, expectedUrl)
})

test('getBestVariant - no variants exist', (t) => {
  t.exception(() => {
    return getBestVariant([], {
      mimeType: 'image/png',
      size: 'small',
      pixelDensity: 1,
    })
  }, 'throws when no variants exist')
})

test('getBestVariant - specify mimeType', (t) => {
  /** @type {Pick<import('@mapeo/schema').Icon['variants'][number], 'pixelDensity' | 'size'>} */
  const common = { pixelDensity: 1, size: 'small' }

  const pngVariant = createIconVariant({
    ...common,
    mimeType: 'image/png',
  })

  const svgVariant = createIconVariant({
    ...common,
    mimeType: 'image/svg+xml',
  })

  t.test('request mime type with match present', (st) => {
    for (const [mimeType, expectedVariant] of [
      ['image/png', pngVariant],
      ['image/svg+xml', svgVariant],
    ]) {
      const result = getBestVariant([pngVariant, svgVariant], {
        ...common,
        // @ts-expect-error
        mimeType,
      })

      st.alike(
        result,
        getBestVariant([pngVariant, svgVariant].reverse(), {
          ...common,
          // @ts-expect-error
          mimeType,
        }),
        'same result regardless of variants order'
      )

      st.alike(
        result,
        expectedVariant,
        `returns variant with desired mime type (${mimeType})`
      )
    }
  })

  t.test('request a mime type with no match present', (st) => {
    st.exception(() => {
      getBestVariant([pngVariant], {
        ...common,
        mimeType: 'image/svg+xml',
      })
    }, 'throws when no match for svg exists')

    st.exception(() => {
      getBestVariant([svgVariant], {
        ...common,
        mimeType: 'image/png',
      })
    }, 'throws when no match for png exists')
  })
})

test('getBestVariant - specify size', (t) => {
  /** @type {Pick<import('@mapeo/schema').Icon['variants'][number], 'pixelDensity' | 'mimeType'>} */
  const common = { pixelDensity: 1, mimeType: 'image/png' }

  const smallVariant = createIconVariant({
    ...common,
    size: 'small',
  })

  const mediumVariant = createIconVariant({
    ...common,
    size: 'medium',
  })

  const largeVariant = createIconVariant({
    ...common,
    size: 'large',
  })

  t.test('request size with match present', (st) => {
    for (const [size, expectedVariant] of [
      ['small', smallVariant],
      ['medium', mediumVariant],
      ['large', largeVariant],
    ]) {
      const result = getBestVariant(
        [smallVariant, mediumVariant, largeVariant],
        {
          ...common,
          // @ts-expect-error
          size,
        }
      )

      st.alike(
        result,
        getBestVariant([smallVariant, mediumVariant, largeVariant].reverse(), {
          ...common,
          // @ts-expect-error
          size,
        }),
        'same result regardless of variants order'
      )

      st.alike(
        result,
        expectedVariant,
        `returns variant with desired size (${size})`
      )
    }
  })

  t.test('request size with only smaller existing', (st) => {
    const result = getBestVariant([smallVariant, mediumVariant], {
      ...common,
      size: 'large',
    })

    st.alike(
      result,
      getBestVariant([smallVariant, mediumVariant].reverse(), {
        ...common,
        size: 'large',
      }),
      'same result regardless of variants order'
    )

    st.alike(result, mediumVariant, 'returns closest smaller size')
  })

  t.test('request size with both larger and smaller existing', (st) => {
    const result = getBestVariant([smallVariant, largeVariant], {
      ...common,
      size: 'medium',
    })

    st.alike(
      result,
      getBestVariant([smallVariant, largeVariant].reverse(), {
        ...common,
        size: 'medium',
      }),
      'same result regardless of variants order'
    )

    st.alike(result, smallVariant, 'returns smaller size')
  })

  t.test('request size with only larger existing', (st) => {
    const result = getBestVariant([mediumVariant, largeVariant], {
      ...common,
      size: 'small',
    })

    st.alike(
      result,
      getBestVariant([mediumVariant, largeVariant].reverse(), {
        ...common,
        size: 'small',
      }),
      'same result regardless of variants order'
    )

    st.alike(result, mediumVariant, 'returns closest larger size')
  })
})

test('getBestVariant - specify pixel density', (t) => {
  /** @type {Pick<import('@mapeo/schema').Icon['variants'][number], 'size' | 'mimeType'>} */
  const common = { size: 'small', mimeType: 'image/png' }

  const density1Variant = createIconVariant({
    ...common,
    pixelDensity: 1,
  })

  const density2Variant = createIconVariant({
    ...common,
    pixelDensity: 2,
  })

  const density3Variant = createIconVariant({
    ...common,
    pixelDensity: 3,
  })

  t.test('request pixel density with match present', (st) => {
    for (const [pixelDensity, expectedVariant] of [
      [1, density1Variant],
      [2, density2Variant],
      [3, density3Variant],
    ]) {
      const result = getBestVariant(
        [density1Variant, density2Variant, density3Variant],
        {
          ...common,
          // @ts-expect-error
          pixelDensity,
        }
      )

      st.alike(
        result,
        getBestVariant(
          [density1Variant, density2Variant, density3Variant].reverse(),
          {
            ...common,
            // @ts-expect-error
            pixelDensity,
          }
        ),
        'same result regardless of variants order'
      )

      st.alike(
        result,
        expectedVariant,
        `returns variant with desired pixel density (${pixelDensity})`
      )
    }
  })

  t.test('request pixel density with only smaller existing', (st) => {
    const result = getBestVariant([density1Variant, density2Variant], {
      ...common,
      pixelDensity: 3,
    })

    st.alike(
      result,
      getBestVariant([density1Variant, density2Variant].reverse(), {
        ...common,
        pixelDensity: 3,
      }),
      'same result regardless of variants order'
    )

    st.alike(result, density2Variant, 'returns closest smaller density')
  })

  t.test(
    'request pixel density with both larger and smaller existing',
    (st) => {
      const result = getBestVariant([density1Variant, density3Variant], {
        ...common,
        pixelDensity: 2,
      })

      st.alike(
        result,
        getBestVariant([density1Variant, density3Variant].reverse(), {
          ...common,
          pixelDensity: 2,
        }),
        'same result regardless of variants order'
      )

      st.alike(result, density1Variant, 'returns smaller density')
    }
  )

  t.test('request pixel density with only larger existing', (st) => {
    const result = getBestVariant([density2Variant, density3Variant], {
      ...common,
      pixelDensity: 1,
    })

    st.alike(
      result,
      getBestVariant([density2Variant, density3Variant].reverse(), {
        ...common,
        pixelDensity: 1,
      }),
      'same result regardless of variants order'
    )

    st.alike(result, density2Variant, 'returns closest larger density')
  })
})

test('getBestVariant - params prioritization', (t) => {
  const wantedSizePngVariant = createIconVariant({
    mimeType: 'image/png',
    pixelDensity: 1,
    size: 'small',
  })

  const wantedPixelDensityPngVariant = createIconVariant({
    mimeType: 'image/png',
    pixelDensity: 2,
    size: 'medium',
  })

  const wantedSizeSvgVariant = createIconVariant({
    mimeType: 'image/svg+xml',
    pixelDensity: 1,
    size: 'small',
  })

  const wantedPixelDensitySvgVariant = createIconVariant({
    mimeType: 'image/svg+xml',
    pixelDensity: 2,
    size: 'medium',
  })

  const result = getBestVariant(
    [
      wantedSizePngVariant,
      wantedPixelDensityPngVariant,
      wantedSizeSvgVariant,
      wantedPixelDensitySvgVariant,
    ],
    {
      mimeType: 'image/svg+xml',
      size: 'small',
      pixelDensity: 2,
    }
  )

  t.alike(
    result,
    getBestVariant(
      [
        wantedSizePngVariant,
        wantedPixelDensityPngVariant,
        wantedSizeSvgVariant,
        wantedPixelDensitySvgVariant,
      ].reverse(),
      {
        mimeType: 'image/svg+xml',
        size: 'small',
        pixelDensity: 2,
      }
    ),
    'same result regardless of variants order'
  )

  t.alike(result, wantedSizeSvgVariant, 'mime type > size > pixel density')
})

function createRandomVersionId(index = 0) {
  return randomBytes(32).toString('hex') + `/${index}`
}

/**
 * @param {object} opts
 * @param {import('@mapeo/schema').Icon['variants'][number]['size']} opts.size
 * @param {import('@mapeo/schema').Icon['variants'][number]['mimeType']} opts.mimeType
 * @param {import('@mapeo/schema').Icon['variants'][number]['pixelDensity']} opts.pixelDensity
 *
 * @returns {import('@mapeo/schema').Icon['variants'][number]}
 */
function createIconVariant(opts) {
  return {
    ...opts,
    blobVersionId: createRandomVersionId(),
  }
}
