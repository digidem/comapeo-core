// @ts-check
import test from 'brittle'
import RAM from 'random-access-memory'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomBytes } from 'node:crypto'

import { IconApi, kGetIconBlob, getBestVariant } from '../src/icon-api.js'
import { DataType } from '../src/datatype/index.js'
import { DataStore } from '../src/datastore/index.js'
import { createCoreManager } from './helpers/core-manager.js'
import { iconTable } from '../src/schema/project.js'
import { IndexWriter } from '../src/index-writer/index.js'

test('create()', async (t) => {
  const { iconApi, iconDataType } = setup()

  const expectedName = 'myIcon'

  const bitmapBlob = randomBytes(128)
  const svgBlob = randomBytes(128)

  await t.exception(async () => {
    return iconApi.create({ name: expectedName, variants: [] })
  }, 'throws when no variants are provided')

  /** @type {Parameters<import('../src/icon-api.js').IconApi['create']>[0]['variants']} */
  const expectedVariants = [
    {
      size: 'small',
      pixelDensity: 1,
      mimeType: 'image/png',
      blob: bitmapBlob,
    },
    {
      size: 'small',
      mimeType: 'image/svg+xml',
      blob: svgBlob,
    },
  ]

  const iconId = await iconApi.create({
    name: expectedName,
    variants: expectedVariants,
  })

  t.ok(iconId, 'returns document id')

  const doc = await iconDataType.getByDocId(iconId)

  t.ok(doc, 'icon document created')
  t.is(doc.name, expectedName, 'document has expected icon name')
  t.is(
    doc.variants.length,
    expectedVariants.length,
    'document has expected icon name'
  )

  for (const expected of expectedVariants) {
    const match = doc.variants.find((v) => {
      const mimeTypeMatches = v.mimeType === expected.mimeType
      const sizeMatches = v.size === expected.size

      if (expected.mimeType === 'image/svg+xml') {
        return mimeTypeMatches && sizeMatches
      }

      const pixelDensityMatches = v.pixelDensity === expected.pixelDensity
      return mimeTypeMatches && sizeMatches && pixelDensityMatches
    })

    t.ok(match, 'variant is saved')

    // TODO: Do we need to check the blobVersionId field?
  }
})

test('[kGetIconBlob]()', async (t) => {
  const { iconApi } = setup()

  const expectedName = 'myIcon'

  const bitmapBlob = randomBytes(128)
  const svgBlob = randomBytes(128)

  /** @type {Parameters<import('../src/icon-api.js').IconApi['create']>[0]['variants']} */
  const expectedVariants = [
    {
      size: 'small',
      pixelDensity: 1,
      mimeType: 'image/png',
      blob: bitmapBlob,
    },
    {
      size: 'large',
      mimeType: 'image/svg+xml',
      blob: svgBlob,
    },
  ]

  const iconId = await iconApi.create({
    name: expectedName,
    variants: expectedVariants,
  })

  // Bitmap exact
  {
    const result = await iconApi[kGetIconBlob](iconId, {
      size: 'small',
      pixelDensity: 1,
      mimeType: 'image/png',
    })

    t.alike(result, bitmapBlob, 'returns expected bitmap blob')
  }

  // SVG exact
  {
    const result = await iconApi[kGetIconBlob](iconId, {
      size: 'large',
      mimeType: 'image/svg+xml',
    })

    t.alike(result, svgBlob, 'returns expected svg blob')
  }

  /// See more extensive non-exact testing in getBestVariant() tests further down

  // Bitmap non-exact
  {
    const result = await iconApi[kGetIconBlob](iconId, {
      size: 'medium',
      pixelDensity: 2,
      mimeType: 'image/png',
    })

    t.alike(result, bitmapBlob, 'returns expected bitmap blob')
  }

  // SVG non-exact
  {
    const result = await iconApi[kGetIconBlob](iconId, {
      size: 'medium',
      mimeType: 'image/svg+xml',
    })

    t.alike(result, svgBlob, 'returns expected svg blob')
  }
})

test(`getIconUrl()`, async (t) => {
  let mediaBaseUrl = 'http://127.0.0.1:8080/icons/'

  const { iconApi } = setup({
    getMediaBaseUrl: async () => mediaBaseUrl,
  })

  const iconId = randomBytes(32).toString('hex')

  {
    const url = await iconApi.getIconUrl(iconId, {
      size: 'small',
      mimeType: 'image/png',
      pixelDensity: 1,
    })

    t.is(
      url,
      mediaBaseUrl + `${iconId}/small@1x.png`,
      'returns expected bitmap icon url'
    )
  }

  {
    const url = await iconApi.getIconUrl(iconId, {
      size: 'small',
      mimeType: 'image/svg+xml',
    })

    t.is(
      url,
      mediaBaseUrl + `${iconId}/small.svg`,
      'returns expected svg icon url'
    )
  }

  // Change media base url (e.g. host or port changes)
  mediaBaseUrl = 'http://0.0.0.0:3000/icons/'

  {
    const url = await iconApi.getIconUrl(iconId, {
      size: 'medium',
      mimeType: 'image/png',
      pixelDensity: 2,
    })

    t.is(
      url,
      mediaBaseUrl + `${iconId}/medium@2x.png`,
      'returns expected bitmap icon url after media base url changes'
    )
  }

  {
    const url = await iconApi.getIconUrl(iconId, {
      size: 'large',
      mimeType: 'image/svg+xml',
    })

    t.is(
      url,
      mediaBaseUrl + `${iconId}/large.svg`,
      'returns expected svg icon url after media base url changes'
    )
  }
})

test('getBestVariant() - no variants exist', (t) => {
  t.exception(() => {
    return getBestVariant([], {
      mimeType: 'image/png',
      size: 'small',
      pixelDensity: 1,
    })
  }, 'throws when no variants exist')
})

test('getBestVariant() - specify mimeType', (t) => {
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

test('getBestVariant() - specify size', (t) => {
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

test('getBestVariant() - specify pixel density', (t) => {
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

test('getBestVariant() - params prioritization', (t) => {
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

// TODO: The IconApi doesn't allow creating svg variants with a custom pixel density, so maybe can remove this test?
test('getBestVariant() - svg requests are not affected by pixel density', (t) => {
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

/**
 *
 * @param {{ getMediaBaseUrl?: () => Promise<string> }} [opts]
 */
function setup({
  getMediaBaseUrl = async () => 'http://127.0.0.1:8080/icons',
} = {}) {
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

  const iconApi = new IconApi({
    iconDataStore,
    iconDataType,
    getMediaBaseUrl,
  })

  return {
    iconApi,
    iconDataType,
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
