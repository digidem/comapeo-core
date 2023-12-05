import path from 'path'

/**
 * @param {import('fs').ReadStream} fileStream
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
export async function addFields({ fieldName, field, fieldDb }) {
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
 * @param {String} filename
 *
 */
export function parseIconFile(filename) {
  const [size, pixelDensity] = filename.split('-').slice(-1)[0].split('@')
  const name = filename.split('-').slice(0, -1).join('-')
  let obj = {
    name,
    variants: [
      {
        size,
        mimeType:
          path.extname(filename) === '.png' ? 'image/png' : 'image/svg+xml',
        pixelDensity: Number(pixelDensity.split('.')[0].replace('x', '')),
      },
    ],
  }
  return obj
}
