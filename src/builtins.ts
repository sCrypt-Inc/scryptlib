import { bsv, Bytes, Int, Ripemd160 } from '.';

/** 
 * bigint can be converted to string with pack
 * @category Bytes Operations
 */
export function pack(n: bigint): Bytes {
  const num = new bsv.crypto.BN(n);
  return num.toSM({ endian: 'little' }).toString('hex');
}

/**
* ByteString can be converted to bigint using function unpack.
* @category Bytes Operations
*/
export function unpack(a: Bytes): bigint {
  return BigInt(bin2num(a));
}



// Converts a number into a sign-magnitude representation of certain size as a string
// Throws if the number cannot be accommodated
// Often used to append numbers to OP_RETURN, which are read in contracts
// Support Bigint
export function num2bin(n: bigint, dataLen: number): string {
  const num = new bsv.crypto.BN(n);
  if (num.eqn(0)) {
    return '00'.repeat(dataLen);
  }
  const s = num.toSM({ endian: 'little' }).toString('hex');

  const byteLen_ = s.length / 2;
  if (byteLen_ > dataLen) {
    throw new Error(`${n} cannot fit in ${dataLen} byte[s]`);
  }
  if (byteLen_ === dataLen) {
    return s;
  }

  const paddingLen = dataLen - byteLen_;
  const lastByte = s.substring(s.length - 2);
  const rest = s.substring(0, s.length - 2);
  let m = parseInt(lastByte, 16);
  if (num.isNeg()) {
    // reset sign bit
    m &= 0x7F;
  }
  let mHex = m.toString(16);
  if (mHex.length < 2) {
    mHex = '0' + mHex;
  }

  const padding = n > 0 ? '00'.repeat(paddingLen) : '00'.repeat(paddingLen - 1) + '80';
  return rest + mHex + padding;
}

//Support Bigint
export function bin2num(hex: string): bigint {
  const lastByte = hex.substring(hex.length - 2);
  const rest = hex.substring(0, hex.length - 2);
  const m = parseInt(lastByte, 16);
  const n = m & 0x7F;
  let nHex = n.toString(16);
  if (nHex.length < 2) {
    nHex = '0' + nHex;
  }
  //Support negative number
  let bn = bsv.crypto.BN.fromHex(rest + nHex, { endian: 'little' });
  if (m >> 7) {
    bn = bn.neg();
  }
  return BigInt(bn.toString());
}


export function and(a: Int, b: Int): Int {
  const size1 = pack(a).length / 2;
  const size2 = pack(b).length / 2;
  const maxSize = Math.max(size1, size2);

  const ba = Buffer.from(num2bin(a, maxSize), 'hex');
  const bb = Buffer.from(num2bin(b, maxSize), 'hex');

  for (let i = 0; i < ba.length; i++) {
    ba[i] &= bb[i];
  }

  return bin2num(ba.toString('hex'));

}

export function or(a: Int, b: Int): Int {
  const size1 = pack(a).length / 2;
  const size2 = pack(b).length / 2;
  const maxSize = Math.max(size1, size2);

  const ba = Buffer.from(num2bin(a, maxSize), 'hex');
  const bb = Buffer.from(num2bin(b, maxSize), 'hex');

  for (let i = 0; i < ba.length; i++) {
    ba[i] |= bb[i];
  }

  return bin2num(ba.toString('hex'));

}

export function xor(a: Int, b: Int): Int {
  const size1 = pack(a).length / 2;
  const size2 = pack(b).length / 2;
  const maxSize = Math.max(size1, size2);

  const ba = Buffer.from(num2bin(a, maxSize), 'hex');
  const bb = Buffer.from(num2bin(b, maxSize), 'hex');

  for (let i = 0; i < ba.length; i++) {
    ba[i] ^= bb[i];
  }

  return bin2num(ba.toString('hex'));

}

export function invert(a: Int): Int {
  if (a === Int(0)) {
    return a;
  }
  const size = pack(a).length / 2;

  const buffer = Buffer.from(num2bin(a, size), 'hex');

  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = ~buffer[i];
  }

  return bin2num(buffer.toString('hex'));

}



// Equivalent to the built-in function `len` in scrypt
export function len(hexstr: string): bigint {
  return BigInt(hexstr.length / 2);
}

// convert signed integer `n` to unsigned integer of `l` bytes, in little endian
export function toLEUnsigned(n: bigint, l: number): string {
  // one extra byte to accommodate possible negative sign byte
  const m = num2bin(n, l + 1);
  // remove sign byte
  return m.slice(0, Number(len(m) - Int(1)));
}

// convert 'b' to a VarInt field, including the preceding length
export function writeVarint(b: string): string {
  const n = len(b);

  let header = '';

  if (n < 0xfd) {
    header = toLEUnsigned(n, 1);
  }
  else if (n < 0x10000) {
    header = 'fd' + toLEUnsigned(n, 2);
  }
  else if (n < 0x100000000) {
    header = 'fe' + toLEUnsigned(n, 4);
  }
  else if (n < 0x10000000000000000) {
    header = 'ff' + toLEUnsigned(n, 8);
  }

  return header + b;
}


export function buildOpreturnScript(data: string): bsv.Script {
  return bsv.Script.fromASM(['OP_FALSE', 'OP_RETURN', data].join(' '));
}


export function buildPublicKeyHashScript(pubKeyHash: Ripemd160): bsv.Script {
  return bsv.Script.fromASM(['OP_DUP', 'OP_HASH160', pubKeyHash, 'OP_EQUALVERIFY', 'OP_CHECKSIG'].join(' '));
}





// Equivalent to the built-in function `hash160` in scrypt
export function hash160(hexstr: string, encoding?: BufferEncoding): string {
  return bsv.crypto.Hash.sha256ripemd160(Buffer.from(hexstr, encoding || 'hex')).toString('hex');
}

// Equivalent to the built-in function `sha256` in scrypt
export function sha256(hexstr: string, encoding?: BufferEncoding): string {
  return bsv.crypto.Hash.sha256(Buffer.from(hexstr, encoding || 'hex')).toString('hex');
}


// Equivalent to the built-in function `hash256` in scrypt
export function hash256(hexstr: string, encoding?: BufferEncoding): string {
  return sha256(sha256(hexstr, encoding), encoding);
}