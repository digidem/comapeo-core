import { MapeoProject } from '../mapeo-project'

declare module 'fastify' {
  interface FastifyInstance {
    getProject: (projectId: string) => Promise<MapeoProject>
  }
}
