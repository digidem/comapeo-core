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
  namespace: 'auth',
  schemaType: 'CoreOwnership',
  schemaVersion: 1,
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
  namespace: 'auth',
  schemaType: 'Device',
  schemaVersion: 1,
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
  namespace: 'auth',
  schemaType: 'Role',
  schemaVersion: 1,
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
