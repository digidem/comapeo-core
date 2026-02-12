import { writeFile } from 'node:fs/promises'
import * as errors from '../src/errors.js'
import { fileURLToPath } from 'node:url'

const outputFile = fileURLToPath(
  new URL('../src/error-codes.js', import.meta.url)
)

const codeMappings = Object.entries(errors)
  .sort(([key1], [key2]) => key1.localeCompare(key2))
  .filter(([_key, value]) => value.prototype instanceof Error)
  // @ts-ignore
  .map(([name, constructor]) => `  ${name}: '${new constructor({}, {}).code}'`)

// Add newlines and commas
const mappingText = codeMappings.join(',\n')

console.log(`Saving ${codeMappings.length} errors to ${outputFile}`)

await writeFile(
  outputFile,
  `// Generated using /scripts/build-error-codes.js
export default {
${mappingText},
}
`
)
