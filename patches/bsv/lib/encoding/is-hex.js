const HEX_REGEX = /^(?:[a-fA-F0-9][a-fA-F0-9])*$/

function isHex (s) {
  return HEX_REGEX.test(s)
}

module.exports = isHex
