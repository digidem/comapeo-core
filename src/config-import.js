/**
 * @param {import('stream').Readable} fileStream
 * @returns {Promise<{fields:Object, presets: Object}>}
 * */
export function readPresets(fileStream) {
  let presets = ''
  fileStream.on('data', (d) => {
    presets += d.toString()
  })
  return new Promise((resolve, reject) => {
    fileStream.on('end', () => {
      resolve(JSON.parse(presets))
    })
    fileStream.on('error', (e) => {
      reject(e)
    })
  })
}

/**
 * @param {Object} opts
 * @param {String} opts.fieldName
 * @param {any} opts.field
 * @param {any} opts.fieldDb
 */
export async function addField({ fieldName, field, fieldDb }) {
  const fieldDoc = {
    // shouldn't schemaName be derived when calling .create?
    schemaName: 'field',
    label: fieldName,
    ...field,
  }
  fieldDoc.tagKey = fieldDoc.key
  delete fieldDoc.key
  return await fieldDb.create(fieldDoc)
}

/**
 * @param {string} filename
 * @param {import('stream').Readable} fileStream
 * @returns {Promise<{
 * name: import('@mapeo/schema').IconValue['name']
 * variant:
 * (import('./icon-api.js').BitmapOpts | import('./icon-api.js').SvgOpts) & { blob: Buffer }
 * }| undefined>}
 *
 */
export async function parseIcon(filename, fileStream) {
  const bufs = []
  for await (const chunk of fileStream) {
    bufs.push(chunk)
  }
  const matches = filename.match(
    /^([a-zA-Z0-9-]+)-([a-zA-Z0-9]+)@(\d+x)\.(png|jpg|jpeg)$/
  )
  if (matches) {
    /* eslint-disable no-unused-vars */
    const [_, name, size, pixelDensity, extension] = matches
    const density = Number(pixelDensity.replace('x', ''))
    if (!(density === 1 || density === 2 || density === 3)) {
      throw new Error('Error loading icon. invalid pixel density')
    }
    if (!(size === 'small' || size === 'medium' || size === 'large')) {
      throw new Error('Error loading icon. invalid size')
    }
    return {
      name,
      variant: {
        size,
        mimeType: extension === 'png' ? 'image/png' : 'image/svg+xml',
        pixelDensity: density,
        blob: Buffer.concat(bufs),
      },
    }
  }
}
