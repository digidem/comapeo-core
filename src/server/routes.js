import { Type } from '@sinclair/typebox'

/** @import {FastifyPluginAsync, RawServerDefault} from 'fastify' */
/** @import {TypeBoxTypeProvider} from '@fastify/type-provider-typebox' */
/** @typedef {Record<never, never>} RouteOptions */

const HEX_REGEX_32_BYTES = '^[0-9a-fA-F]{64}$'
const HEX_STRING_32_BYTES = Type.String({ pattern: HEX_REGEX_32_BYTES })

/** @type {FastifyPluginAsync<RouteOptions, RawServerDefault, TypeBoxTypeProvider>} */
export default async function routes(fastify) {
  fastify.get(
    '/sync/:projectPublicId',
    {
      schema: {
        params: Type.Object({
          projectPublicId: HEX_STRING_32_BYTES,
        }),
      },
    },
    async function (req, reply) {
      /** @type {import('../mapeo-project.js').MapeoProject | undefined} */
      let _project
      try {
        _project = await this.comapeo.getProject(req.params.projectPublicId)
      } catch (err) {
        return reply.status(404).send()
      }
      return reply.status(200).send('TODO: Implement this route')
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
            deviceId: HEX_STRING_32_BYTES,
          }),
          400: Type.Object({
            message: Type.String(),
          }),
        },
      },
    },
    async function (req, reply) {
      const hasExistingProject = await this.comapeo
        .listProjects()
        .then((projects) => projects.length > 0)

      if (hasExistingProject) {
        reply.status(400)
        reply.send({ message: 'Only one project is allowed' })
        return reply
      }

      const projectKey = Buffer.from(req.body.projectKey, 'hex')

      await this.comapeo.addProject(
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

      reply.send({ deviceId: this.comapeo.deviceId })
      return reply
    }
  )
}
