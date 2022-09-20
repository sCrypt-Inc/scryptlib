'use strict'

var assert = require('assert')

const writeU8LE = require('../script/write-u8-le')
const writeU16LE = require('../script/write-u16-le')
const writeU32LE = require('../script/write-u32-le')
const writeU64LE = require('../script/write-u64-le')
const writeVarint = require('../script/write-varint')


class BufferWriter {
  constructor() {
    this.buffers = []
    this.length = 0
  }

  write(buffer) {
    this.buffers.push(buffer)
    this.length += buffer.length
    return this
  }

  toBuffer() {
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

  writeReverse(buf) {
    assert(Buffer.isBuffer(buf))
    this.write(Buffer.from(buf).reverse())
    return this
  }

  writeUInt16LE(n) {
    writeU16LE(this, n)
    return this
  }

  writeUInt32LE(n) {
    writeU32LE(this, n)
    return this
  }

  writeUInt8(n) {
    writeU8LE(this, n)
    return this
  }

  writeUInt64LEBN(n) {
    writeU64LE(this, n)
    return this
  }

  writeVarintNum(n) {
    writeVarint(this, n)
    return this
  }
}

module.exports = BufferWriter
