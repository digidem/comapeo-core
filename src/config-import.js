/**
 * @param {import('fs').ReadStream} fileStream
 * @returns {Object}
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
