import { Type } from '@sinclair/typebox'
import { kProjectReplicate } from '../mapeo-project.js'
import { wsCoreReplicator } from './ws-core-replicator.js'
import timingSafeEqual from '../lib/timing-safe-equal.js'
/** @import {FastifyInstance, FastifyPluginAsync, FastifyRequest, RawServerDefault} from 'fastify' */
/** @import {TypeBoxTypeProvider} from '@fastify/type-provider-typebox' */

const BEARER_SPACE_LENGTH = 'Bearer '.length
const HEX_REGEX_32_BYTES = '^[0-9a-fA-F]{64}$'
const HEX_STRING_32_BYTES = Type.String({ pattern: HEX_REGEX_32_BYTES })
const BASE32_REGEX_32_BYTES = '^[0-9A-Za-z]{52}$'
const BASE32_STRING_32_BYTES = Type.String({ pattern: BASE32_REGEX_32_BYTES })

/**
 * @typedef {object} RouteOptions
 * @prop {string} serverBearerToken
 * @prop {string} serverName
 */

/** @type {FastifyPluginAsync<RouteOptions, RawServerDefault, TypeBoxTypeProvider>} */
export default async function routes(
  fastify,
  { serverBearerToken, serverName }
) {
  /**
   * @param {FastifyRequest} req
   */
  const verifyBearerAuth = (req) => {
    if (!isBearerTokenValid(req.headers.authorization, serverBearerToken)) {
      throw fastify.httpErrors.forbidden('Invalid bearer token')
    }
  }

  fastify.get(
    '/info',
    {
      schema: {
        response: {
          200: Type.Object({
            data: Type.Object({
              deviceId: Type.String(),
              name: Type.String(),
            }),
          }),
          500: { $ref: 'HttpError' },
        },
      },
    },
    async function (_req, reply) {
      const { deviceId, name } = this.comapeo.getDeviceInfo()
      reply.send({
        data: { deviceId, name: name || serverName },
      })
    }
  )

  fastify.get(
    '/sync/:projectPublicId',
    {
      schema: {
        params: Type.Object({
          projectPublicId: BASE32_STRING_32_BYTES,
        }),
        response: {
          404: { $ref: 'HttpError' },
        },
      },
      async preHandler(req) {
        await ensureProjectExists(this, req)
      },
      websocket: true,
    },
    async function (socket, req) {
      // The preValidation hook ensures that the project exists
      const project = await this.comapeo.getProject(req.params.projectPublicId)
      const replicationStream = project[kProjectReplicate](
        // TODO: See if we can fix this type cast
        /** @type {any} */ (false)
      )
      wsCoreReplicator(socket, replicationStream)
    }
  )

  fastify.post(
    '/projects',
    {
      schema: {
        body: Type.Object({
          projectKey: HEX_STRING_32_BYTES,
          encryptionKeys: Type.Object({
            auth: HEX_STRING_32_BYTES,
            config: HEX_STRING_32_BYTES,
            data: HEX_STRING_32_BYTES,
            blobIndex: HEX_STRING_32_BYTES,
            blob: HEX_STRING_32_BYTES,
          }),
        }),
        response: {
          200: Type.Object({
            data: Type.Object({
              deviceId: HEX_STRING_32_BYTES,
            }),
          }),
          400: { $ref: 'HttpError' },
        },
      },
    },
    async function (req, reply) {
      const hasExistingProject = (await this.comapeo.listProjects()).length > 0
      // TODO: Different error message, or 200 response, if a project with a
      // matching projectToken already exists.
      this.assert(
        !hasExistingProject,
        403,
        'Server is already linked to a project'
      )

      const baseUrl = new URL(
        fastify.prefix,
        `${req.protocol}://${req.hostname}`
      ).toString()

      const existingDeviceInfo = this.comapeo.getDeviceInfo()
      // We don't set device info until this point. We trust that `req.hostname`
      // is the hostname we want clients to use to sync to the server.
      if (
        existingDeviceInfo.deviceType === 'device_type_unspecified' ||
        existingDeviceInfo.selfHostedServerDetails?.baseUrl !== baseUrl
      ) {
        await this.comapeo.setDeviceInfo({
          deviceType: 'selfHostedServer',
          name: serverName,
          selfHostedServerDetails: { baseUrl },
        })
      }

      const projectKey = Buffer.from(req.body.projectKey, 'hex')

      const projectId = await this.comapeo.addProject(
        {
          projectKey,
          projectName: 'TODO: Figure out if this should be named',
          encryptionKeys: {
            auth: Buffer.from(req.body.encryptionKeys.auth, 'hex'),
            config: Buffer.from(req.body.encryptionKeys.config, 'hex'),
            data: Buffer.from(req.body.encryptionKeys.data, 'hex'),
            blobIndex: Buffer.from(req.body.encryptionKeys.blobIndex, 'hex'),
            blob: Buffer.from(req.body.encryptionKeys.blob, 'hex'),
          },
        },
        { waitForSync: false }
      )
      const project = await this.comapeo.getProject(projectId)
      project.$sync.start()

      reply.send({
        data: {
          deviceId: this.comapeo.deviceId,
        },
      })
      return reply
    }
  )

  fastify.get(
    '/projects/:projectPublicId/observations',
    {
      schema: {
        params: Type.Object({
          projectPublicId: BASE32_STRING_32_BYTES,
        }),
        response: {
          403: { $ref: 'HttpError' },
          404: { $ref: 'HttpError' },
        },
      },
      async preHandler(req) {
        verifyBearerAuth(req)
        await ensureProjectExists(this, req)
      },
    },
    async function (req, reply) {
      const { projectPublicId } = req.params
      const project = await this.comapeo.getProject(projectPublicId)
      const baseUrl = new URL(
        fastify.prefix,
        `${req.protocol}://${req.hostname}`
      )

      reply.send({
        data: (await project.observation.getMany()).map((obs) => ({
          docId: obs.docId,
          createdAt: obs.createdAt,
          updatedAt: obs.updatedAt,
          lat: obs.lat,
          lon: obs.lon,
          attachments: obs.attachments.map((attachment) => ({
            url: new URL(
              // TODO: Support other variants
              `projects/${projectPublicId}/attachments/${attachment.driveDiscoveryId}/${attachment.type}/${attachment.name}`,
              baseUrl
            ),
          })),
        })),
      })
    }
  )

  fastify.get(
    '/projects/:projectPublicId/attachments/:driveDiscoveryId/:type/:name',
    {
      schema: {
        params: Type.Object({
          projectPublicId: BASE32_STRING_32_BYTES,
          driveDiscoveryId: Type.String(),
          // TODO: For now, only photos are supported.
          type: Type.Literal('photo'),
          name: Type.String(),
        }),
        querystring: Type.Object({
          variant: Type.Optional(
            Type.Union([
              Type.Literal('original'),
              Type.Literal('preview'),
              Type.Literal('thumbnail'),
            ])
          ),
        }),
        response: {
          403: { $ref: 'HttpError' },
          404: { $ref: 'HttpError' },
        },
      },
      async preHandler(req) {
        verifyBearerAuth(req)
        await ensureProjectExists(this, req)
      },
    },
    async function (req, reply) {
      const project = await this.comapeo.getProject(req.params.projectPublicId)

      const blobUrl = await project.$blobs.getUrl({
        driveId: req.params.driveDiscoveryId,
        name: req.params.name,
        type: req.params.type,
        variant: req.query.variant || 'original',
      })

      const proxiedResponse = await fetch(blobUrl)
      reply.code(proxiedResponse.status)
      // TODO: Are there other headers we want to pass through?
      reply.header('Content-Type', proxiedResponse.headers.get('content-type'))
      reply.header(
        'Content-Length',
        proxiedResponse.headers.get('content-length')
      )
      return reply.send(proxiedResponse.body)
    }
  )
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} req
 * @param {object} req.params
 * @param {string} req.params.projectPublicId
 * @returns {Promise<void>}
 */
async function ensureProjectExists(fastify, req) {
  try {
    await fastify.comapeo.getProject(req.params.projectPublicId)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('NotFound')) {
      throw fastify.httpErrors.notFound('Project not found')
    }
    throw e
  }
}

/**
 * @param {undefined | string} headerValue
 * @param {string} expectedBearerToken
 * @returns {boolean}
 */
function isBearerTokenValid(headerValue = '', expectedBearerToken) {
  // This check is not strictly required for correctness, but helps protect
  // against long values.
  const expectedLength = BEARER_SPACE_LENGTH + expectedBearerToken.length
  if (headerValue.length !== expectedLength) return false

  if (!headerValue.startsWith('Bearer ')) return false
  const actualBearerToken = headerValue.slice(BEARER_SPACE_LENGTH)

  return timingSafeEqual(actualBearerToken, expectedBearerToken)
}
