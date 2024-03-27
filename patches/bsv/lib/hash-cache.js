/**
 * Hash Cache
 * ==========
 *
 * For use in sighash.
 */
'use strict'

class HashCache {
  constructor (prevoutsHashBuf, sequenceHashBuf, outputsHashBuf) {
    this.prevoutsHashBuf = prevoutsHashBuf
    this.sequenceHashBuf = sequenceHashBuf
    this.outputsHashBuf = outputsHashBuf
  }

  static fromBuffer (buf) {
    return HashCache.fromJSON(JSON.parse(buf.toString()))
  }

  toBuffer () {
    return Buffer.from(JSON.stringify(this.toJSON()))
  }

  static fromJSON (json) {
    return new HashCache(
      json.prevoutsHashBuf ? Buffer.from(json.prevoutsHashBuf, 'hex') : undefined,
      json.sequenceHashBuf ? Buffer.from(json.sequenceHashBuf, 'hex') : undefined,
      json.outputsHashBuf ? Buffer.from(json.outputsHashBuf, 'hex') : undefined
    )
  }

  toJSON () {
    return {
      prevoutsHashBuf: this.prevoutsHashBuf ? this.prevoutsHashBuf.toString('hex') : undefined,
      sequenceHashBuf: this.sequenceHashBuf ? this.sequenceHashBuf.toString('hex') : undefined,
      outputsHashBuf: this.outputsHashBuf ? this.outputsHashBuf.toString('hex') : undefined
    }
  }

  toHex () {
    return this.toBuffer().toString('hex')
  }

  static fromHex (hex) {
    const buf = Buffer.from(hex, 'hex')
    return HashCache.fromBuffer(buf)
  }
}

module.exports = HashCache
