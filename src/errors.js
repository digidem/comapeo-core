export class NotFoundError extends Error {
  // TODO(evanhahn) revert this change
  constructor(message = 'Not found') {
    super(message)
  }
}
