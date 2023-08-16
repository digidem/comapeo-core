declare module '@gravitysoftware/dnssd' {
  export function tcp(...args: string[]): ServiceType
  export function tcp(service: string | string[]): ServiceType

  interface AdvertisementOptions {
    name?: string
    host?: string
    txt?: Object
    subtypes?: Object
    interface?: Object
    hostTTl?: number
    serviceTTl?: number
  }

  export class Advertisement {
    constructor(type: ServiceType, port: number, options?: AdvertisementOptions)

    on(event: 'error', listener: (error: Error) => void): void
    on(event: 'stopped', listener: () => void): void
    start(): void
    stop(immediate: Boolean): void
    updateTXT(txt: Object): void
  }

  export class Browser {
    constructor(type: ServiceType)

    on(event: 'error', listener: (error: Error) => void): void
    on(event: 'serviceUp', listener: (service: Service) => void): void
    on(event: 'serviceDown', listener: (service: Service) => void): void
    on(event: 'serviceChanged', listener: (service: Service) => void): void
    on(event: 'stop', listener: () => void): void
    start(): void
    stop(): void
  }

  export class ServiceType {
    constructor(serviceType: ServiceIdentifier)
  }

  export class Service {
    host: string
    port: number
    txt: {
      [key: string]: any
    }
  }

  interface ServiceIdentifier {
    name: string
    protocol: string
    subtypes: string[]
  }
}
