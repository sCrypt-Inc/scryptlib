'use strict'

var assert = require('assert')

var BufferWriter = function BufferWriter(obj) {
  if (!(this instanceof BufferWriter)) { return new BufferWriter(obj) }
  this.bufLen = 0
  if (obj) { this.set(obj) } else { this.buf = Buffer.alloc(2) }
}

BufferWriter.prototype.set = function (obj) {
  this.buf = obj.buf || this.buf || Buffer.alloc(2)
  this.bufLen = obj.bufLen || this.buf.length
  return this
}

BufferWriter.prototype.toBuffer = function () {
  return this.buf.slice(0, this.bufLen)
}

BufferWriter.prototype.concat = function () {
  return this.toBuffer()
}

BufferWriter.prototype.capacity = function () {
  return this.buf.length
}

BufferWriter.prototype.write = function (buf) {
  assert(Buffer.isBuffer(buf))

  const expectedCapacity = this.bufLen + buf.length
  if (expectedCapacity >= this.capacity()) {
    var tmp = Buffer.alloc(expectedCapacity * 2);
    this.buf.copy(tmp)
    this.buf = tmp
  }

  buf.copy(this.buf, this.bufLen)
  this.bufLen += buf.length
  return this
}

BufferWriter.prototype.writeReverse = function (buf) {
  assert(Buffer.isBuffer(buf))

  const expectedCapacity = this.bufLen + buf.length
  if (expectedCapacity >= this.capacity()) {
    var tmp = Buffer.alloc(expectedCapacity * 2);
    this.buf.copy(tmp)
    this.buf = tmp
  }

  Buffer.from(buf).reverse().copy(this.buf, this.bufLen)
  this.bufLen += buf.length
  return this

}

BufferWriter.prototype.writeUInt8 = function (n) {
  var buf = Buffer.alloc(1)
  buf.writeUInt8(n, 0)
  this.write(buf)
  return this
}

BufferWriter.prototype.writeUInt16BE = function (n) {
  var buf = Buffer.alloc(2)
  buf.writeUInt16BE(n, 0)
  this.write(buf)
  return this
}

BufferWriter.prototype.writeUInt16LE = function (n) {
  var buf = Buffer.alloc(2)
  buf.writeUInt16LE(n, 0)
  this.write(buf)
  return this
}

BufferWriter.prototype.writeUInt32BE = function (n) {
  var buf = Buffer.alloc(4)
  buf.writeUInt32BE(n, 0)
  this.write(buf)
  return this
}

BufferWriter.prototype.writeInt32LE = function (n) {
  var buf = Buffer.alloc(4)
  buf.writeInt32LE(n, 0)
  this.write(buf)
  return this
}

BufferWriter.prototype.writeUInt32LE = function (n) {
  var buf = Buffer.alloc(4)
  buf.writeUInt32LE(n, 0)
  this.write(buf)
  return this
}

BufferWriter.prototype.writeUInt64BEBN = function (bn) {
  var buf = bn.toBuffer({ size: 8 })
  this.write(buf)
  return this
}

BufferWriter.prototype.writeUInt64LEBN = function (bn) {
  var buf = bn.toBuffer({ size: 8 })
  this.writeReverse(buf)
  return this
}

BufferWriter.prototype.writeVarintNum = function (n) {
  var buf = BufferWriter.varintBufNum(n)
  this.write(buf)
  return this
}

BufferWriter.prototype.writeVarintBN = function (bn) {
  var buf = BufferWriter.varintBufBN(bn)
  this.write(buf)
  return this
}

BufferWriter.varintBufNum = function (n) {
  var buf
  if (n < 253) {
    buf = Buffer.alloc(1)
    buf.writeUInt8(n, 0)
  } else if (n < 0x10000) {
    buf = Buffer.alloc(1 + 2)
    buf.writeUInt8(253, 0)
    buf.writeUInt16LE(n, 1)
  } else if (n < 0x100000000) {
    buf = Buffer.alloc(1 + 4)
    buf.writeUInt8(254, 0)
    buf.writeUInt32LE(n, 1)
  } else {
    buf = Buffer.alloc(1 + 8)
    buf.writeUInt8(255, 0)
    buf.writeInt32LE(n & -1, 1)
    buf.writeUInt32LE(Math.floor(n / 0x100000000), 5)
  }
  return buf
}

BufferWriter.varintBufBN = function (bn) {
  var buf
  var n = bn.toNumber()
  if (n < 253) {
    buf = Buffer.alloc(1)
    buf.writeUInt8(n, 0)
  } else if (n < 0x10000) {
    buf = Buffer.alloc(1 + 2)
    buf.writeUInt8(253, 0)
    buf.writeUInt16LE(n, 1)
  } else if (n < 0x100000000) {
    buf = Buffer.alloc(1 + 4)
    buf.writeUInt8(254, 0)
    buf.writeUInt32LE(n, 1)
  } else {
    var bw = new BufferWriter()
    bw.writeUInt8(255)
    bw.writeUInt64LEBN(bn)
    buf = bw.toBuffer()
  }
  return buf
}

module.exports = BufferWriter
