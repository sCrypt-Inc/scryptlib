'use strict'

var assert = require('assert')

const writeU8LE = require('../script/write-u8-le')
const writeU16LE = require('../script/write-u16-le')
const writeU32LE = require('../script/write-u32-le')
const writeI32LE = require('../script/write-i32-le')
const writeVarint = require('../script/write-varint')

class BufferWriter {
  constructor (obj) {
    if (obj) { this.set(obj) } else {
      this.buffers = []
      this.length = 0
    }
  }

  write (buffer) {
    this.buffers.push(buffer)
    this.length += buffer.length
    return this
  }

  set (obj) {
    this.buffers = obj.buffers || obj.bufs || this.buffers || []
    this.length = this.buffers.reduce(function (prev, buf) { return prev + buf.length }, 0)
    return this
  }

  concat () {
    return this.toBuffer()
  }

  toBuffer () {
    if (this.buffers.length === 1) {
      return Buffer.from(this.buffers[0])
    }

    const whole = new Uint8Array(this.length)

    let offset = 0
    this.buffers.forEach(part => {
      whole.set(part, offset)
      offset += part.length
    })

    return Buffer.from(whole)
  }

  writeReverse (buf) {
    assert(Buffer.isBuffer(buf))
    this.write(Buffer.from(buf).reverse())
    return this
  }

  writeUInt16LE (n) {
    writeU16LE(this, n)
    return this
  }

  writeUInt16BE (n) {
    var bw = new BufferWriter()
    bw.writeUInt16LE(n)
    this.writeReverse(bw.toBuffer())
    return this
  }

  writeUInt32LE (n) {
    writeU32LE(this, n)
    return this
  }

  writeUInt32BE (n) {
    var bw = new BufferWriter()
    bw.writeUInt32LE(n)
    this.writeReverse(bw.toBuffer())
    return this
  }

  writeUInt8 (n) {
    writeU8LE(this, n)
    return this
  }

  writeUInt64LEBN (bn) {
    var buf = bn.toBuffer({ size: 8 })
    this.writeReverse(buf)
    return this
  }

  writeUInt64BEBN (bn) {
    var bw = new BufferWriter()
    bw.writeUInt64LEBN(bn)
    this.writeReverse(bw.toBuffer())
    return this
  }

  writeVarintNum (n) {
    writeVarint(this, n)
    return this
  }

  writeInt32LE (n) {
    writeI32LE(this, n)
    return this
  }

  static varintBufNum (n) {
    var bw = new BufferWriter()
    bw.writeVarintNum(n)
    return bw.toBuffer()
  }

  writeVarintBN (bn) {
    var n = bn.toNumber()
    if (n < 253) {
      writeU8LE(this, n)
    } else if (n < 0x10000) {
      writeU8LE(this, 253)
      writeU16LE(this, n)
    } else if (n < 0x100000000) {
      writeU8LE(this, 254)
      writeU32LE(this, n)
    } else {
      var bw = new BufferWriter()
      bw.writeUInt8(255)
      bw.writeUInt64LEBN(bn)
      var buf = bw.toBuffer()
      this.write(buf)
    }
    return this
  }
}

module.exports = BufferWriter
