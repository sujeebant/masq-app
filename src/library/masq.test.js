import Masq from './masq'

const signalserver = require('signalhubws/server')
const signalhub = require('signalhubws')
const swarm = require('webrtc-swarm')
const wrtc = require('wrtc')
window.crypto = require('@trust/webcrypto')
const common = require('masq-common')
const PORT = '8082'
const HUB_URL = `localhost:${PORT}`

const { encrypt, decrypt, exportKey, genAESKey } = common.crypto
// const { exportKey, genAESKey } = common.crypto
jest.mock('masq-common', () => {
  const original = require.requireActual('masq-common')
  let dbList = {}
  let originalCreate = original.utils.createPromisifiedHyperDB
  let modified = { ...original }
  modified.utils.dbExists = (name) => {
    return Promise.resolve(!!dbList[name])
  }
  modified.utils.createPromisifiedHyperDB = (name, hexKey) => {
    if (!dbList[name]) {
      dbList[name] = originalCreate(name, hexKey)
    }
    return dbList[name]
  }
  modified.utils.resetDbList = () => {
    dbList = {}
  }
  modified.crypto.derivePassphrase = async (passphrase) => {
    const hashedPassphrase = {
      salt: '81570bf99c0134985d7d975b69e123ce',
      iterations: 100000,
      hashAlgo: 'SHA-256',
      storedHash: Buffer.from(passphrase).toString('hex')
    }
    return Promise.resolve(hashedPassphrase)
  }
  modified.crypto.checkPassphrase = async (passphrase, hashedPassphrase) => {
    const res = Buffer.from(passphrase).toString('hex') === hashedPassphrase.storedHash
    return Promise.resolve(res)
  }
  return modified
})

// use an in memory random-access-storage instead
jest.mock('random-access-idb', () =>
  () => require('random-access-memory'))

let masq = new Masq()
let server = null

beforeAll((done) => {
  server = signalserver()
  server.listen(PORT, (err) => {
    if (err) console.log(err)
    done()
  })
})

afterAll((done) => {
  server.close()
  masq.closeProfile()
  setTimeout(done, 1000) // Wait to be sure server.close has finished
})

describe('Masq-app Masq-app protocol', async () => {
  let cryptoKey
  let key
  let keyBase64

  beforeAll(async () => {
    cryptoKey = await genAESKey(true, 'AES-GCM', 128)
    key = await exportKey(cryptoKey)
    keyBase64 = Buffer.from(key).toString('base64')
  })

  test('handleSyncProfile should connect to the swarm', async (done) => {
    expect.assertions(1)

    const hub = signalhub('channel', HUB_URL)
    const sw = swarm(hub, { wrtc })
    sw.on('close', done)

    sw.on('peer', () => {
      expect(true).toBe(true)
      sw.close()
    })
    masq.handleSyncProfile('channel', keyBase64, false)
  })

  test('should receive public key and get write access, initator set as false', done => {
    expect.assertions(3)
    const hub = signalhub('channel', HUB_URL)
    const sw = swarm(hub, { wrtc })

    sw.on('close', done)

    sw.on('peer', async (peer) => {
      const message = {
        msg: 'masqAppSyncProfile'
      }
      const encryptedMsg = await encrypt(cryptoKey, message, 'base64')
      peer.send(JSON.stringify(encryptedMsg))

      peer.once('data', async (data) => {
        const { msg, key } = await decrypt(cryptoKey, JSON.parse(data), 'base64')
        expect(msg).toBe('masqAppAccessGranted')
        expect(key).toBeDefined()

        const message = {
          msg: 'masqAppRequestWriteAccess',
          key: '1982524189cae29354879cfe2d219628a8a057f2569a0f2ccf11253cf2b55f3b'
        }
        const encryptedMsg = await encrypt(cryptoKey, message, 'base64')
        peer.send(JSON.stringify(encryptedMsg))

        peer.once('data', async (data) => {
          const { msg } = await decrypt(cryptoKey, JSON.parse(data), 'base64')
          expect(msg).toBe('masqAppWriteAccessGranted')
          sw.close()
        })
      })
    })

    masq.handleSyncProfile('channel', keyBase64, false)
  })

  test('should receive public key and get write access, initator set as true', done => {
    expect.assertions(2)
    const hub = signalhub('channel2', HUB_URL)
    const sw = swarm(hub, { wrtc })

    sw.on('close', done)

    sw.on('peer', async (peer) => {
      peer.once('data', async (data) => {
        console.log('here')

        const { msg, key } = await decrypt(cryptoKey, JSON.parse(data), 'base64')
        expect(msg).toBe('masqAppAccessGranted')
        expect(key).toBeDefined()
        sw.close()
      })
    })

    masq.handleSyncProfile('channel2', keyBase64, true)
  })

  // test('should receive public key and get write access, initator set as true', done => {
  //   expect.assertions(3)
  //   const hub = signalhub('channel', HUB_URL)
  //   const sw = swarm(hub, { wrtc })

  //   sw.on('close', done)

  //   sw.on('peer', async (peer) => {
  //     peer.once('data', async (data) => {
  //       console.log('here')

  //       const { msg, key } = await decrypt(cryptoKey, JSON.parse(data), 'base64')
  //       expect(msg).toBe('masqAppAccessGranted')
  //       expect(key).toBeDefined()

  //       const message = {
  //         msg: 'masqAppRequestWriteAccess',
  //         key: '1982524189cae29354879cfe2d219628a8a057f2569a0f2ccf11253cf2b55f3b'
  //       }
  //       const encryptedMsg = await encrypt(cryptoKey, message, 'base64')
  //       peer.send(JSON.stringify(encryptedMsg))

  //       peer.once('data', async (data) => {
  //         const { msg } = await decrypt(cryptoKey, JSON.parse(data), 'base64')
  //         expect(msg).toBe('masqAppWriteAccessGranted')
  //         sw.close()
  //       })
  //     })
  //   })

  //   masq.handleSyncProfile('channel', keyBase64, true)
  // })

  // test('should send authorized and close connection', done => {
  //   expect.assertions(2)
  //   const hub = signalhub('channel', 'HUB_URL')
  //   const sw = swarm(hub, { wrtc })

  //   sw.on('close', done)
  //   sw.on('disconnect', () => {
  //     sw.close()
  //   })

  //   sw.on('peer', peer => {
  //     peer.on('data', async (data) => {
  //       const { msg, userAppDbId } = await decrypt(cryptoKey, JSON.parse(data), 'base64')
  //       expect(msg).toBe('authorized')
  //       expect(userAppDbId).toBeDefined()

  //       // sw.close()
  //       const message = {
  //         msg: 'connectionEstablished'
  //       }
  //       const encryptedMsg = await encrypt(cryptoKey, message, 'base64')
  //       peer.send(JSON.stringify(encryptedMsg))
  //       sw.close()
  //     })
  //   })

  //   masq.handleUserAppLogin('channel', keyBase64, 'someAppId')
  // })
})
