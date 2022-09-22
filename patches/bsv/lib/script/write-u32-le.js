function writeU32LE (writer, n) {
  if (n > 0xffffffff) throw new Error('number too large')

  const buffer = new Uint8Array(4)
  buffer[0] = n % 256
  n = Math.floor(n / 256)
  buffer[1] = n % 256
  n = n >> 8
  buffer[2] = n % 256
  n = n >> 8
  buffer[3] = n

  return writer.write(buffer)
}

module.exports = writeU32LE
