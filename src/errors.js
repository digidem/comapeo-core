import util from 'node:util'

export class NotFoundError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Not found', opts) {
    super(message, opts)
    this.name = 'NotFoundError'
    this.code = 'NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class AlreadyJoinedError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Already joined a project', opts) {
    super(message, opts)
    this.name = 'AlreadyJoinedError'
    this.code = 'ALREADY_JOINED_ERROR'
    this.status = 409
  }
}

export class InviteSendError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Failed to send invite', opts) {
    super(message, opts)
    this.name = 'InviteSendError'
    this.code = 'INVITE_SEND_ERROR'
    this.status = 500
  }
}

export class InviteAbortedError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Invite aborted', opts) {
    super(message, opts)
    this.name = 'InviteAbortedError'
    this.code = 'INVITE_ABORTED_ERROR'
    this.status = 499
  }
}

export class ProjectDetailsSendFailError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Failed to send project details', opts) {
    super(message, opts)
    this.name = 'ProjectDetailsSendFailError'
    this.code = 'PROJECT_DETAILS_SEND_FAIL_ERROR'
    this.status = 500
  }
}

export class RPCDisconnectBeforeSendingError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'RPC disconnected before sending request', opts) {
    super(message, opts)
    this.name = 'RPCDisconnectBeforeSendingError'
    this.code = 'RPC_DISCONNECT_BEFORE_SENDING_ERROR'
    this.status = 499
  }
}

export class RPCDisconnectBeforeAckError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(
    message = 'RPC disconnected before receiving acknowledgement',
    opts
  ) {
    super(message, opts)
    this.name = 'RPCDisconnectBeforeAckError'
    this.code = 'RPC_DISCONNECT_BEFORE_ACK_ERROR'
    this.status = 499
  }
}

export class TimeoutError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Operation timed out', opts) {
    super(message, opts)
    this.name = 'TimeoutError'
    this.code = 'TIMEOUT_ERROR'
    this.status = 504
  }
}

export class UnsupportedMimeTypeError extends Error {
  /**
   * @param {string} mimeType
   * @param {ErrorOptions} [opts]
   */
  constructor(mimeType, opts) {
    super(`Unsupported mimeType: ${mimeType}`, opts)
    this.name = 'UnsupportedMimeTypeError'
    this.code = 'UNSUPPORTED_MIME_TYPE_ERROR'
    this.status = 415
  }
}

export class InvalidCoreOwnershipError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Invalid coreOwnership record', opts) {
    super(message, opts)
    this.name = 'InvalidCoreOwnershipError'
    this.code = 'INVALID_CORE_OWNERSHIP_ERROR'
    this.status = 400
  }
}

export class EmptyVariantsArrayError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Empty variants array', opts) {
    super(message, opts)
    this.name = 'EmptyVariantsArrayError'
    this.code = 'EMPTY_VARIANTS_ARRAY_ERROR'
    this.status = 400
  }
}

export class NoVariantsExistError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'No variants exist', opts) {
    super(message, opts)
    this.name = 'NoVariantsExistError'
    this.code = 'NO_VARIANTS_EXIST_ERROR'
    this.status = 404
  }
}

export class NoVariantsForMimeTypeError extends Error {
  /**
   * @param {string} wantedMimeType - The desired MIME type that is not available.
   * @param {ErrorOptions} [opts]
   */
  constructor(wantedMimeType, opts) {
    super(`No variants with desired mime type ${wantedMimeType} exist`, opts)
    this.name = 'NoVariantsForMimeTypeError'
    this.code = 'NO_VARIANTS_FOR_MIME_TYPE_ERROR'
    this.status = 404
  }
}

export class EmptyIconPathError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(
    message = 'IconId, size, and extension cannot be empty strings',
    opts
  ) {
    super(message, opts)
    this.name = 'EmptyIconPathError'
    this.code = 'EMPTY_ICON_PATH_ERROR'
    this.status = 400
  }
}

export class InvalidPixelDensityError extends Error {
  /**
   * @param {number} [pixelDensity]
   * @param {ErrorOptions} [opts]
   */
  constructor(pixelDensity, opts) {
    super(`Invalid pixel density: ${pixelDensity}`, opts)
    this.name = 'InvalidPixelDensityError'
    this.code = 'INVALID_PIXEL_DENSITY_ERROR'
    this.status = 400
  }
}

export class IconNotFoundError extends Error {
  /**
   * @param {string} [iconName]
   * @param {ErrorOptions} [opts]
   */
  constructor(iconName, opts) {
    super(`Icon ${iconName} not found in import file`, opts)
    this.name = 'IconNotFoundError'
    this.code = 'ICON_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class KeyNotFoundError extends Error {
  /**
   * @param {string} key
   * @param {ErrorOptions} [opts]
   */
  constructor(key, opts) {
    super(`Key ${key} not found in map`, opts)
    this.name = 'KeyNotFoundError'
    this.code = 'KEY_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class ProjectExistsError extends Error {
  /**
   * @param {string} projectPublicId
   * @param {ErrorOptions} [opts]
   */
  constructor(projectPublicId, opts) {
    super(`Project with ID ${projectPublicId} already exists`, opts)
    this.name = 'ProjectExistsError'
    this.code = 'PROJECT_EXISTS_ERROR'
    this.status = 409
  }
}

export class FailedToSetIsArchiveDeviceError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Failed to set isArchiveDevice', opts) {
    super(message, opts)
    this.name = 'FailedToSetIsArchiveDeviceError'
    this.code = 'FAILED_TO_SET_IS_ARCHIVE_DEVICE_ERROR'
    this.status = 500
  }
}

export class EncryptionKeysNotFoundError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'EncryptionKeys should not be undefined', opts) {
    super(message, opts)
    this.name = 'EncryptionKeysNotFoundError'
    this.code = 'ENCRYPTION_KEYS_NOT_FOUND_ERROR'
    this.status = 400
  }
}

export class InvalidDeviceInfoError extends Error {
  /**
   * @param {string} [message] - Optional error message.
   * @param {ErrorOptions} [opts]
   */
  constructor(
    message = 'Invalid deviceInfo record, cannot write deviceInfo for another device',
    opts
  ) {
    super(message, opts)
    this.name = 'InvalidDeviceInfoError'
    this.code = 'INVALID_DEVICE_INFO_ERROR'
    this.status = 400
  }
}

export class RoleAssignError extends Error {
  /**
   * @param {string} message
   * @param {ErrorOptions} [opts]
   */
  constructor(message, opts) {
    super(message, opts)
    this.name = 'RoleAssignError'
    this.code = 'ROLE_ASSIGN_ERROR'
    this.status = 403
  }
}

export class UnsupportedAttachmentTypeError extends Error {
  /**
   * @param {string} [attachmentType]
   * @param {ErrorOptions} [opts]
   */
  constructor(attachmentType, opts) {
    super(`Cannot fetch URL for attachment type "${attachmentType}"`, opts)
    this.name = 'UnsupportedAttachmentTypeError'
    this.code = 'UNSUPPORTED_ATTACHMENT_TYPE_ERROR'
    this.status = 415
  }
}

export class UnexpectedEndOfStreamError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Entries stream ended unexpectedly', opts) {
    super(message, opts)
    this.name = 'UnexpectedEndOfStreamError'
    this.code = 'UNEXPECTED_END_OF_STREAM_ERROR'
    this.status = 499
  }
}

export class DriveNotFoundError extends Error {
  /**
   * @param {string} driveId
   * @param {ErrorOptions} [opts]
   */
  constructor(driveId, opts) {
    super(`Drive not found: ${driveId}`, opts)
    this.name = 'DriveNotFoundError'
    this.code = 'DRIVE_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class BlobsNotFoundError extends Error {
  /**
   * @param {string} driveId
   * @param {ErrorOptions} [opts]
   */
  constructor(driveId, opts) {
    super(`HyperBlobs not found for drive: ${driveId}`, opts)
    this.name = 'BlobsNotFoundError'
    this.code = 'BLOBS_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class BlobReadError extends Error {
  /**
   *
   * @param {string} path
   * @param {ErrorOptions} [opts]
   */
  constructor(path, opts) {
    super(`Unable to find blob data at ${path}`, opts)
    this.name = 'BlobReadError'
    this.code = 'BLOB_READ_ERROR'
    this.status = 404
  }
}

export class MigrationError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
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
  constructor(opts) {
    super('Unable to export GeoJSON file', opts)
    this.name = 'GeoJSONExportError'
    this.code = 'GEOJSON_EXPORT_ERROR'
    this.status = 500
  }
}

export class MissingWriterError extends Error {
  /**
   * @param {string} [namespace]
   * @param {ErrorOptions} [opts]
   */
  constructor(namespace, opts) {
    super(`Could not find a writer for the ${namespace} namespace`, opts)
    this.name = 'MissingWriterError'
    this.code = 'MISSING_WRITER_ERROR'
    this.status = 404
  }
}

export class UnsupportedCorestoreOptsError extends Error {
  /** @param {unknown} [opts] */
  constructor(opts) {
    super(`Unsupported corestore.get() with opts: ${util.inspect(opts)}`)
    this.name = 'UnsupportedCorestoreOptsError'
    this.code = 'UNSUPPORTED_CORESTORE_OPTS_ERROR'
    this.status = 400
  }
}

export class InvalidBitfieldError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Invalid RLE bitfield', opts)
    this.name = 'InvalidBitfieldError'
    this.code = 'INVALID_BITFIELD_ERROR'
    this.status = 400
  }
}

export class InvalidDocSchemaError extends Error {
  /**
   * @param {string} [schemaName]
   * @param {string} [namespace]
   * @param {ErrorOptions} [opts]
   */
  constructor(schemaName, namespace, opts) {
    super(
      `Schema '${schemaName}' is not allowed in namespace '${namespace}'`,
      opts
    )
    this.name = 'InvalidDocSchemaError'
    this.code = 'INVALID_DOC_SCHEMA_ERROR'
    this.status = 403
  }
}

export class UnexpectedDocSchemaError extends Error {
  /**
   * @param {string?} gotSchema
   * @param {string} expectedSchema
   * @param {ErrorOptions} [opts]
   */
  constructor(gotSchema, expectedSchema, opts) {
    super(`Expected ${expectedSchema} but got ${gotSchema}`, opts)
    this.name = 'UnexpectedDocSchemaError'
    this.code = 'UNEXPECTED_DOC_SCHEMA_ERROR'
    this.status = 403
  }
}

export class WriterCoreNotReadyError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Writer core is not ready', opts)
    this.name = 'WriterCoreNotReadyError'
    this.code = 'WRITER_CORE_NOT_READY_ERROR'
    this.status = 503
  }
}

export class InvalidVersionIdError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Invalid versionId', opts)
    this.name = 'InvalidVersionIdError'
    this.code = 'INVALID_VERSION_ID_ERROR'
    this.status = 404
  }
}

export class InvalidDocFormatError extends Error {
  /**
   * @param {unknown} value
   * @param {ErrorOptions} [opts]
   */
  constructor(value, opts) {
    super(`Invalid value: ${util.inspect(value)}`, opts)
    this.name = 'InvalidDocFormatError'
    this.code = 'INVALID_DOC_FORMAT_ERROR'
    this.status = 400
  }
}

export class DocAlreadyExistsError extends Error {
  /**
   * @param {string} docId
   * @param {ErrorOptions} [opts]
   */
  constructor(docId, opts) {
    super(`Doc with docId ${docId} already exists`, opts)
    this.name = 'DocAlreadyExistsError'
    this.code = 'DOC_ALREADY_EXISTS_ERROR'
    this.status = 409
  }
}

export class DocAlreadyDeletedError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Doc already deleted', opts)
    this.name = 'DocAlreadyDeletedError'
    this.code = 'DOC_ALREADY_DELETED_ERROR'
    this.status = 409
  }
}

export class InvalidDocError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(
    message = 'Updated docs must have the same docId and schemaName',
    opts
  ) {
    super(message, opts)
    this.name = 'InvalidDocError'
    this.code = 'INVALID_DOC_ERROR'
    this.status = 400
  }
}

export class ServerNotListeningError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Server is not listening on a port', opts)
    this.name = 'ServerNotListeningError'
    this.code = 'SERVER_NOT_LISTENING_ERROR'
    this.status = 503
  }
}

export class UnsupportedVariantError extends Error {
  /**
   * @param {string} variant
   * @param {string} type
   * @param {ErrorOptions} [opts]
   **/
  constructor(variant, type, opts) {
    super(`Unsupported variant "${variant}" for ${type}`, opts)
    this.name = 'UnsupportedVariantError'
    this.code = 'UNSUPPORTED_VARIANT_ERROR'
    this.status = 400
  }
}

export class BlobStoreEntryNotFoundError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */

  constructor(opts) {
    super('Blob store entry not found', opts)
    this.name = 'BlobStoreEntryNotFoundError'
    this.code = 'BLOB_STORE_ENTRY_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class BlobNotFoundError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */

  constructor(opts) {
    super('Blob not found', opts)
    this.name = 'BlobNotFoundError'
    this.code = 'BLOB_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class InvalidIconSizeError extends Error {
  /**
   * @param {string} value
   * @param {ErrorOptions} [opts]
   */
  constructor(value, opts) {
    super(`'${value}' is not a valid icon size`, opts)
    this.name = 'InvalidIconSizeError'
    this.code = 'INVALID_ICON_SIZE_ERROR'
    this.status = 400
  }
}

export class InvalidIconPixelDensityError extends Error {
  /**
   * @param {number} density
   * @param {ErrorOptions} [opts]
   */
  constructor(density, opts) {
    super(`Invalid icon pixel density: ${density}`, opts)
    this.name = 'InvalidIconPixelDensityError'
    this.code = 'INVALID_ICON_PIXEL_DENSITY_ERROR'
    this.status = 400
  }
}

export class FailedToGetStyleError extends Error {
  /**
   * @param {URL} url
   * @param {ErrorOptions} [opts]
   */
  constructor(url, opts) {
    super(`Failed to get style from ${url.href}`, opts)
    this.name = 'FailedToGetStyleError'
    this.code = 'FAILED_TO_GET_STYLE_ERROR'
    this.status = 500
  }
}

export class UnknownSchemaError extends Error {
  /**
   * @param {string} schemaName
   * @param {ErrorOptions} [opts]
   */
  constructor(schemaName, opts) {
    super(`IndexWriter doesn't know a schema named "${schemaName}"`, opts)
    this.name = 'UnknownSchemaError'
    this.code = 'UNKNOWN_SCHEMA_ERROR'
    this.status = 400
  }
}

export class InvalidLanguageTagError extends Error {
  /**
   * @param {string} languageTag
   * @param {ErrorOptions} [opts]
   */
  constructor(languageTag, opts) {
    super(`Invalid BCP 47 language tag: ${languageTag}`, opts)
    this.name = 'InvalidLanguageTagError'
    this.code = 'INVALID_LANGUAGE_TAG_ERROR'
    this.status = 400
  }
}

export class DuplicateKeyError extends Error {
  /**
   * @param {*} key
   * @param {ErrorOptions} [opts]
   */
  constructor(key, opts) {
    super(`Duplicate key: ${JSON.stringify(key)}`, opts)
    this.name = 'DuplicateKeyError'
    this.code = 'DUPLICATE_KEY_ERROR'
    this.status = 409
  }
}

export class InvalidComapeoSchemaFormatError extends Error {
  /**
   * @param {string} tableName
   * @param {string} reason
   * @param {ErrorOptions} [opts]
   */
  constructor(tableName, reason, opts) {
    super(
      `Cannot process JSONSchema from @comapeo/schema for ${tableName} SQL table: ${reason}`,
      opts
    )
    this.name = 'InvalidComapeoSchemaFormatError'
    this.code = 'INVALID_COMAPEO_SCHEMA_FORMAT_ERROR'
    this.status = 400
  }
}

export class InvalidBitfieldIndexError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super(`Index is not a multiple of 32`, opts)
    this.name = 'InvalidBitfieldIndexError'
    this.code = 'INVALID_BITFIELD_INDEX_ERROR'
    this.status = 400
  }
}

export class InvalidUrlError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Invalid URL provided', opts)
    this.name = 'InvalidUrlError'
    this.code = 'INVALID_URL'
    this.status = 400
  }
}

export class AlreadyBlockedError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super(`Member already blocked`, opts)
    this.name = 'AlreadyBlockedError'
    this.code = 'ALREADY_BLOCKED_ERROR'
    this.status = 403
  }
}

export class DeviceIdNotForServerError extends Error {
  /**
   * @param {string} deviceId
   * @param {ErrorOptions} [opts]
   */
  constructor(deviceId, opts) {
    super(`DeviceId ${deviceId} is not for a server peer`, opts)
    this.name = 'DeviceIdNotForServerError'
    this.code = 'DEVICE_ID_NOT_FOR_SERVER_ERROR'
    this.status = 403
  }
}

export class IncompleteProjectDataError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Project must have name to add server peer', opts)
    this.name = 'IncompleteProjectDataError'
    this.code = 'INCOMPLETE_PROJECT_DATA_ERROR'
    this.status = 400
  }
}

export class NetworkError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Network error', opts) {
    super(message, opts)
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
  constructor(message = 'Invalid Server Response', options) {
    super(message, options)
    this.name = 'InvalidServerResponseError'
    this.code = 'INVALID_SERVER_RESPONSE'
    this.status = 502
  }
}

export class ProjectNotInAllowlistError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super(
      "The server only allows specific projects to be added, and this isn't one of them",
      opts
    )
    this.name = 'ProjectNotInAllowlistError'
    this.code = 'PROJECT_NOT_IN_SERVER_ALLOWLIST'
    this.status = 403
  }
}

export class ServerTooManyProjectsError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super(
      "The server limits the number of projects it can have and it's at the limit",
      opts
    )
    this.name = 'ServerTooManyProjectsError'
    this.code = 'SERVER_HAS_TOO_MANY_PROJECTS'
    this.status = 429
  }
}

export class MissingOwnDeviceInfoError extends Error {
  /**
   * @param {ErrorOptions} opts
   */
  constructor(opts) {
    super('Own device information is missing', opts)
    this.name = 'MissingOwnDeviceInfoError'
    this.code = 'MISSING_OWN_DEVICE_INFO_ERROR'
    this.status = 400
  }
}

export class CategoryFileNotFoundError extends Error {
  /**
   * @param {string} filePath
   * @param {ErrorOptions} [opts]
   */
  constructor(filePath, opts) {
    super(`Category file not found at ${filePath}`, opts)
    this.name = 'CategoryFileNotFoundError'
    this.code = 'CATEGORY_FILE_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class MultipleCategoryImportsError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Cannot run multiple category imports at the same time', opts)
    this.name = 'MultipleCategoryImportsError'
    this.code = 'MULTIPLE_CATEGORY_IMPORTS_ERROR'
    this.status = 409
  }
}

export class UnknownPeerError extends Error {
  /**
   * @param {string} deviceId
   * @param {ErrorOptions} [opts]
   */
  constructor(deviceId, opts) {
    super('Unknown peer ' + deviceId, opts)
    this.name = 'UnknownPeerError'
    this.code = 'UNKNOWN_PEER_ERROR'
    this.status = 404
  }
}

export class PeerDisconnectedError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Peer disconnected', opts) {
    super(message, opts)
    this.name = 'PeerDisconnectedError'
    this.code = 'PEER_DISCONNECTED_ERROR'
    this.status = 504
  }
}

export class PeerFailedConnectionError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Peer failed to connect before disconnect was called', opts)
    this.name = 'PeerFailedConnectionError'
    this.code = 'PEER_FAILED_CONNECTION_ERROR'
    this.status = 408
  }
}

export class UnknownError extends Error {
  /**
   * @param {any} err
   * @param {ErrorOptions} [opts]
   */
  constructor(err, opts) {
    super(`An unexpected error type occurred: ${err}`, opts)
    this.name = 'UnknownError'
    this.code = 'UNKNOWN_ERROR'
    this.status = 500
  }
}

export class ExhaustivenessError extends Error {
  /**
   * @param {never} value
   * @param {ErrorOptions} [opts]
   */
  constructor(value, opts) {
    super(`Exhaustiveness check failed. ${value} should be impossible`, opts)
    this.name = 'ExhaustivenessError'
    this.code = 'EXHAUSTIVENESS_ERROR'
    this.status = 500
  }
}

export class PeerNotFoundError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Peer not found', opts) {
    super(message, opts)
    this.name = 'PeerNotFoundError'
    this.code = 'PEER_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class InvalidMapShareError extends Error {
  /**
   * @param {string} message
   * @param {ErrorOptions} [opts]
   */
  constructor(message, opts) {
    super(message, opts)
    this.name = 'InvalidMapShareError'
    this.code = 'INVALID_MAP_SHARE_ERROR'
    this.status = 400
  }
}

export class InvalidResponseBodyError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Response body is not valid', opts)
    this.name = 'InvalidResponseBodyError'
    this.code = 'INVALID_RESPONSE_BODY_ERROR'
    this.status = 400
  }
}

export class InvalidInviteError extends Error {
  /**
   * @param {string} message
   * @param {ErrorOptions} [opts]
   */
  constructor(message, opts) {
    super(message, opts)
    this.name = 'InvalidInviteError'
    this.code = 'INVALID_INVITE_ERROR'
    this.status = 400
  }
}

export class InviteNotFoundError extends Error {
  /**
   * @param {Buffer} inviteId
   * @param {ErrorOptions} [opts]
   */
  constructor(inviteId, opts) {
    super(`Cannot find invite ${inviteId.toString('hex')}`, opts)
    this.name = 'InviteNotFoundError'
    this.code = 'INVITE_NOT_FOUND_ERROR'
    this.status = 404
  }
}

export class AlreadyInvitingError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Already invited this device ID', opts) {
    super(message, opts)
    this.name = 'AlreadyInvitingError'
    this.code = 'ALREADY_INVITING_ERROR'
    this.status = 409
  }
}

export class InvalidRoleIDForNewInviteError extends Error {
  /**
   * @param {string} roleId
   * @param {ErrorOptions} [opts]
   */
  constructor(roleId, opts) {
    super(`Invalid role ID for new invite: ${roleId}`, opts)
    this.name = 'InvalidRoleIDForNewInviteError'
    this.code = 'INVALID_ROLE_ID_FOR_NEW_INVITE_ERROR'
    this.status = 400
  }
}

export class InvalidProjectNameError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Project must have a name to invite people', opts) {
    super(message, opts)
    this.name = 'InvalidProjectNameError'
    this.code = 'INVALID_PROJECT_NAME_ERROR'
    this.status = 400
  }
}

export class InvalidProjectKeyError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(
    message = 'Project owner core public key must be 32-byte buffer',
    opts
  ) {
    super(message, opts)
    this.name = 'InvalidProjectKeyError'
    this.code = 'INVALID_PROJECT_KEY_ERROR'
    this.status = 400
  }
}

export class InvalidProjectSecretKeyError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(
    message = 'Project owner core secret key must be 64-byte buffer',
    opts
  ) {
    super(message, opts)
    this.name = 'InvalidProjectSecretKeyError'
    this.code = 'INVALID_PROJECT_SECRET_KEY_ERROR'
    this.status = 400
  }
}

export class InvalidProjectJoinDetailsError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message, opts) {
    super(message, opts)
    this.name = 'InvalidProjectJoinDetailsError'
    this.code = 'INVALID_PROJECT_JOIN_DETAILS_ERROR'
    this.status = 400
  }
}

export class UnexpectedError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'An unexpected error occurred', opts) {
    super(message, opts)
    this.name = 'UnexpectedError'
    this.code = 'UNEXPECTED_ERROR'
    this.status = 500
  }
}

export class AutoStopTimeoutError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(
    message = 'Auto-stop timeout must be Infinity or a positive integer between 0 and the largest 32-bit signed integer',
    opts
  ) {
    super(message, opts)
    this.name = 'AutoStopTimeoutError'
    this.code = 'AUTO_STOP_TIMEOUT_ERROR'
    this.status = 400
  }
}

export class MissingDiscoveryKeyError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(opts) {
    super('Core should have a discovery key', opts)
    this.name = 'MissingDiscoveryKeyError'
    this.code = 'MISSING_DISCOVERY_KEY_ERROR'
    this.status = 400
  }
}

export class InvalidDrizzleQueryResultError extends Error {
  /**
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Expected query to return proper result', opts) {
    super(message, opts)
    this.name = 'InvalidDrizzleQueryResultError'
    this.code = 'INVALID_DRIZZLE_QUERY_RESULT_ERROR'
    this.status = 400
  }
}

export class InvalidDrizzleJournalError extends Error {
  /**
   * @param {string} [message]
   * @param {ErrorOptions} [opts]
   */
  constructor(message = 'Invalid journal', opts) {
    super(message, opts)
    this.name = 'InvalidDrizzleJournalError'
    this.code = 'INVALID_DRIZZLE_JOURNAL_ERROR'
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
 * Throw an UnexpectedErrorTypeError if this is not a standard error
 * @param {Error & {status?: number, code?: string} | any} err
 */
export function ensureKnownError(err) {
  if (typeof err.status !== 'number' || typeof err.code !== 'string') {
    return new UnknownError(err)
  }
  return err
}
