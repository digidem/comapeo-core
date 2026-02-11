import util from 'node:util'

export class NotFoundError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
    this.code = 'NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class AlreadyJoinedError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Already joined a project') {
    super(message)
    this.name = 'AlreadyJoinedError'
    this.code = 'ALREADY_JOINED_ERROR'
    this.status = 409
  }
}

export class InviteSendError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Failed to send invite') {
    super(message)
    this.name = 'InviteSendError'
    this.code = 'INVITE_SEND_ERROR'
    this.status = 500
  }
}

export class InviteAbortedError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Invite aborted') {
    super(message)
    this.name = 'InviteAbortedError'
    this.code = 'INVITE_ABORTED_ERROR'
    this.status = 499
  }
}

export class ProjectDetailsSendFailError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Failed to send project details') {
    super(message)
    this.name = 'ProjectDetailsSendFailError'
    this.code = 'PROJECT_DETAILS_SEND_FAIL_ERROR'
    this.status = 500
  }
}

export class RPCDisconnectBeforeSendingError extends Error {
  /** @param {string} [message] */
  constructor(message = 'RPC disconnected before sending request') {
    super(message)
    this.name = 'RPCDisconnectBeforeSendingError'
    this.code = 'RPC_DISCONNECT_BEFORE_SENDING_ERROR'
    this.status = 499
  }
}

export class RPCDisconnectBeforeAckError extends Error {
  constructor(message = 'RPC disconnected before receiving acknowledgement') {
    super(message)
    this.name = 'RPCDisconnectBeforeAckError'
    this.code = 'RPC_DISCONNECT_BEFORE_ACK_ERROR'
    this.status = 499
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message)
    this.name = 'TimeoutError'
    this.code = 'TIMEOUT_ERROR'
    this.status = 504
  }
}

export class UnsupportedMimeTypeError extends Error {
  /** @param {string} [mimeType] */
  constructor(mimeType) {
    super(`Unsupported mimeType: ${mimeType}`)
    this.name = 'UnsupportedMimeTypeError'
    this.code = 'UNSUPPORTED_MIME_TYPE_ERROR'
    this.status = 415
  }
}

export class InvalidCoreOwnershipError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Invalid coreOwnership record') {
    super(message)
    this.name = 'InvalidCoreOwnershipError'
    this.code = 'INVALID_CORE_OWNERSHIP_ERROR'
    this.status = 400
  }
}

export class EmptyVariantsArrayError extends Error {
  /**
   * @param {string} [message]
   */
  constructor(message = 'Empty variants array') {
    super(message)
    this.name = 'EmptyVariantsArrayError'
    this.code = 'EMPTY_VARIANTS_ARRAY_ERROR'
    this.status = 400
  }
}

export class NoVariantsExistError extends Error {
  /** @param {string} [message] */
  constructor(message = 'No variants exist') {
    super(message)
    this.name = 'NoVariantsExistError'
    this.code = 'NO_VARIANTS_EXIST_ERROR'
    this.status = 404
  }
}

export class NovariantsForMimeTypeError extends Error {
  /**
   * @param {string} wantedMimeType - The desired MIME type that is not available.
   */
  constructor(wantedMimeType) {
    super(`No variants with desired mime type ${wantedMimeType} exist`)
    this.name = 'NovariantsForMimeTypeError'
    this.code = 'NO_VARIANTS_FOR_MIME_TYPE_ERROR'
    this.status = 404
  }
}

export class EmptyIconPathError extends Error {
  /** @param {string} [message] */
  constructor(message = 'iconId, size, and extension cannot be empty strings') {
    super(message)
    this.name = 'EmptyIconPathError'
    this.code = 'EMPTY_ICON_PATH_ERROR'
    this.status = 400
  }
}

export class InvalidPixelDensityError extends Error {
  /** @param {number} [pixelDensity] */
  constructor(pixelDensity) {
    super(`Invalid pixelDensity: ${pixelDensity}`)
    this.name = 'InvalidPixelDensityError'
    this.code = 'INVALID_PIXEL_DENSITY_ERROR'
    this.status = 400
  }
}

export class IconNotFoundError extends Error {
  /** @param {string} [iconName] */
  constructor(iconName) {
    super(`Icon ${iconName} not found in import file`)
    this.name = 'IconNotFoundError'
    this.code = 'ICON_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class KeyNotFoundError extends Error {
  /** @param {string} key */
  constructor(key) {
    super(`key ${key} not found in map`)
    this.name = 'KeyNotFoundError'
    this.code = 'KEY_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class UnsupportedMediaTypeError extends Error {
  /** @param {string} [mediaType] */
  constructor(mediaType) {
    super(`Unsupported media type: ${mediaType}`)
    this.name = 'UnsupportedMediaTypeError'
    this.code = 'UNSUPPORTED_MEDIA_TYPE_ERROR'
    this.status = 415
  }
}

export class ProjectExistsError extends Error {
  /** @param {string} [projectPublicId] */
  constructor(projectPublicId) {
    super(`Project with ID ${projectPublicId} already exists`)
    this.name = 'ProjectExistsError'
    this.code = 'PROJECT_EXISTS_ERROR'
    this.status = 409
  }
}

export class FailedToSetIsArchiveDeviceError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Failed to set isArchiveDevice') {
    super(message)
    this.name = 'FailedToSetIsArchiveDeviceError'
    this.code = 'FAILED_TO_SET_IS_ARCHIVE_DEVICE_ERROR'
    this.status = 500
  }
}

export class EncryptionKeysUndefinedError extends Error {
  /** @param {string} [message] */
  constructor(message = 'EncryptionKeys should not be undefined') {
    super(message)
    this.name = 'EncryptionKeysUndefinedError'
    this.code = 'ENCRYPTION_KEYS_UNDEFINED_ERROR'
    this.status = 400
  }
}

export class InvalidDeviceInfoError extends Error {
  /**
   * @param {string} [message] - Optional error message.
   */
  constructor(
    message = 'Invalid deviceInfo record, cannot write deviceInfo for another device'
  ) {
    super(message)
    this.name = 'InvalidDeviceInfoError'
    this.code = 'INVALID_DEVICE_INFO_ERROR'
    this.status = 400
  }
}

export class RoleAssignError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Cannot assign this role to this device') {
    super(message)
    this.name = 'RoleAssignError'
    this.code = 'ROLE_ASSIGN_ERROR'
    this.status = 403
  }
}

export class UnsupportedAttachmentTypeError extends Error {
  /** @param {string} [attachmentType] */
  constructor(attachmentType) {
    super(`Cannot fetch URL for attachment type "${attachmentType}"`)
    this.name = 'UnsupportedAttachmentTypeError'
    this.code = 'UNSUPPORTED_ATTACHMENT_TYPE_ERROR'
    this.status = 415
  }
}

export class UnexpectedEndOfStreamError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Entries stream ended unexpectedly') {
    super(message)
    this.name = 'UnexpectedEndOfStreamError'
    this.code = 'UNEXPECTED_END_OF_STREAM_ERROR'
    this.status = 499
  }
}

export class DriveNotFoundError extends Error {
  /**
   * @param {string} [driveId]
   */
  constructor(driveId) {
    super(`Drive not found: ${driveId}`)
    this.name = 'DriveNotFoundError'
    this.code = 'DRIVE_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class BlobsNotFoundError extends Error {
  /**
   * @param {string} [driveId]
   */
  constructor(driveId) {
    super(`HyperBlobs not found for drive: ${driveId}`)
    this.name = 'BlobsNotFoundError'
    this.code = 'BLOBS_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class BlobSourceNotFound extends Error {
  /**
   *
   * @param {string} path
   * @param {ErrorOptions} [opts]
   */
  constructor(path, opts = {}) {
    super(`Unable to find blob data at ${path}`, opts)
    this.name = 'BlobSourceNotFound'
    this.code = 'BLOB_SOURCE_NOT_FOUND'
    this.status = 404
  }
}

export class MigrationError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts = {}) {
    super('Unable to complete Drizzle Database migration', opts)
    this.name = 'MigrationError'
    this.code = 'MIGRATION_ERROR'
    this.status = 500
  }
}

export class GeoJSONExportError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts = {}) {
    super('Unable to export GeoJSON file', opts)
    this.name = 'GeoJSONExportError'
    this.code = 'GEOJSON_EXPORT_ERROR'
    this.status = 500
  }
}

export class MissingWriterError extends Error {
  /** @param {string} [namespace] */
  constructor(namespace) {
    super(`Could not find a writer for the ${namespace} namespace`)
    this.name = 'MissingWriterError'
    this.code = 'MISSING_WRITER_ERROR'
    this.status = 404
  }
}

export class UnsupportedCorestoreOptsError extends Error {
  /** @param {Object} [opts] */
  constructor(opts) {
    super(`Unsupported corestore.get() with opts: ${util.inspect(opts)}`)
    this.name = 'UnsupportedCorestoreOptsError'
    this.code = 'UNSUPPORTED_CORESTORE_OPTS_ERROR'
    this.status = 400
  }
}

export class InvalidBitfieldError extends Error {
  constructor() {
    super('Invalid RLE bitfield')
    this.name = 'InvalidBitfieldError'
    this.code = 'INVALID_BITFIELD_ERROR'
    this.status = 400
  }
}

export class InvalidDocSchemaError extends Error {
  /** @param {string} [schemaName] @param {string} [namespace] */
  constructor(schemaName, namespace) {
    super(`Schema '${schemaName}' is not allowed in namespace '${namespace}'`)
    this.name = 'InvalidDocSchemaError'
    this.code = 'INVALID_DOC_SCHEMA_ERROR'
    this.status = 403
  }
}

export class WriterCoreNotReadyError extends Error {
  constructor() {
    super('Writer core is not ready')
    this.name = 'WriterCoreNotReadyError'
    this.code = 'WRITER_CORE_NOT_READY_ERROR'
    this.status = 503
  }
}

export class InvalidVersionIdError extends Error {
  constructor() {
    super('Invalid versionId')
    this.name = 'InvalidVersionIdError'
    this.code = 'INVALID_VERSION_ID_ERROR'
    this.status = 404
  }
}

export class InvalidDocFormat extends Error {
  /** @param {Object} value */
  constructor(value) {
    super(`Invalid value: ${util.inspect(value)}`)
    this.name = 'InvalidDocFormat'
    this.code = 'INVALID_DOC_FORMAT'
    this.status = 400
  }
}

export class DocAlreadyExistsError extends Error {
  /** @param {string} [docId] */
  constructor(docId) {
    super(`Doc with docId ${docId} already exists`)
    this.name = 'DocAlreadyExistsError'
    this.code = 'DOC_ALREADY_EXISTS_ERROR'
    this.status = 409
  }
}

export class DocAlreadyDeletedError extends Error {
  constructor() {
    super('Doc already deleted')
    this.name = 'DocAlreadyDeletedError'
    this.code = 'DOC_ALREADY_DELETED_ERROR'
    this.status = 409
  }
}

export class InvalidDocError extends Error {
  /** @param {string} [message] */
  constructor(
    message = 'Updated docs must have the same docId and schemaName'
  ) {
    super(message)
    this.name = 'InvalidDocError'
    this.code = 'INVALID_DOC_ERROR'
    this.status = 400
  }
}

export class ServerNotListeningError extends Error {
  constructor() {
    super('Server is not listening on a port')
    this.name = 'ServerNotListeningError'
    this.code = 'SERVER_NOT_LISTENING_ERROR'
    this.status = 503
  }
}

export class MissingGetBlobStoreError extends Error {
  constructor() {
    super(`getBlobStore is missing from options`)
    this.name = 'MissingGetBlobStoreError'
    this.code = 'MISSING_GET_BLOB_STORE_ERROR'
    this.status = 500
  }
}
export class MissingGetProjectError extends Error {
  constructor() {
    super('Missing getProject')
    this.name = 'MissingGetProjectError'
    this.code = 'MISSING_GET_PROJECT_ERROR'
    this.status = 500
  }
}
export class UnsupportedVariantError extends Error {
  /**
   * @param {string} [variant]
   * @param {string} [type]
   **/
  constructor(variant, type) {
    super(`Unsupported variant "${variant}" for ${type}`)
    this.name = 'UnsupportedVariantError'
    this.code = 'UNSUPPORTED_VARIANT_ERROR'
    this.status = 400
  }
}

export class BlobStoreEntryNotFoundError extends Error {
  constructor() {
    super('Entry not found')
    this.name = 'BlobStoreEntryNotFoundError'
    this.code = 'BLOB_STORE_ENTRY_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class BlobNotFoundError extends Error {
  constructor() {
    super('Blob not found')
    this.name = 'BlobNotFoundError'
    this.code = 'BLOB_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class InvalidIconSizeError extends Error {
  /** @param {string} [value] */
  constructor(value) {
    super(`'${value}' is not a valid icon size`)
    this.name = 'InvalidIconSizeError'
    this.code = 'INVALID_ICON_SIZE_ERROR'
    this.status = 400
  }
}

export class InvalidIconPixelDensityError extends Error {
  /** @param {any} [density] */
  constructor(density) {
    super(`Invalid icon pixel density: ${density}`)
    this.name = 'InvalidIconPixelDensityError'
    this.code = 'INVALID_ICON_PIXEL_DENSITY_ERROR'
    this.status = 400
  }
}

export class FailedToGetStyleError extends Error {
  /** @param {URL} url */
  constructor(url) {
    super(`Failed to get style from ${url.href}`)
    this.name = 'FailedToGetStyleError'
    this.code = 'FAILED_TO_GET_STYLE_ERROR'
    this.status = 500
  }
}

export class UnknownSchemaError extends Error {
  /**
   * @param {string} [schemaName]
   */
  constructor(schemaName) {
    super(`IndexWriter doesn't know a schema named "${schemaName}"`)
    this.name = 'UnknownSchemaError'
    this.code = 'UNKNOWN_SCHEMA_ERROR'
    this.status = 400
  }
}

export class InvalidLanguageTagError extends Error {
  /** @param {string} [languageTag] */
  constructor(languageTag) {
    super(`Invalid BCP 47 language tag: ${languageTag}`)
    this.name = 'InvalidLanguageTagError'
    this.code = 'INVALID_LANGUAGE_TAG_ERROR'
    this.status = 400
  }
}

export class DuplicateKeyError extends Error {
  /** @param {*} [key] */
  constructor(key) {
    super(`Duplicate key: ${JSON.stringify(key)}`)
    this.name = 'DuplicateKeyError'
    this.code = 'DUPLICATE_KEY_ERROR'
    this.status = 409
  }
}

export class InvalidSchemaError extends Error {
  constructor() {
    super('Cannot process JSONSchema as SQL table')
    this.name = 'InvalidSchemaError'
    this.code = 'INVALID_SCHEMA_ERROR'
    this.status = 400
  }
}

export class IndexNotMultipleOf32Error extends Error {
  constructor() {
    super(`Index is not a multiple of 32`)
    this.name = 'IndexNotMultipleOf32Error'
    this.code = 'INDEX_NOT_MULTIPLE_OF_32_ERROR'
    this.status = 400
  }
}

export class InvalidUrlError extends Error {
  constructor() {
    super('Invalid URL provided')
    this.name = 'InvalidUrlError'
    this.code = 'INVALID_URL'
    this.status = 400
  }
}

export class AlreadyBlockedError extends Error {
  constructor() {
    super(`Member already blocked`)
    this.name = 'AlreadyBlockedError'
    this.code = 'ALREADY_BLOCKED_ERROR'
    this.status = 403
  }
}

export class DeviceIdNotForServerError extends Error {
  constructor() {
    super('DeviceId is not for a server peer')
    this.name = 'DeviceIdNotForServerError'
    this.code = 'DEVICE_ID_NOT_FOR_SERVER_ERROR'
    this.status = 403
  }
}

export class MissingDataError extends Error {
  constructor() {
    super('Project must have name to add server peer')
    this.name = 'MissingDataError'
    this.code = 'MISSING_DATA'
    this.status = 400
  }
}

export class NetworkError extends Error {
  /**
   * @param {unknown} err
   * @param {string} [message]
   */
  constructor(err, message = 'Network error') {
    super(`${message}: ${getErrorMessage(err)}`)
    this.name = 'NetworkError'
    this.code = 'NETWORK_ERROR'
    this.status = 502
  }
}

export class InvalidServerResponseError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [options]
   *    */
  constructor(message = 'Invalid Server Response', options = {}) {
    super(message, options)
    this.name = 'InvalidServerResponseError'
    this.code = 'INVALID_SERVER_RESPONSE'
    this.status = 502
  }
}

export class ProjectNotInAllowlistError extends Error {
  constructor() {
    super(
      "The server only allows specific projects to be added, and this isn't one of them"
    )
    this.name = 'ProjectNotInAllowlistError'
    this.code = 'PROJECT_NOT_IN_SERVER_ALLOWLIST'
    this.status = 403
  }
}

export class ServerTooManyProjectsError extends Error {
  constructor() {
    super(
      "The server limits the number of projects it can have and it's at the limit"
    )
    this.name = 'ServerTooManyProjectsError'
    this.code = 'SERVER_HAS_TOO_MANY_PROJECTS'
    this.status = 429
  }
}

export class MissingOwnDeviceInfoError extends Error {
  /**
   * @param {Error} err
   */
  constructor(err) {
    super('Own device information is missing', { cause: err })
    this.name = 'MissingOwnDeviceInfoError'
    this.code = 'MISSING_OWN_DEVICE_INFO_ERROR'
    this.status = 400
  }
}

export class CategoryFileNotFoundError extends Error {
  /**
   * @param {string} filePath
   */
  constructor(filePath) {
    super(`Category file not found at ${filePath}`)
    this.name = 'CategoryFileNotFoundError'
    this.code = 'CATEGORY_FILE_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class UnknownPeerError extends Error {
  /** @param {string} [message] */
  constructor(message = 'UnknownPeerError') {
    super(message)
    this.name = 'UnknownPeerError'
    this.code = 'UNKNOWN_PEER_ERROR'
    this.status = 404
  }
}

export class PeerDisconnectedError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Peer disconnected') {
    super(message)
    this.name = 'PeerDisconnectedError'
    this.code = 'PEER_DISCONNECTED_ERROR'
    this.status = 504
  }
}

export class PeerFailedConnectionError extends Error {
  /** @param {string} [message] */
  constructor(message = 'PeerFailedConnectionError') {
    super(message)
    this.name = 'PeerFailedConnectionError'
    this.code = 'PEER_FAILED_CONNECTION_ERROR'
    this.status = 408
  }
}

export class UnexpectedErrorTypeError extends Error {
  /**
   * @param {any} err
   */
  constructor(err) {
    super(`An unexpected error type occurred: ${err}`)
    this.name = 'UnexpectedErrorTypeError'
    this.code = 'UNEXPECTED_ERROR_TYPE_ERROR'
    this.status = 500
  }
}

export class ExhaustivenessError extends Error {
  /** @param {never} value */
  constructor(value) {
    super(`Exhaustiveness check failed. ${value} should be impossible`)
    this.name = 'ExhaustivenessError'
    this.code = 'EXHAUSTIVENESS_ERROR'
    this.status = 500
  }
}

export class PeerNotFoundError extends Error {
  /** @param {string} [message] */
  constructor(message = 'PeerNotFoundError: Peer not found') {
    super(message)
    this.name = 'PeerNotFoundError'
    this.code = 'PEER_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class InvalidMapShareError extends Error {
  /** @param {string} [message] */
  constructor(message = 'Map Share Failed Validation') {
    super(message)
    this.name = 'InvalidMapShareError'
    this.code = 'INVALID_MAP_SHARE_ERROR'
    this.status = 400
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

/**
 * If the argument is an `Error` instance, return its `code` property if it is a string.
 * Otherwise, returns `undefined`.
 *
 * @param {unknown} maybeError
 * @returns {undefined | string}
 * @example
 * try {
 *   // do something
 * } catch (err) {
 *   console.error(getErrorCode(err))
 * }
 */
export function getErrorCode(maybeError) {
  if (
    maybeError instanceof Error &&
    'code' in maybeError &&
    typeof maybeError.code === 'string'
  ) {
    return maybeError.code
  }
  return undefined
}

/**
 * Get the error message from an object if possible.
 * Otherwise, stringify the argument.
 *
 * @param {unknown} maybeError
 * @returns {string}
 * @example
 * try {
 *   // do something
 * } catch (err) {
 *   console.error(getErrorMessage(err))
 * }
 */
export function getErrorMessage(maybeError) {
  if (maybeError && typeof maybeError === 'object' && 'message' in maybeError) {
    try {
      const { message } = maybeError
      if (typeof message === 'string') return message
    } catch (_err) {
      // Ignored
    }
  }
  return 'unknown error'
}

/**
 * Throw an UnexpectedErrorTypeError if this is not a standard error
 * @param {Error & {status?: number, code?: string} | any} err
 */
export function ensureKnownError(err) {
  if (typeof err.status !== 'number' || typeof err.code !== 'string') {
    return new UnexpectedErrorTypeError(err)
  }
  return err
}
