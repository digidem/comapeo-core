export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message)
  }
}

/**
 * @param {unknown} err
 * @returns {null}
 */
export function nullIfNotFound(err) {
  if (err instanceof NotFoundError) return null
  throw err
}
