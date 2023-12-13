import * as yauzl from 'yauzl-promise'
declare module 'yauzl-promise' {
  export interface ZipFile extends yauzl.ZipFile {
    [Symbol.asyncIterator]()
  }
}
