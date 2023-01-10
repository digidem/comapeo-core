export const availableCapabilities = ['read', 'write', 'edit', 'manage:devices']

/** @type {AvailableRoles} */
export const defaultRoles = [
  {
    name: 'project-creator',
    capabilities: ['read', 'write', 'manage:devices'],
  },
  {
    name: 'coordinator',
    capabilities: ['read', 'write', 'manage:devices'],
  },
  {
    name: 'member',
    capabilities: ['read', 'write'],
  },
  {
    name: 'non-member',
    capabilities: [],
  },
]

export const coreOwnership = {
  name: 'coreOwnership',
  blockPrefix: '0',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: { type: 'string', pattern: '^coreOwnership$' },
      coreId: { type: 'string' },
      projectId: { type: 'string' },
      storeType: { type: 'string' },
      signature: { type: 'string' },
      action: {
        type: 'string',
        enum: ['core:owner'],
      },
    },
    additionalProperties: false,
  },
  extraColumns: `
        authorId TEXT,
        type TEXT,
        action TEXT,
        coreId TEXT,
        projectId TEXT,
        authorIndex INTEGER,
        deviceIndex INTEGER,
        created INTEGER,
        timestamp INTEGER,
        signature TEXT
    `,
}

export const devices = {
  name: 'devices',
  blockPrefix: '1',
  schema: {
    properties: {
      type: { type: 'string', pattern: '^devices$' },
      action: {
        type: 'string',
        enum: ['device:add', 'device:remove', 'device:restore'],
      },
    },
    additionalProperties: true, // TODO: add full schema to mapeo-schema
  },
  extraColumns: `
    authorId TEXT,
    type TEXT,
    action TEXT,
    identityId TEXT,
    authorIndex INTEGER,
    deviceIndex INTEGER,
    created INTEGER,
    timestamp INTEGER,
    signature TEXT
  `,
}

export const roles = {
  name: 'roles',
  blockPrefix: '2',
  schema: {
    properties: {
      type: { type: 'string', pattern: '^roles$' },
      role: {
        type: 'string',
        enum: defaultRoles.map((r) => r.name),
      },
      projectId: { type: 'string' },
      action: {
        type: 'string',
        enum: ['role:set'],
      },
    },
    additionalProperties: true, // TODO: add full schema to mapeo-schema
  },
  extraColumns: `
    authorId TEXT,
    type TEXT,
    role TEXT,
    action TEXT,
    identityId TEXT,
    projectId TEXT,
    authorIndex INTEGER,
    deviceIndex INTEGER,
    created INTEGER,
    timestamp INTEGER,
    signature TEXT
  `,
}

export const capabilities = {
  name: 'capabilities',
  blockPrefix: '3',
  schema: {
    properties: {
      type: { type: 'string', pattern: '^capabilities$' },
      capability: {
        type: 'string',
        enum: availableCapabilities,
      },
      action: {
        type: 'string',
        enum: ['capability:add', 'capability:remove'],
      },
    },
    additionalProperties: true, // TODO: add full schema to mapeo-schema
  },
  extraColumns: `
    authorId TEXT,
    type TEXT,
    capability: TEXT,
    action TEXT,
    identityId TEXT,
    authorIndex INTEGER,
    deviceIndex INTEGER,
    created INTEGER,
    timestamp INTEGER,
    signature TEXT
  `,
}
