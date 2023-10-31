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

test('icon api - create and get with one variant', async (t) => {
  const { iconApi } = setup()

  const iconBlob = randomBytes(128)

  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: iconBlob,
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon](iconDoc.docId, {
    size: 'small',
    mimeType: 'image/png',
    pixelDensity: 1,
  })

  t.alike(icon, iconBlob)
})

test(`icon api - create and fail to find variant with matching mimeType`, async (t) => {
  const { iconApi } = setup()

  const iconBlob = randomBytes(128)

  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: iconBlob,
      },
    ],
  })

  await t.exception(async () => {
    await iconApi[kGetIcon](iconDoc.docId, {
      size: 'small',
      pixelDensity: 1,
      mimeType: 'image/png',
    })
  }, 'no matching mimeType for icon')
})

test('icon api - create and get with different variants', async (t) => {
  const { iconApi } = setup()

  const smallIconBlob = randomBytes(128)
  const mediumIconBlob = randomBytes(256)
  const largeIconBlob = randomBytes(512)

  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: smallIconBlob,
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: mediumIconBlob,
      },
      {
        size: 'large',
        pixelDensity: 2,
        mimeType: 'image/png',
        blob: largeIconBlob,
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon](iconDoc.docId, {
    mimeType: 'image/png',
    pixelDensity: 2,
    size: 'large',
  })

  t.alike(icon, largeIconBlob)
})

test('icon api - create and get with variants, choosing the variant with more matching criteria', async (t) => {
  const { iconApi } = setup()

  const smallIconBlob = randomBytes(128)
  const mediumIconBlob = randomBytes(256)
  const largeIconBlob = randomBytes(512)

  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: smallIconBlob,
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: mediumIconBlob,
      },
      {
        size: 'large',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: largeIconBlob,
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon](iconDoc.docId, {
    size: 'large',
    pixelDensity: 1,
    mimeType: 'image/png',
  })

  t.alike(icon, largeIconBlob)
})

test('icon api - create and get with variants, choosing the first variant with the first best score', async (t) => {
  const { iconApi } = setup()

  const smallIconBlob = randomBytes(128)
  const mediumIconBlob = randomBytes(256)
  const largeIconBlob = randomBytes(512)

  const iconDoc = await iconApi.create({
    name: 'myIcon',
    variants: [
      {
        size: 'small',
        pixelDensity: 1,
        mimeType: 'image/png',
        blob: smallIconBlob,
      },
      {
        size: 'medium',
        pixelDensity: 1,
        mimeType: 'image/svg+xml',
        blob: mediumIconBlob,
      },
      {
        size: 'large',
        pixelDensity: 2,
        mimeType: 'image/png',
        blob: largeIconBlob,
      },
    ],
  })

  const { icon } = await iconApi[kGetIcon](iconDoc.docId, {
    size: 'large',
    mimeType: 'image/svg+xml',
  })
  t.alike(icon, mediumIconBlob)
})

test(`getIconUrl()`, (t) => {
  const { iconApi, projectId } = setup()

  const iconId = randomBytes(32).toString('hex')

  const bitmapUrl = iconApi.getIconUrl(iconId, {
    size: 'small',
    mimeType: 'image/png',
    pixelDensity: 1,
  })

  t.is(
    bitmapUrl,
    `/${projectId}/${iconId}/small@1.png`,
    'returns expected bitmap icon url'
  )

  const svgUrl = iconApi.getIconUrl(iconId, {
    size: 'small',
    mimeType: 'image/svg+xml',
  })

  t.is(
    svgUrl,
    `/${projectId}/${iconId}/small.svg`,
    'returns expected svg icon url'
  )
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
    /** @type {Array<[import('@mapeo/schema').Icon['variants'][number]['mimeType'], import('@mapeo/schema').Icon['variants'][number]]>} */
    const pairs = [
      ['image/png', pngVariant],
      ['image/svg+xml', svgVariant],
    ]

    for (const [mimeType, expectedVariant] of pairs) {
      const result = getBestVariant([pngVariant, svgVariant], {
        ...common,
        mimeType,
      })

      st.alike(
        result,
        getBestVariant([pngVariant, svgVariant].reverse(), {
          ...common,
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
    /** @type {Array<[import('@mapeo/schema').Icon['variants'][number]['size'], import('@mapeo/schema').Icon['variants'][number]]>} */
    const pairs = [
      ['small', smallVariant],
      ['medium', mediumVariant],
      ['large', largeVariant],
    ]
    for (const [size, expectedVariant] of pairs) {
      const result = getBestVariant(
        [smallVariant, mediumVariant, largeVariant],
        { ...common, size }
      )

      st.alike(
        result,
        getBestVariant([smallVariant, mediumVariant, largeVariant].reverse(), {
          ...common,
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
    /** @type {Array<[import('@mapeo/schema').Icon['variants'][number]['pixelDensity'], import('@mapeo/schema').Icon['variants'][number]]>} */
    const pairs = [
      [1, density1Variant],
      [2, density2Variant],
      [3, density3Variant],
    ]
    for (const [pixelDensity, expectedVariant] of pairs) {
      const result = getBestVariant(
        [density1Variant, density2Variant, density3Variant],
        { ...common, pixelDensity }
      )

      st.alike(
        result,
        getBestVariant(
          [density1Variant, density2Variant, density3Variant].reverse(),
          { ...common, pixelDensity }
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
      }
    ),
    'same result regardless of variants order'
  )

  t.alike(result, wantedSizeSvgVariant, 'mime type > size > pixel density')
})

test('getBestVariant - svgs requests are not affected by pixel density', (t) => {
  /** @type {Pick<import('@mapeo/schema').Icon['variants'][number], 'size' | 'mimeType'>} */
  const common = { size: 'small', mimeType: 'image/svg+xml' }

  const variant1 = createIconVariant({ ...common, pixelDensity: 1 })
  const variant2 = createIconVariant({ ...common, pixelDensity: 2 })
  const variant3 = createIconVariant({ ...common, pixelDensity: 3 })

  const result = getBestVariant([variant1, variant2, variant3], {
    size: 'small',
    mimeType: 'image/svg+xml',
  })

  t.alike(
    result,
    getBestVariant([variant1, variant2, variant3].reverse(), {
      mimeType: 'image/svg+xml',
      size: 'small',
    }),
    'same result regardless of variants order'
  )

  t.alike(result, variant1)
})

// TODO: Currently fails. Not sure if we'd run into this situation often in reality
test(
  'getBestVariant - multiple exact matches return deterministic result',
  { todo: true },
  (t) => {
    const variantA = createIconVariant({
      size: 'small',
      pixelDensity: 1,
      mimeType: 'image/svg+xml',
    })
    const variantB = createIconVariant({
      size: 'small',
      pixelDensity: 1,
      mimeType: 'image/svg+xml',
    })

    const result = getBestVariant([variantA, variantB], {
      size: 'small',
      mimeType: 'image/svg+xml',
    })

    t.alike(
      result,
      getBestVariant([variantA, variantB].reverse(), {
        mimeType: 'image/svg+xml',
        size: 'small',
      }),
      'same result regardless of variants order'
    )

    t.alike(result, variantA)
  }
)

function setup() {
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

  return {
    projectId,
    iconApi,
  }
}

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
