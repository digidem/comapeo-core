// @ts-nocheck
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
      timestamp: { type: 'integer' },
      links: {
        type: 'array',
        uniqueItems: true,
        items: { type: 'string' },
      },
      version: { type: 'string' },
      action: {
        type: 'string',
        enum: ['core:owner'],
      },
      coreId: { type: 'string' },
      projectId: { type: 'string' },
      storeType: { type: 'string' },
      signature: { type: 'string' },
      authorIndex: { type: 'integer' },
      deviceIndex: { type: 'integer' },
    },
  },
  extraColumns: `
        created INTEGER,
        timestamp INTEGER,
        authorId TEXT,
        type TEXT,
        action TEXT,
        coreId TEXT,
        projectId TEXT,
        storeType TEXT,
        authorIndex INTEGER,
        deviceIndex INTEGER,
        signature TEXT
    `,
}

export const devices = {
  name: 'devices',
  blockPrefix: '1',
  schema: {
    properties: {
      id: { type: 'string' },
      type: { type: 'string', pattern: '^devices$' },
      timestamp: { type: 'integer' },
      links: {
        type: 'array',
        uniqueItems: true,
        items: { type: 'string' },
      },
      version: { type: 'string' },
      action: {
        type: 'string',
        enum: ['device:add', 'device:remove', 'device:restore'],
      },
      authorId: { type: 'string' },
      projectId: { type: 'string' },
      signature: { type: 'string' },
      authorIndex: { type: 'integer' },
      deviceIndex: { type: 'integer' },
    },
  },
  extraColumns: `
    created INTEGER,
    timestamp INTEGER,
    authorId TEXT,
    type TEXT,
    action TEXT,
    identityId TEXT,
    authorIndex INTEGER,
    deviceIndex INTEGER,
    signature TEXT
  `,
}

export const roles = {
  name: 'roles',
  blockPrefix: '2',
  schema: {
    properties: {
      id: { type: 'string' },
      type: { type: 'string', pattern: '^roles$' },
      timestamp: { type: 'integer' },
      links: {
        type: 'array',
        uniqueItems: true,
        items: { type: 'string' },
      },
      version: { type: 'string' },
      role: {
        type: 'string',
        enum: defaultRoles.map((r) => r.name),
      },
      projectId: { type: 'string' },
      action: {
        type: 'string',
        enum: ['role:set'],
      },
      signature: { type: 'string' },
      authorIndex: { type: 'integer' },
      deviceIndex: { type: 'integer' },
    },
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
