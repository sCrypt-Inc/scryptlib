function decodeScriptChunks (script) {
  const chunks = []
  let i = 0
  let len = 0
  while (i < script.length) {
    const opcodenum = script[i]
    i += 1
    if (opcodenum === 0) {
      len = opcodenum
      chunks.push({ opcodenum: opcodenum, len })
    } else if (opcodenum < 76) { // OP_PUSHDATA1
      len = opcodenum
      chunks.push({ opcodenum: opcodenum, buf: script.slice(i, i + opcodenum), len })
      i += opcodenum
    } else if (opcodenum === 76) { // OP_PUSHDATA1
      len = script[i]
      i += 1
      chunks.push({ opcodenum: opcodenum, buf: script.slice(i, i + len), len })
      i += len
    } else if (opcodenum === 77) { // OP_PUSHDATA2
      len = script[i] | script[i + 1] << 8
      i += 2
      chunks.push({ opcodenum: opcodenum, buf: script.slice(i, i + len), len })
      i += len
    } else if (opcodenum === 78) { // OP_PUSHDATA4
      len = script[i] + script[i + 1] * 0x0100 + script[i + 2] * 0x010000 + script[i + 3] * 0x01000000
      i += 4
      chunks.push({ opcodenum: opcodenum, buf: script.slice(i, i + len), len })
      i += len
    } else {
      chunks.push({ opcodenum: opcodenum })
    }
  }
  // if (i !== script.length) throw new Error('bad script')
  return chunks
}

module.exports = decodeScriptChunks
