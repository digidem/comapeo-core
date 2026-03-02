import { createErrorClass } from 'custom-error-creator'

export const NotFoundError = createErrorClass({
  code: 'NOT_FOUND_ERROR',
  message: 'Not found',
  status: 404,
})

export const AlreadyJoinedError = createErrorClass({
  code: 'ALREADY_JOINED_ERROR',
  message: 'Already joined a project',
  status: 409,
})

export const InviteSendError = createErrorClass({
  code: 'INVITE_SEND_ERROR',
  message: 'Failed to send invite',
  status: 500,
})

export const InviteAbortedError = createErrorClass({
  code: 'INVITE_ABORTED_ERROR',
  message: 'Invite aborted',
  status: 499,
})

export const ProjectDetailsSendFailError = createErrorClass({
  code: 'PROJECT_DETAILS_SEND_FAIL_ERROR',
  message: 'Failed to send project details',
  status: 500,
})

export const RPCDisconnectBeforeSendingError = createErrorClass({
  code: 'RPC_DISCONNECT_BEFORE_SENDING_ERROR',
  message: 'RPC disconnected before sending request',
  status: 499,
})

export const RPCDisconnectBeforeAckError = createErrorClass({
  code: 'RPC_DISCONNECT_BEFORE_ACK_ERROR',
  message: 'RPC disconnected before receiving acknowledgement',
  status: 499,
})

export const TimeoutError = createErrorClass({
  code: 'TIMEOUT_ERROR',
  message: 'Operation timed out',
  status: 504,
})

export const UnsupportedMimeTypeError = createErrorClass({
  code: 'UNSUPPORTED_MIME_TYPE_ERROR',
  message: 'Unsupported mimeType: {mimeType}',
  status: 415,
})

export const InvalidCoreOwnershipError = createErrorClass({
  code: 'INVALID_CORE_OWNERSHIP_ERROR',
  message: 'Invalid coreOwnership record',
  status: 400,
})

export const EmptyVariantsArrayError = createErrorClass({
  code: 'EMPTY_VARIANTS_ARRAY_ERROR',
  message: 'Empty variants array',
  status: 400,
})

export const NoVariantsExistError = createErrorClass({
  code: 'NO_VARIANTS_EXIST_ERROR',
  message: 'No variants exist',
  status: 404,
})

export const NoVariantsForMimeTypeError = createErrorClass({
  code: 'NO_VARIANTS_FOR_MIME_TYPE_ERROR',
  message: 'No variants with desired mime type {wantedMimeType} exist',
  status: 404,
})

export const EmptyIconPathError = createErrorClass({
  code: 'EMPTY_ICON_PATH_ERROR',
  message: 'IconId, size, and extension cannot be empty strings',
  status: 400,
})

export const InvalidPixelDensityError = createErrorClass({
  code: 'INVALID_PIXEL_DENSITY_ERROR',
  message: 'Invalid pixel density: {pixelDensity}',
  status: 400,
})

export const IconNotFoundError = createErrorClass({
  code: 'ICON_NOT_FOUND_ERROR',
  message: 'Icon {iconName} not found in import file',
  status: 404,
})

export const KeyNotFoundError = createErrorClass({
  code: 'KEY_NOT_FOUND_ERROR',
  message: 'Key {key} not found in map',
  status: 404,
})

export const ProjectExistsError = createErrorClass({
  code: 'PROJECT_EXISTS_ERROR',
  message: 'Project with ID {projectPublicId} already exists',
  status: 409,
})

export const FailedToSetIsArchiveDeviceError = createErrorClass({
  code: 'FAILED_TO_SET_IS_ARCHIVE_DEVICE_ERROR',
  message: 'Failed to set isArchiveDevice',
  status: 500,
})

export const EncryptionKeysNotFoundError = createErrorClass({
  code: 'ENCRYPTION_KEYS_NOT_FOUND_ERROR',
  message: 'EncryptionKeys should not be undefined',
  status: 400,
})

export const InvalidDeviceInfoError = createErrorClass({
  code: 'INVALID_DEVICE_INFO_ERROR',
  message:
    'Invalid deviceInfo record, cannot write deviceInfo for another device',
  status: 400,
})

export const RoleAssignError = createErrorClass({
  code: 'ROLE_ASSIGN_ERROR',
  message: '{message}',
  status: 403,
})

export const UnsupportedAttachmentTypeError = createErrorClass({
  code: 'UNSUPPORTED_ATTACHMENT_TYPE_ERROR',
  message: 'Cannot fetch URL for attachment type "{attachmentType}"',
  status: 415,
})

export const UnexpectedEndOfStreamError = createErrorClass({
  code: 'UNEXPECTED_END_OF_STREAM_ERROR',
  message: 'Entries stream ended unexpectedly',
  status: 499,
})

export const DriveNotFoundError = createErrorClass({
  code: 'DRIVE_NOT_FOUND_ERROR',
  message: 'Drive not found: {driveId}',
  status: 404,
})

export const BlobsNotFoundError = createErrorClass({
  code: 'BLOBS_NOT_FOUND_ERROR',
  message: 'HyperBlobs not found for drive: {driveId}',
  status: 404,
})

export const BlobReadError = createErrorClass({
  code: 'BLOB_READ_ERROR',
  message: 'Unable to find blob data at {path}',
  status: 404,
})

export const MigrationError = createErrorClass({
  code: 'MIGRATION_ERROR',
  message: 'Unable to complete Drizzle Database migration',
  status: 500,
})

export const GeoJSONExportError = createErrorClass({
  code: 'GEOJSON_EXPORT_ERROR',
  message: 'Unable to export GeoJSON file',
  status: 500,
})

export const MissingWriterError = createErrorClass({
  code: 'MISSING_WRITER_ERROR',
  message: 'Could not find a writer for the {namespace} namespace',
  status: 404,
})

export const UnsupportedCorestoreOptsError = createErrorClass({
  code: 'UNSUPPORTED_CORESTORE_OPTS_ERROR',
  message: 'Unsupported corestore.get() with opts: {opts}',
  status: 400,
})

export const InvalidBitfieldError = createErrorClass({
  code: 'INVALID_BITFIELD_ERROR',
  message: 'Invalid RLE bitfield',
  status: 400,
})

export const InvalidDocSchemaError = createErrorClass({
  code: 'INVALID_DOC_SCHEMA_ERROR',
  message: "Schema '{schemaName}' is not allowed in namespace '{namespace}'",
  status: 403,
})

export const UnexpectedDocSchemaError = createErrorClass({
  code: 'UNEXPECTED_DOC_SCHEMA_ERROR',
  message: 'Expected {expectedSchema} but got {gotSchema}',
  status: 403,
})

export const WriterCoreNotReadyError = createErrorClass({
  code: 'WRITER_CORE_NOT_READY_ERROR',
  message: 'Writer core is not ready',
  status: 503,
})

export const InvalidVersionIdError = createErrorClass({
  code: 'INVALID_VERSION_ID_ERROR',
  message: 'Invalid versionId',
  status: 404,
})

export const InvalidDocFormatError = createErrorClass({
  code: 'INVALID_DOC_FORMAT_ERROR',
  message: 'Invalid value: {value}',
  status: 400,
})

export const DocAlreadyExistsError = createErrorClass({
  code: 'DOC_ALREADY_EXISTS_ERROR',
  message: 'Doc with docId {docId} already exists',
  status: 409,
})

export const DocAlreadyDeletedError = createErrorClass({
  code: 'DOC_ALREADY_DELETED_ERROR',
  message: 'Doc already deleted',
  status: 409,
})

export const InvalidDocError = createErrorClass({
  code: 'INVALID_DOC_ERROR',
  message: 'Updated docs must have the same docId and schemaName',
  status: 400,
})

export const ServerNotListeningError = createErrorClass({
  code: 'SERVER_NOT_LISTENING_ERROR',
  message: 'Server is not listening on a port',
  status: 503,
})

export const UnsupportedVariantError = createErrorClass({
  code: 'UNSUPPORTED_VARIANT_ERROR',
  message: 'Unsupported variant "{variant}" for {type}',
  status: 400,
})

export const BlobStoreEntryNotFoundError = createErrorClass({
  code: 'BLOB_STORE_ENTRY_NOT_FOUND_ERROR',
  message: 'Blob store entry not found',
  status: 404,
})

export const BlobNotFoundError = createErrorClass({
  code: 'BLOB_NOT_FOUND_ERROR',
  message: 'Blob not found',
  status: 404,
})

export const InvalidIconSizeError = createErrorClass({
  code: 'INVALID_ICON_SIZE_ERROR',
  message: '{value} is not a valid icon size',
  status: 400,
})

export const InvalidIconPixelDensityError = createErrorClass({
  code: 'INVALID_ICON_PIXEL_DENSITY_ERROR',
  message: 'Invalid icon pixel density: {density}',
  status: 400,
})

export const FailedToGetStyleError = createErrorClass({
  code: 'FAILED_TO_GET_STYLE_ERROR',
  message: 'Failed to get style from {href}',
  status: 500,
})

export const UnknownSchemaError = createErrorClass({
  code: 'UNKNOWN_SCHEMA_ERROR',
  message: 'IndexWriter doesn\'t know a schema named "{schemaName}"',
  status: 400,
})

export const InvalidLanguageTagError = createErrorClass({
  code: 'INVALID_LANGUAGE_TAG_ERROR',
  message: 'Invalid BCP 47 language tag: {languageTag}',
  status: 400,
})

export const DuplicateKeyError = createErrorClass({
  code: 'DUPLICATE_KEY_ERROR',
  message: 'Duplicate key: {key}',
  status: 409,
})

export const InvalidComapeoSchemaFormatError = createErrorClass({
  code: 'INVALID_COMAPEO_SCHEMA_FORMAT_ERROR',
  message:
    'Cannot process JSONSchema from @comapeo/schema for {tableName} SQL table: {reason}',
  status: 400,
})

export const InvalidBitfieldIndexError = createErrorClass({
  code: 'INVALID_BITFIELD_INDEX_ERROR',
  message: 'Index is not a multiple of 32',
  status: 400,
})

export const InvalidUrlError = createErrorClass({
  code: 'INVALID_URL',
  message: 'Invalid URL provided',
  status: 400,
})

export const AlreadyBlockedError = createErrorClass({
  code: 'ALREADY_BLOCKED_ERROR',
  message: 'Member already blocked',
  status: 403,
})

export const DeviceIdNotForServerError = createErrorClass({
  code: 'DEVICE_ID_NOT_FOR_SERVER_ERROR',
  message: 'DeviceId {deviceId} is not for a server peer',
  status: 403,
})

export const IncompleteProjectDataError = createErrorClass({
  code: 'INCOMPLETE_PROJECT_DATA_ERROR',
  message: 'Project must have name to add server peer',
  status: 400,
})

export const NetworkError = createErrorClass({
  code: 'NETWORK_ERROR',
  message: 'Network error',
  status: 502,
})

export const InvalidServerResponseError = createErrorClass({
  code: 'INVALID_SERVER_RESPONSE',
  message: 'Invalid Server Response',
  status: 502,
})

export const ProjectNotInAllowlistError = createErrorClass({
  code: 'PROJECT_NOT_IN_SERVER_ALLOWLIST',
  message:
    "The server only allows specific projects to be added, and this isn't one of them",
  status: 403,
})

export const ServerTooManyProjectsError = createErrorClass({
  code: 'SERVER_HAS_TOO_MANY_PROJECTS',
  message:
    "The server limits the number of projects it can have and it's at the limit",
  status: 429,
})

export const MissingOwnDeviceInfoError = createErrorClass({
  code: 'MISSING_OWN_DEVICE_INFO_ERROR',
  message: 'Own device information is missing',
  status: 400,
})

export const CategoryFileNotFoundError = createErrorClass({
  code: 'CATEGORY_FILE_NOT_FOUND_ERROR',
  message: 'Category file not found at {filePath}',
  status: 404,
})

export const MultipleCategoryImportsError = createErrorClass({
  code: 'MULTIPLE_CATEGORY_IMPORTS_ERROR',
  message: 'Cannot run multiple category imports at the same time',
  status: 409,
})

export const UnknownPeerError = createErrorClass({
  code: 'UNKNOWN_PEER_ERROR',
  message: 'Unknown peer {deviceId}',
  status: 404,
})

export const PeerDisconnectedError = createErrorClass({
  code: 'PEER_DISCONNECTED_ERROR',
  message: 'Peer disconnected',
  status: 504,
})

export const PeerFailedConnectionError = createErrorClass({
  code: 'PEER_FAILED_CONNECTION_ERROR',
  message: 'Peer failed to connect before disconnect was called',
  status: 408,
})

export const UnknownError = createErrorClass({
  code: 'UNKNOWN_ERROR',
  message: 'An unexpected error type occurred: {err}',
  status: 500,
})

export const ExhaustivenessError = createErrorClass({
  code: 'EXHAUSTIVENESS_ERROR',
  message: 'Exhaustiveness check failed. {value} should be impossible',
  status: 500,
})

export const PeerNotFoundError = createErrorClass({
  code: 'PEER_NOT_FOUND_ERROR',
  message: 'Peer not found',
  status: 404,
})

export const InvalidMapShareError = createErrorClass({
  code: 'INVALID_MAP_SHARE_ERROR',
  message: '{message}',
  status: 400,
})

export const InvalidResponseBodyError = createErrorClass({
  code: 'INVALID_RESPONSE_BODY_ERROR',
  message: 'Response body is not valid',
  status: 400,
})

export const InvalidInviteError = createErrorClass({
  code: 'INVALID_INVITE_ERROR',
  message: '{message}',
  status: 400,
})

export const InviteNotFoundError = createErrorClass({
  code: 'INVITE_NOT_FOUND_ERROR',
  message: 'Cannot find invite {inviteId}',
  status: 404,
})

export const AlreadyInvitingError = createErrorClass({
  code: 'ALREADY_INVITING_ERROR',
  message: 'Already invited this device ID',
  status: 409,
})

export const InvalidRoleIDForNewInviteError = createErrorClass({
  code: 'INVALID_ROLE_ID_FOR_NEW_INVITE_ERROR',
  message: 'Invalid role ID for new invite: {roleId}',
  status: 400,
})

export const InvalidProjectNameError = createErrorClass({
  code: 'INVALID_PROJECT_NAME_ERROR',
  message: 'Project must have a name to invite people',
  status: 400,
})

export const InvalidProjectKeyError = createErrorClass({
  code: 'INVALID_PROJECT_KEY_ERROR',
  message: 'Project owner core public key must be 32-byte buffer',
  status: 400,
})

export const InvalidProjectSecretKeyError = createErrorClass({
  code: 'INVALID_PROJECT_SECRET_KEY_ERROR',
  message: 'Project owner core secret key must be 64-byte buffer',
  status: 400,
})

export const InvalidProjectJoinDetailsError = createErrorClass({
  code: 'INVALID_PROJECT_JOIN_DETAILS_ERROR',
  message: '{message}',
  status: 400,
})

export const UnexpectedError = createErrorClass({
  code: 'UNEXPECTED_ERROR',
  message: 'An unexpected error occurred',
  status: 500,
})

export const AutoStopTimeoutError = createErrorClass({
  code: 'AUTO_STOP_TIMEOUT_ERROR',
  message:
    'Auto-stop timeout must be Infinity or a positive integer between 0 and the largest 32-bit signed integer',
  status: 400,
})

export const MissingDiscoveryKeyError = createErrorClass({
  code: 'MISSING_DISCOVERY_KEY_ERROR',
  message: 'Core should have a discovery key',
  status: 400,
})

export const InvalidDrizzleQueryResultError = createErrorClass({
  code: 'INVALID_DRIZZLE_QUERY_RESULT_ERROR',
  message: 'Expected query to return proper result',
  status: 400,
})

export const InvalidDrizzleJournalError = createErrorClass({
  code: 'INVALID_DRIZZLE_JOURNAL_ERROR',
  message: 'Invalid journal',
  status: 400,
})

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
