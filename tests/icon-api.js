import test from 'node:test'
import assert from 'node:assert/strict'
import RAM from 'random-access-memory'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomBytes } from 'node:crypto'

import {
  IconApi,
  kGetIconBlob,
  getBestVariant,
  constructIconPath,
} from '../src/icon-api.js'
import { DataType } from '../src/datatype/index.js'
import { DataStore } from '../src/datastore/index.js'
import { createCoreManager } from './helpers/core-manager.js'
import { iconTable } from '../src/schema/project.js'
import { IndexWriter } from '../src/index-writer/index.js'

test('create()', async () => {
  const { iconApi, iconDataType } = setup()

  const expectedName = 'myIcon'

  const bitmapBlob = randomBytes(128)
  const svgBlob = randomBytes(128)

  await assert.rejects(async () => {
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

  const { docId: iconId } = await iconApi.create({
    name: expectedName,
    variants: expectedVariants,
  })

  assert(iconId, 'returns document id')

  const doc = await iconDataType.getByDocId(iconId)

  assert(doc, 'icon document created')
  assert.equal(doc.name, expectedName, 'document has expected icon name')
  assert.equal(
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

      const pixelDensityMatches =
        v.mimeType === 'image/png' && v.pixelDensity === expected.pixelDensity
      return mimeTypeMatches && sizeMatches && pixelDensityMatches
    })

    assert(match, 'variant is saved')

    // TODO: Do we need to check the blobVersionId field?
  }
})

test('[kGetIconBlob]()', async () => {
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

  const { docId: iconId } = await iconApi.create({
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

    assert.deepEqual(result, bitmapBlob, 'returns expected bitmap blob')
  }

  // SVG exact
  {
    const result = await iconApi[kGetIconBlob](iconId, {
      size: 'large',
      mimeType: 'image/svg+xml',
    })

    assert.deepEqual(result, svgBlob, 'returns expected svg blob')
  }

  /// See more extensive non-exact testing in getBestVariant() tests further down

  // Bitmap non-exact
  {
    const result = await iconApi[kGetIconBlob](iconId, {
      size: 'medium',
      pixelDensity: 2,
      mimeType: 'image/png',
    })

    assert.deepEqual(result, bitmapBlob, 'returns expected bitmap blob')
  }

  // SVG non-exact
  {
    const result = await iconApi[kGetIconBlob](iconId, {
      size: 'medium',
      mimeType: 'image/svg+xml',
    })

    assert.deepEqual(result, svgBlob, 'returns expected svg blob')
  }
})

test(`getIconUrl()`, async () => {
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

    assert.equal(
      url,
      mediaBaseUrl + `${iconId}/small.png`,
      'returns expected bitmap icon url'
    )
  }

  {
    const url = await iconApi.getIconUrl(iconId, {
      size: 'small',
      mimeType: 'image/svg+xml',
    })

    assert.equal(
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

    assert.equal(
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

    assert.equal(
      url,
      mediaBaseUrl + `${iconId}/large.svg`,
      'returns expected svg icon url after media base url changes'
    )
  }
})

test('getBestVariant() - no variants exist', () => {
  assert.throws(() => {
    return getBestVariant([], {
      mimeType: 'image/png',
      size: 'small',
      pixelDensity: 1,
    })
  }, 'throws when no variants exist')
})

test('getBestVariant() - specify mimeType', async (t) => {
  /** @type {{size:import('../src/icon-api.js').ValidSizes}} */
  const common = { size: 'small' }

  const pngVariant = createIconVariant({
    ...common,
    pixelDensity: 1,
    mimeType: 'image/png',
  })

  const svgVariant = createIconVariant({
    ...common,
    mimeType: 'image/svg+xml',
  })

  await t.test('request mime type with match present', () => {
    /** @type {Array<[import('../src/icon-api.js').IconVariant['mimeType'], import('../src/icon-api.js').IconVariant]>} */
    const pairs = [
      ['image/png', pngVariant],
      ['image/svg+xml', svgVariant],
    ]

    for (const [mimeType, expectedVariant] of pairs) {
      /** @type {any} */
      const obj = {
        ...common,
        mimeType,
      }
      if (mimeType === 'image/png') {
        obj.pixelDensity = 1
      }
      const result = getBestVariant([pngVariant, svgVariant], obj)

      assert.deepEqual(
        result,
        getBestVariant([pngVariant, svgVariant].reverse(), obj),
        'same result regardless of variants order'
      )

      assert.deepEqual(
        result,
        expectedVariant,
        `returns variant with desired mime type (${mimeType})`
      )
    }
  })

  await t.test('request a mime type with no match present', () => {
    assert.throws(() => {
      getBestVariant([pngVariant], {
        ...common,
        mimeType: 'image/svg+xml',
      })
    }, 'throws when no match for svg exists')

    assert.throws(() => {
      // @ts-expect-error
      getBestVariant([svgVariant], {
        ...common,
        mimeType: 'image/png',
      })
    }, 'throws when no match for png exists')
  })
})

test('getBestVariant() - specify size', async (t) => {
  /** @type {Pick<import('../src/icon-api.js').BitmapOpts, 'pixelDensity' | 'mimeType'>} */
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

  await t.test('request size with match present', () => {
    /** @type {Array<[import('../src/icon-api.js').ValidSizes, import('@mapeo/schema').Icon['variants'][number]]>} */
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

      assert.deepEqual(
        result,
        getBestVariant([smallVariant, mediumVariant, largeVariant].reverse(), {
          ...common,
          size,
        }),
        'same result regardless of variants order'
      )

      assert.deepEqual(
        result,
        expectedVariant,
        `returns variant with desired size (${size})`
      )
    }
  })

  await t.test('request size with only smaller existing', () => {
    const result = getBestVariant([smallVariant, mediumVariant], {
      ...common,
      size: 'large',
    })

    assert.deepEqual(
      result,
      getBestVariant([smallVariant, mediumVariant].reverse(), {
        ...common,
        size: 'large',
      }),
      'same result regardless of variants order'
    )

    assert.deepEqual(result, mediumVariant, 'returns closest smaller size')
  })

  await t.test('request size with both larger and smaller existing', () => {
    const result = getBestVariant([smallVariant, largeVariant], {
      ...common,
      size: 'medium',
    })

    assert.deepEqual(
      result,
      getBestVariant([smallVariant, largeVariant].reverse(), {
        ...common,
        size: 'medium',
      }),
      'same result regardless of variants order'
    )

    assert.deepEqual(result, smallVariant, 'returns smaller size')
  })

  await t.test('request size with only larger existing', () => {
    const result = getBestVariant([mediumVariant, largeVariant], {
      ...common,
      size: 'small',
    })

    assert.deepEqual(
      result,
      getBestVariant([mediumVariant, largeVariant].reverse(), {
        ...common,
        size: 'small',
      }),
      'same result regardless of variants order'
    )

    assert.deepEqual(result, mediumVariant, 'returns closest larger size')
  })
})

test('getBestVariant() - specify pixel density', async (t) => {
  /** @type {Pick<import('@mapeo/schema').Icon['variants'][number], 'mimeType'> &
   * {size: import('../src/icon-api.js').ValidSizes}} */
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

  await t.test('request pixel density with match present', () => {
    /** @type {Array<[import('../src/icon-api.js').BitmapOpts['pixelDensity'], import('@mapeo/schema').Icon['variants'][number]]>} */
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

      assert.deepEqual(
        result,
        getBestVariant(
          [density1Variant, density2Variant, density3Variant].reverse(),
          { ...common, pixelDensity }
        ),
        'same result regardless of variants order'
      )

      assert.deepEqual(
        result,
        expectedVariant,
        `returns variant with desired pixel density (${pixelDensity})`
      )
    }
  })

  await t.test('request pixel density with only smaller existing', () => {
    const result = getBestVariant([density1Variant, density2Variant], {
      ...common,
      pixelDensity: 3,
    })

    assert.deepEqual(
      result,
      getBestVariant([density1Variant, density2Variant].reverse(), {
        ...common,
        pixelDensity: 3,
      }),
      'same result regardless of variants order'
    )

    assert.deepEqual(result, density2Variant, 'returns closest smaller density')
  })

  await t.test(
    'request pixel density with both larger and smaller existing',
    () => {
      const result = getBestVariant([density1Variant, density3Variant], {
        ...common,
        pixelDensity: 2,
      })

      assert.deepEqual(
        result,
        getBestVariant([density1Variant, density3Variant].reverse(), {
          ...common,
          pixelDensity: 2,
        }),
        'same result regardless of variants order'
      )

      assert.deepEqual(result, density1Variant, 'returns smaller density')
    }
  )

  await t.test('request pixel density with only larger existing', () => {
    const result = getBestVariant([density2Variant, density3Variant], {
      ...common,
      pixelDensity: 1,
    })

    assert.deepEqual(
      result,
      getBestVariant([density2Variant, density3Variant].reverse(), {
        ...common,
        pixelDensity: 1,
      }),
      'same result regardless of variants order'
    )

    assert.deepEqual(result, density2Variant, 'returns closest larger density')
  })
})

test('getBestVariant() - params prioritization', () => {
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
    size: 'small',
  })

  const wantedPixelDensitySvgVariant = createIconVariant({
    mimeType: 'image/svg+xml',
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

  assert.deepEqual(
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

  assert.deepEqual(
    result,
    wantedSizeSvgVariant,
    'mime type > size > pixel density'
  )
})

// TODO: Currently fails. Not sure if we'd run into this situation often in reality
test(
  'getBestVariant - multiple exact matches return deterministic result',
  { skip: true },
  () => {
    const variantA = createIconVariant({
      size: 'small',
      mimeType: 'image/svg+xml',
    })
    const variantB = createIconVariant({
      size: 'small',
      mimeType: 'image/svg+xml',
    })

    const result = getBestVariant([variantA, variantB], {
      size: 'small',
      mimeType: 'image/svg+xml',
    })

    assert.deepEqual(
      result,
      getBestVariant([variantA, variantB].reverse(), {
        mimeType: 'image/svg+xml',
        size: 'small',
      }),
      'same result regardless of variants order'
    )

    assert.deepEqual(result, variantA)
  }
)

test('constructIconPath() - bad inputs', () => {
  // Array of [input, test message]
  /** @type {Array<[Parameters<typeof constructIconPath>[0], string]>} */
  const fixtures = [
    [
      { iconId: '', size: 'small', extension: 'svg' },
      'throws when iconId is empty string',
    ],
    [
      { iconId: 'abc', size: '', extension: 'png' },
      'throws when size is empty string',
    ],
    [
      { iconId: 'abc', size: 'small', extension: '' },
      'throws when extension is empty string',
    ],
    [
      { iconId: 'abc', size: 'small', extension: 'png', pixelDensity: 0 },
      'throws when pixelDensity is zero',
    ],
    [
      { iconId: 'abc', size: 'small', extension: 'png', pixelDensity: -1 },
      'throws when pixelDensity is a negative number',
    ],
  ]

  for (const [input, message] of fixtures) {
    assert.throws(() => constructIconPath(input), message)
  }
})

test('constructIconPath() - good inputs', () => {
  // Array of [input, expected, test message]
  /** @type {Array<[Parameters<typeof constructIconPath>[0], string, string]>} */
  const fixtures = [
    [
      { iconId: 'abc', size: 'small', extension: 'svg' },
      'abc/small.svg',
      'omitting pixelDensity leaves out density suffix',
    ],
    [
      { iconId: 'abc', size: 'small', extension: 'png', pixelDensity: 2 },
      'abc/small@2x.png',
      'including pixelDensity includes density suffix',
    ],
    [
      { iconId: 'abc', size: 'small', extension: '.png' },
      'abc/small.png',
      'handles extension starting with `.`',
    ],
  ]

  for (const [input, expected, message] of fixtures) {
    assert.equal(constructIconPath(input), expected, message)
  }
})

/**
 *
 * @param {{ getMediaBaseUrl?: () => Promise<string> }} [opts]
 */
function setup({
  getMediaBaseUrl = async () => 'http://127.0.0.1:8080/icons',
} = {}) {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)

  migrate(db, {
    migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
  })

  const cm = createCoreManager({ db })

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
    getTranslations() {
      throw new Error('Translations should not be fetched in this test')
    },
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
 * @param {import('../src/icon-api.js').BitmapOpts | import('../src/icon-api.js').SvgOpts} opts
 * @returns {import('@mapeo/schema').Icon['variants'][number]}
 */
function createIconVariant(opts) {
  return {
    ...opts,
    blobVersionId: createRandomVersionId(),
  }
}
