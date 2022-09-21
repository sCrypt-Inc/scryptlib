/* global VARIANT */

const isHex = require('./is-hex')

// Prefer our implementation of decodeHex over Buffer when we don't know the VARIANT
// to avoid accidentally importing the Buffer shim in the browser.

function decodeHex (hex) {
  if (typeof hex !== 'string') throw new Error('not a string')

  if (hex.startsWith('0x')) hex = hex.slice(2)

  if (hex.length % 2 === 1) hex = '0' + hex

  if (!isHex(hex)) throw new Error('invalid hex string in script')

  if (typeof VARIANT === 'undefined' || VARIANT === 'browser') {
    const length = hex.length / 2
    const arr = new Uint8Array(length)
    const isNaN = x => x !== x // eslint-disable-line no-self-compare
    for (let i = 0; i < length; ++i) {
      const byte = parseInt(hex.substr(i * 2, 2), 16)
      if (isNaN(byte)) throw new Error('bad hex char')
      arr[i] = byte
    }
    return arr
  } else {
    return Buffer.from(hex, 'hex')
  }
}

module.exports = decodeHex
