function writeU16LE (writer, n) {
  if (n > 0xffff) throw new Error('number too large')

  const buffer = new Uint8Array(2)
  buffer[0] = n % 256
  n = n >> 8
  buffer[1] = n % 256

  return writer.write(buffer)
}

module.exports = writeU16LE
