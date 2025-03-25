export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message)
  }
}

export class AlreadyJoinedError extends Error {
  /** @param {string} [message] */
  constructor(message = 'AlreadyJoinedError') {
    super(message)
    this.name = 'AlreadyJoinedError'
  }
}

export class InviteAbortedError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Invite Aborted') {
    super(message)
    this.name = 'InviteAbortedError'
  }
}

export class TimeoutError extends Error {
  /** @param {string} [message] */
  constructor(message = 'TimeoutError') {
    super(message)
    this.name = 'TimeoutError'
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
