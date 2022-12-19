# AuthStore

> Device access and capability authorization.

## Purpose
AuthStore is an internal Mapeo Core library used to authorize & verify device access and capabilities through a tree of statements describing each device's role and its relationships to other devices. 

The `AuthStore` class is responsible for authorizing access to Mapeo projects by defining the capabilities of each device through relationships with other devices. The `AuthStore` API is primarily meant to be internal to the higher-level `Mapeo` class API rather than used directly.

When a project is created, `AuthStore` writes records about the project, project creator, and the project creator's device. 
`AuthStore` is a collection of linked statements about the relationships between devices and the roles & capabilities assigned to each device. The tree of statements starts with the device assigned as project creator, which can then add devices and assign them roles.

By traversing the links between statements about devices and verifying the signatures of statements we can validate each device's capabilities. 

### Available roles & capabilities
In its current implementation AuthStore has three types of statements that it uses to describe devices: `Device`, `Role`, `CoreOwnership`.

The device statements are used to add, remove, and restore device access. The role statements are used to assign the role and its associated capabilities to a device. The core ownership statements are used to prove that a device owns a specific hypercore.

Each device in a project has a role. Roles define the capabilities a device has in the project. Roles are assigned by other devices. In assigning roles there is a tree of relationships between devices that can be used to validate a device's role & capabilities.

There is a limited set of capabilities that can be assigned to each role:
- `read` - read data & media in a project
- `write` - create new data & media in a project
- `edit` - edit data & media in a project
- `manage:devices` - assign roles and add, remove, and restore devices in a project

There are two required roles:
- `project-creator`
  - capabilities: `read`, `write`, `edit`, `manage:devices`
- `non-member`
  - capabilities: none

There are two other default roles:
- `coordinator`
  - capabilities: `read`, `write`, `edit`, `manage:devices`
- `member`
  - capabilities: `read`, `write`

Default roles can be overriden through optional project config.

Roles of devices can be changed by devices who have the `project-creator` and `coordinator` roles, as well as custom roles with the `manage:devices` capability. Devices can be removed from a project by a `project-creator` or `coordinator`. Access to a project can later be restored if needed.

The approach used so far makes it possible to define new types of statements about devices and their relationships. We could in the future, for example, add device statements that links two devices as being owned by the same user, or add a capability statement that makes it possible to add specific capabilities in addition to those specified by a role.

### Project creator
As the root of the tree of relationships between devices, the public key of the `AuthStore` keyPair of the project creator is also the public key of the project. A project creator can't be removed from a project, however a group of coordinators could decide to fork a project with a new project creator and retain the data from the existing project.

### Capability data models
Each type of capability is a `DataType`, each with its own schema, validation, and indexing. The data types are stored in a `DataStore` instance internal to the `AuthStore` class.

See the available data schemas in [authtypes.js](authtypes.js).

### Syncing data
When syncing a project the `AuthStore` hypercores are synced first. Sync then continues with other data after the device has been authorized by verifying its role & capabilities.

## Usage

TODO!

## API docs

TODO!

## Tests

Tests for this module are in [tests/authstore.js](../../tests/authstore.js)
