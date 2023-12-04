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
const blobId = await project.$blobs.create({
    { original: '/path/to/my/original-blob.png' },
    { mimeType: 'image/png' }
})
```

The returned `blobId` contains the necessary information we need in order to construct the HTTP URL that can be used to access the asset from the media server:

```js
const blobUrl = await project.$blobs.getUrl({
  driveId: blob.driveId, // discovery id for hyperdrive instance containing the blob
  type: blob.type, // media type ('photo' in this case)
  variant: blob.variant, // asset variant ('original' in this case)
  name: blob.name, // random 8 byte hex string
})

// Alternatively, can do this instead since the blobId conveniently matches the expected parameter type:
// const blobUrl = await project.$blobs.getUrl(blobId)
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

---

## Working with icons

_TODO_
