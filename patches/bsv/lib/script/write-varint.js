function writeVarint (writer, n) {
  if (n > Number.MAX_SAFE_INTEGER) throw new Error('varint too large')

  if (n <= 0xfc) {
    return writer.write([n])
  }

  if (n <= 0xffff) {
    return writer.write([0xfd, n % 256, Math.floor(n / 256)])
  }

  if (n <= 0xffffffff) {
    const buffer = new Uint8Array(5)
    buffer[0] = 0xfe
    buffer[1] = n % 256
    n = Math.floor(n / 256)
    buffer[2] = n % 256
    n = Math.floor(n / 256)
    buffer[3] = n % 256
    n = Math.floor(n / 256)
    buffer[4] = n
    return writer.write(buffer)
  }

  // n <= 0xffffffffffffffff
  const buffer = new Uint8Array(9)
  buffer[0] = 0xff
  buffer[1] = n % 256
  n = Math.floor(n / 256)
  buffer[2] = n % 256
  n = Math.floor(n / 256)
  buffer[3] = n % 256
  n = Math.floor(n / 256)
  buffer[4] = n % 256
  n = Math.floor(n / 256)
  buffer[5] = n % 256
  n = Math.floor(n / 256)
  buffer[6] = n % 256
  n = Math.floor(n / 256)
  buffer[7] = n % 256
  n = Math.floor(n / 256)
  buffer[8] = n
  return writer.write(buffer)
}

module.exports = writeVarint
