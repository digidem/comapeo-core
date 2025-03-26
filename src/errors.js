export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class AlreadyJoinedError extends Error {
  /** @param {string} [message] */
  constructor(message = 'AlreadyJoinedError') {
    super(message)
    this.name = 'AlreadyJoinedError'
  }
}

export class InviteSendError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Invite Send Error') {
    super(message)
    this.name = 'InviteSendError'
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
