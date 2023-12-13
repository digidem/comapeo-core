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
    return {
      name,
      variant: {
        size,
        mimeType: extension === 'png' ? 'image/png' : 'image/svg+xml',
        pixelDensity: Number(pixelDensity.replace('x', '')),
        blob: Buffer.concat(bufs),
      },
    }
  }
}
