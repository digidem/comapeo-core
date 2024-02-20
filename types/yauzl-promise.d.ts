import * as yauzl from 'yauzl-promise'
declare module 'yauzl-promise' {
  export interface Entry extends yauzl.Entry {
    // `@types/yauzl-promise` has the wrong name for this key. We should
    // eventually submit this patch upstream.
    filename: string
  }
}
