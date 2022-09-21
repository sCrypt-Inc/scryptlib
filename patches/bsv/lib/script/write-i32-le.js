function writeI32LE (writer, n) {
  if (n < -2147483648 || n > 2147483647) throw new Error('Out of range. It must be >= -2147483648 and <= 2147483647.')

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

module.exports = writeI32LE
