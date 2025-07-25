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

export class ProjectDetailsSendFailError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Project details failed to send') {
    super(message)
    this.name = 'ProjectDetailsSendFailError'
  }
}

export class RPCDisconnectBeforeSendingError extends Error {
  /** @param {string} [message] */
  constructor(message = 'RPC disconnected before sending') {
    super(message)
    this.name = 'RPCDisconnectBeforeSendingError'
  }
}

export class RPCDisconnectBeforeAckError extends Error {
  /** @param {string} [message] */
  constructor(message = 'RPC disconnected before receiving acknowledgement') {
    super(message)
    this.name = 'RPCDisconnectBeforeAckError'
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
