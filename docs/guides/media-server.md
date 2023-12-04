# Mapeo's Media Server

Each Mapeo manager instance includes an embedded HTTP server that is responsible for serving media assets over HTTP. Each server is responsible for handling requests for assets that can live in any Mapeo project (the URL structure reflects this, as we will show later on).

## Working with blobs

Blobs represent any binary objects. In the case of Mapeo, that will most likely be media assets such as photos, videos, and audio files. Mapeo provides a project-scoped API that is used for creating and retrieving blobs. Combined with the media server, applications can access them using HTTP requests.

Some boilerplate for getting started with a Mapeo project:

```js
// Create the manager instance (truncated for brevity)
const manager = new MapeoManager({...})

// Start the media server (no need to await in most cases, unless you need to immediately access the HTTP endpoints)
manager.startMediaServer()

// Create a project
const projectPublicId = await manager.createProject()

// Get the project instance
const project = await manager.getProject(projectPublicId)
```

In the case of an observation record, there can be any number references to "attachments" (in most cases, an image). In order to create these attachments, we need to work with a project's blob API, which can be accessed using `project.$blobs`.

The snippet below shows how to create a blob that represents a PNG image that is located at a specific path on our device. The `mimeType` represents the asset's MIME type using the format specified by the Internet Assigned Numbers Authority (IANA) (see full list at https://www.iana.org/assignments/media-types/media-types.xhtml).

```js
// Create the media asset blob
const blobId = await project.$blobs.create({
    { original: '/path/to/my/original-blob.png' },
    { mimeType: 'image/png' }
})

// Create an observation record and add the blob as an attachment to it
const observation = await project.observation.create({
    schemaName: 'observation',
    attachments: [
      {
        driveDiscoveryId: blobId.driveId, // discovery id for hyperdrive instance containing the blob
        type: blobId.type, // media type ('photo' in this case)
        name: blobId.name, // random 8 byte hex string
        hash: blobId.hash, // content hash
      }
    ],
    tags: {},
    refs: [],
    metadata: {},
})
```

The attachment provides the information that is needed to create a HTTP URL that can be used to access the asset from the media server:

```js
// If you don't already have the observation record, you may need to get the relevant observation by doing the following
// const observation = await project.observation.getByDocId(...)

// Get the attachment that represents the blob
const attachment = observation.attachments[0]

// Get the URL pointing to the blob's original variant
const blobUrl = await project.$blobs.getUrl({
  driveId: attachment.driveDiscoveryId,
  type: attachment.type,
  name: attachment.name,
  variant: 'original',
})
```

The `blobUrl` is a string with the following structure:

```
http://{HOST_NAME}:{PORT}/blobs/{PROJECT_PUBLIC_ID}/{DRIVE_DISCOVERY_ID}/{TYPE}/{VARIANT}/{NAME}
```

Explanation of the different parts of this URL:

- `HOST_NAME`: Hostname of the server. Defaults to `127.0.0.1` (localhost)
- `PORT`: Port that's being listened on. A random available port is used when the media server is started.
- `PROJECT_PUBLIC_ID`: The public ID used to identify the project of interest.
- `DRIVE_DISCOVERY_ID`: The discovery ID of the Hyperdrive instance where the blob of interest is located.
- `TYPE`: The asset type. Can be `'photo'`, `'video'`, or `'audio'`.
- `VARIANT`: The desired asset variant. Can be `'original'`, `'preview'`, or `'thumbnail'`.

You can then use this URL with anything that uses HTTP to fetch media. Some examples:

- HTML `img` tag

  ```js
  const imageElement = document.querySelector('img')
  imageElement.setAttribute('src', blobUrl)
  ```

- React Native `Image` component

  ```js
  <Image source="{blobUrl}" />
  ```

## Working with icons

Icons are primarily used in the context of project presets, where they are displayed as visual representations of a particular category when recording observations. Mapeo provides a project-scoped API for creating and retrieving icons. Combined with the media server, applications can access them using HTTP requests.

Some boilerplate for getting started with a Mapeo project:

```js
// Create the manager instance (truncated for brevity)
const manager = new MapeoManager({...})

// Start the media server (no need to await in most cases, unless you need to immediately access the HTTP endpoints)
manager.startMediaServer()

// Create a project
const projectPublicId = await manager.createProject()

// Get the project instance
const project = await manager.getProject(projectPublicId)
```

In order to create an icon we need to work with a project's icon API, which can be accessed using `project.$icons`:

```js
// Read the icon asset(s) first
const pngBlob = await fs.readFile('/path/to/my/icon/plant.png')
const svgBlob = await fs.readFile('/path/to/my/icon/plant.svg')

// Then create an icon (this one has multiple variants in this case)
// Note that pixelDensity does not matter for SVG
const iconId = await project.$icons.create({
  name: 'plant',
  variants: [
    {
      size: 'small',
      pixelDensity: 1,
      mimeType: 'image/png',
      blob: pngBlob,
    },
    {
      size: 'small',
      mimeType: 'image/svg+xml',
      blob: svgBlob,
    },
  ],
})
```

Each icon can have multiple variants which can be used accorrding to the application's context. In the example above, we created an icon that has two variants: a small PNG and a small SVG. Currently, the Icons API only supports creating icon recorsd based on PNG and SVG assets.

The returned `iconId` can be used to get the URL that points to the desired icon and its variant:

```js
const pngIconUrl = await project.$icons.getIconUrl(iconId, {
  mimeType: 'image/png',
  size: 'small',
  pixelDensity: 1,
})

// Note that pixelDensity does not matter for SVG
const svgIconUrl = await project.$icons.getIconUrl(iconId, {
  mimeType: 'image/svg+xml',
  size: 'small',
})
```

The `blobUrl` is a string with the following structure:

```
http://{HOST_NAME}:{PORT}/icons/{PROJECT_PUBLIC_ID}/{ICON_ID}/{SIZE}{PIXEL_DENSITY}.${EXTENSION}
```

Explanation of the different parts of this URL:

- `HOST_NAME`: Hostname of the server. Defaults to `127.0.0.1` (localhost)
- `PORT`: Port that's being listened on. A random available port is used when the media server is started.
- `PROJECT_PUBLIC_ID`: The public ID used to identify the project of interest.
- `ICON_ID`: The ID of the icon record associated with the asset.
- `SIZE`: The denoted size of the asset. Can be `'small'`, `'medium'`, or `'large'`.
- `PIXEL_DENSITY`: The denoted pixel density of the assets. If included, this is formatted as `@_x` where the `_` is a positive integer (usually `1`, `2`, or `3`). Note that this may be omitted from the url, in which case the pixel density is assumed to be `1` for applicable assets (e.g. bitmaps like PNG or JPG).
- `EXTENSION`: The file extension associated with the `mimeType` option. For PNG it is `png` and for SVG it is `svg`.

You can then use this URL with anything that uses HTTP to fetch media. Some examples:

- HTML `img` tag

  ```js
  const imageElement = document.querySelector('img')
  imageElement.setAttribute('src', pngIconUrl)
  imageElement.setAttribute('src', svgIconUrl)
  ```

- React Native `Image` component

  ```js
  <Image source="{pngIconUrl}" />
  <Image source="{svgIconUrl}" />
  ```
