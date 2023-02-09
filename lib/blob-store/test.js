import Hyperdrive from 'hyperdrive'
import Corestore from 'corestore'

const corestore = new Corestore('storage')

const drive = new Hyperdrive(corestore, /* optionalKey */)

const ws = drive.createWriteStream('/blob.txt')

ws.write('Hello, ')
ws.write('world!')
ws.end()

ws.on('close', function () {
  const rs = drive.createReadStream('/blob.txt')
  rs.pipe(process.stdout) // prints Hello, world!
})
