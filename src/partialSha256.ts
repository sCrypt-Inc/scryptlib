const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

/**
 * 
 * @param message origin message to sha256
 * @param index The partial hash returned is the hash of 0~index chunks, 512 bits per chunk.
 * @returns [partialHash, partialPreimage, padding]
 */
export function partialSha256(message: Buffer, index: number) {

  const bytesHashed = message.length;
  const padLength = (bytesHashed % 64 < 56) ? 64 - (bytesHashed % 64) : 128 - (bytesHashed % 64);

  const suffix = Buffer.alloc(padLength);
  const padded = Buffer.concat([message, suffix]);


  const bitLenHi = (bytesHashed / 0x20000000) | 0;
  const bitLenLo = bytesHashed << 3;


  padded[bytesHashed] = 0x80;
  for (let i = bytesHashed + 1; i < padded.length - 8; i++) {
    padded[i] = 0;
  }
  padded[padded.length - 8] = (bitLenHi >>> 24) & 0xff;
  padded[padded.length - 7] = (bitLenHi >>> 16) & 0xff;
  padded[padded.length - 6] = (bitLenHi >>> 8) & 0xff;
  padded[padded.length - 5] = (bitLenHi >>> 0) & 0xff;
  padded[padded.length - 4] = (bitLenLo >>> 24) & 0xff;
  padded[padded.length - 3] = (bitLenLo >>> 16) & 0xff;
  padded[padded.length - 2] = (bitLenLo >>> 8) & 0xff;
  padded[padded.length - 1] = (bitLenLo >>> 0) & 0xff;

  const broken: Buffer[] = [];

  for (let i = 0; i < padded.length / 64; i++) {
    broken.push(padded.slice(i * 64, i * 64 + 64));
  }


  const h0 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];


  let hi = h0;

  for (let i = 0; i < broken.length; i++) {
    const chunk = broken[i];
    hi = g(hi, chunk);
    if (bytesHashed > 64 && i == index) {
      break;
    }
  }

  const partialHash = toHash(hi);

  if (index > -1 && bytesHashed > 64) {
    const partialPreimage = message.slice((index + 1) * 64);
    const padding = padded.slice(message.length);
    return [partialHash, partialPreimage.toString('hex'), padding.toString('hex')];
  }
  return [partialHash, '', ''];
}

/**
 * 
 * @param partialHash 
 * @param partialPreimage 
 * @param padding 
 * @returns sha256 of the origin message
 */
export function sha256ByPartialHash(partialHash: string, partialPreimage: string, padding: string): string {

  const partialHashBuffer = Buffer.from(partialHash, 'hex');
  const padded = Buffer.from(partialPreimage + padding, 'hex');

  const broken: Buffer[] = [];

  for (let i = 0; i < padded.length / 64; i++) {
    broken.push(padded.slice(i * 64, i * 64 + 64));
  }


  const h0 = [byteToUint32(partialHashBuffer.slice(0, 4)),
    byteToUint32(partialHashBuffer.slice(4, 8)),
    byteToUint32(partialHashBuffer.slice(8, 12)),
    byteToUint32(partialHashBuffer.slice(12, 16)),
    byteToUint32(partialHashBuffer.slice(16, 20)),
    byteToUint32(partialHashBuffer.slice(20, 24)),
    byteToUint32(partialHashBuffer.slice(24, 28)),
    byteToUint32(partialHashBuffer.slice(28, 32))
  ];

  let hi = h0;
  const W = [];
  for (let i = 0; i < broken.length; i++) {
    const chunk = broken[i];
    hi = g(hi, chunk);
  }
  return toHash(hi);
}

function byteToUint32(b: Buffer): number {
  return b.readUInt32BE();
}

function ToInteger(x: number) {
  x = Number(x);
  return x < 0 ? Math.ceil(x) : Math.floor(x);
}

function modulo(a: number, b: number) {
  return a - Math.floor(a / b) * b;
}
function ToUint32(x: number) {
  return modulo(ToInteger(x), Math.pow(2, 32));
}

//sha256 compression function
function g(hprev: number[], chunk: Buffer): number[] {
  let a = hprev[0];
  let b = hprev[1];
  let c = hprev[2];
  let d = hprev[3];
  let e = hprev[4];
  let f = hprev[5];
  let g = hprev[6];
  let h = hprev[7];
  const W = [];
  // Computation
  for (let i = 0; i < 64; i++) {
    if (i < 16) {
      W[i] = (chunk.slice(i * 4, i * 4 + 4).readUInt32BE());
    } else {
      const gamma0x = W[i - 15];
      const gamma0 = (((gamma0x << 25) | (gamma0x >>> 7)) ^
        ((gamma0x << 14) | (gamma0x >>> 18)) ^
        (gamma0x >>> 3));

      const gamma1x = W[i - 2];
      const gamma1 = (((gamma1x << 15) | (gamma1x >>> 17)) ^
        ((gamma1x << 13) | (gamma1x >>> 19)) ^
        (gamma1x >>> 10));

      W[i] = (gamma0 + W[i - 7] + gamma1 + W[i - 16]);

    }



    const ch = ((e & f) ^ (~e & g));
    const maj = ((a & b) ^ (a & c) ^ (b & c));

    const sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
    const sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7) | (e >>> 25));

    const t1 = (h + sigma1 + ch + K[i] + W[i]);
    const t2 = (sigma0 + maj);

    h = g;
    g = f;
    f = e;
    e = (d + t1);
    d = c;
    c = b;
    b = a;
    a = (t1 + t2);
  }

  return [ToUint32(hprev[0] + a),
    ToUint32(hprev[1] + b),
    ToUint32(hprev[2] + c),
    ToUint32(hprev[3] + d),
    ToUint32(hprev[4] + e),
    ToUint32(hprev[5] + f),
    ToUint32(hprev[6] + g),
    ToUint32(hprev[7] + h)];
}


function iToB(i: number): Buffer {
  const bs = Buffer.from([0, 0, 0, 0]);
  bs.writeUInt32BE(i);
  return bs;
}



function toHash(hi: number[]): string {
  const hashBytes = [iToB(hi[0]), iToB(hi[1]), iToB(hi[2]), iToB(hi[3]), iToB(hi[4]), iToB(hi[5]), iToB(hi[6]), iToB(hi[7])];
  return hashBytes.reduce((acc, cur) => {
    return Buffer.concat([acc, cur]);
  }, Buffer.from([])).toString('hex');
}
