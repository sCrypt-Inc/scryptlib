import { expect } from 'chai'
import { num2bin, bin2num, bsv ,literal2Asm, literal2ScryptType} from '../src/utils'

const BN = bsv.crypto.BN

describe('utils', () => {
  describe('num2bin()', () => {
    it('should return searialized format of the number with certain bytes length', () => {
      expect(num2bin(0, 1)).to.equal('00')
      expect(num2bin(10, 1)).to.equal('0a')
      expect(num2bin(0x123, 2)).to.equal('2301')
      expect(num2bin(0x123456789abcde, 7)).to.equal('debc9a78563412')
      expect(num2bin(-1000, 2)).to.equal('e883')

      // padded
      expect(num2bin(0, 3)).to.equal('000000')
      expect(num2bin(1, 2)).to.equal('0100')
      expect(num2bin(0x123456789abcde, 10)).to.equal('debc9a78563412000000')
      expect(num2bin(-1000, 4)).to.equal('e8030080')
      expect(num2bin(-123456789, 8)).to.equal('15cd5b0700000080')
    })

    it('Bigint', () => {
      expect(num2bin(0n, 1)).to.equal('00')
      expect(num2bin(10n, 1)).to.equal('0a')
      expect(num2bin(-1000n, 2)).to.equal('e883')

      // padded
      expect(num2bin(0n, 3)).to.equal('000000')
      expect(num2bin(1n, 2)).to.equal('0100')
      expect(num2bin(-1000n, 4)).to.equal('e8030080')
      expect(num2bin(-123456789n, 8)).to.equal('15cd5b0700000080')
    })

    it('should raise error if the number can not fit in certain bytes length', () => {
      expect(() => num2bin(128, 1)).to.throw('128 cannot fit in 1 byte[s]')
      expect(() => num2bin(0xffff, 2)).to.throw('65535 cannot fit in 2 byte[s]')
    })
  })

  describe('bin2num()', () => {
    it('bin2num', () => {
      expect(bin2num('00')).to.equal(0n)
      expect(bin2num('0a')).to.equal(0x0an)
      expect(bin2num('2301')).to.equal(0x123n)
      expect(bin2num('debc9a78563412')).to.equal(0x123456789abcden)
      expect(bin2num('e883')).to.equal(-1000n)

      expect(bin2num('000000')).to.equal(0n)
      expect(bin2num('0100')).to.equal(1n)
      expect(bin2num('debc9a78563412000000')).to.equal(0x123456789abcden)
      expect(bin2num('e8030080')).to.equal(-1000n)
      expect(bin2num('15cd5b0700000080')).to.equal(-123456789n)
    })
  })

  describe('num2bin() & bin2num()', () => {
    it('support bigint type', () => {
      // max number in Javascript
      let bn = BigInt(Number.MAX_SAFE_INTEGER)
      const bnZero = BigInt(0)
      expect(num2bin(bnZero, 32)).to.equal('00'.repeat(32))
      expect(bin2num('00'.repeat(32))).to.equal(0n)
      const bnOne = BigInt(1)
      const bnHundred = BigInt(100)
      bn = bn + bnOne
      expect(num2bin(bn, 8)).to.equal('0000000000002000')
      expect(bin2num('0000000000002000')).to.equal(bn)
      bn = bn + bnHundred
      expect(num2bin(bn, 8)).to.equal('6400000000002000')
      expect(bin2num('6400000000002000')).to.equal(bn)
      //negative bigint
      bn = -bn
      expect(num2bin(bn, 8)).to.equal('6400000000002080')
      expect(bin2num('6400000000002080')).to.equal(bn)
    })

    it('support BN.js type', () => {
      // max number in Javascript
      let bn = new BN(Number.MAX_SAFE_INTEGER)
      const bnOne = new BN(1)
      const bnHundred = new BN(100)
      bn = bn.add(bnOne)
      expect(num2bin(bn, 8)).to.equal('0000000000002000')
      expect(bin2num('0000000000002000').toString()).to.equal(bn.toString())
      bn = bn.add(bnHundred)
      expect(num2bin(bn, 8)).to.equal('6400000000002000')
      expect(bin2num('6400000000002000').toString()).to.equal(bn.toString())
      //negative bigint
      bn = bn.neg()
      expect(num2bin(bn, 8)).to.equal('6400000000002080')
      expect(bin2num('6400000000002080').toString()).to.equal(bn.toString())
    })

    it('HexInt with 9bytes', () => {
      const bn = new BN('010000000000200001', 16, 'le')
      expect(num2bin(bn, 9)).to.equal('010000000000200001')
      expect(bin2num('010000000000200001').toString()).to.equal(bn.toString())
    })

    it('UInt256 with 32ytes', () => {
      const bn = new BN(
        '0100000000002000010000000000200001000000000020000100000000002000',
        16,
        'le'
      )
      expect(num2bin(bn, 32)).to.equal(
        '0100000000002000010000000000200001000000000020000100000000002000'
      )
      expect(
        bin2num(
          '0100000000002000010000000000200001000000000020000100000000002000'
        ).toString()
      ).to.equal(bn.toString())
    })

    it('support bin2num Buffer', () => {
      const bn = new BN('010000000000200001', 16, 'le')
      expect(num2bin(bn, 9)).to.equal('010000000000200001')
      const buffer = bn.toBuffer({endian : 'little', size: 9})
      expect(bin2num(buffer).toString()).to.equal(bn.toString())
    })

  })

  describe('literal2Asm()', () => {

    it('int string to asm', () => {
      expect(literal2Asm("9007199254740991")).to.have.members(["ffffffffffff1f", "int"]);
      expect(literal2Asm("0xdebc9a78563")).to.have.members(["6385a7c9eb0d", "int"]);
      expect(literal2Asm("0")).to.have.members(["OP_0", "int"]);
      expect(literal2Asm("16")).to.have.members(["OP_16", "int"]);
      expect(literal2Asm("-1")).to.have.members(["OP_1NEGATE", "int"]);
      expect(literal2Asm("-111111")).to.have.members(["07b281", "int"]);
      expect(literal2Asm("false")).to.have.members(["OP_FALSE", "bool"]);
      expect(literal2Asm("b''")).to.have.members(["OP_0", "bytes"]);
      expect(literal2Asm("b'62f0245bb9'")).to.have.members(["62f0245bb9", "bytes"]);
      expect(literal2Asm("PrivKey(1)")).to.have.members(["01", "PrivKey"]);
      expect(literal2Asm("PrivKey(0x3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062)")).to.have.members(["62f0245bb90aef0d18f914c3c8191d430f99fff925d981d2656c9a7626f14738", "PrivKey"]);
      expect(literal2Asm("PubKey(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')")).to.have.members(["3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062", "PubKey"]);
      expect(literal2Asm("Sig(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')")).to.have.members(["3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062", "Sig"]);
      expect(literal2Asm("Ripemd160(b'3847f126769a6c65d281d925f9ff99')")).to.have.members(["3847f126769a6c65d281d925f9ff99", "Ripemd160"]);
      expect(literal2Asm("Sha1(b'3847f126769a6c65d281d925f9ff99')")).to.have.members(["3847f126769a6c65d281d925f9ff99", "Sha1"]);
      expect(literal2Asm("Sha256(b'3847f126769a6c65d281d925f9ff99')")).to.have.members(["3847f126769a6c65d281d925f9ff99", "Sha256"]);
      expect(literal2Asm("SigHashType(b'01')")).to.have.members(["01", "SigHashType"]);
      expect(literal2Asm("SigHashType(b'02')")).to.have.members(["02", "SigHashType"]);
      expect(literal2Asm("SigHashType(b'03')")).to.have.members(["03", "SigHashType"]);
      expect(literal2Asm("SigHashType(b'40')")).to.have.members(["40", "SigHashType"]);
      expect(literal2Asm("SigHashType(b'80')")).to.have.members(["80", "SigHashType"]);
      expect(literal2Asm("SigHashPreimage(b'3847f126769a6c65d281d925f9ff99')")).to.have.members(["3847f126769a6c65d281d925f9ff99", "SigHashPreimage"]);
      expect(literal2Asm("OpCodeType(b'01')")).to.have.members(["01", "OpCodeType"]);
    });
  })


  describe('literal2ScryptType()', () => {

    console.log("literal2ScryptType")
    it('int string to asm', () => {
      expect(literal2ScryptType("9007199254740991").value).to.equal(9007199254740991);
      expect(literal2ScryptType("0xdebc9a78563").value).to.equal(15306351674723);
      expect(literal2ScryptType("0").value).to.equal(0);
      expect(literal2ScryptType("-1").value).to.equal(-1);
      expect(literal2ScryptType("false").value).to.equal(false);
      expect(literal2ScryptType("b''").value).to.equal("");
      expect(literal2ScryptType("b'62f0245bb9'").value).to.equal("62f0245bb9");
      expect(literal2ScryptType("PrivKey(1)").value).to.equal(1);

      //mocha do not  know how to serialize a BigInt, so call toString and compare it
      expect(literal2ScryptType("PrivKey(0x3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062)").value.toString())
        .to.equal("25456630020100109444707942782143792492829674412994957270434525334028981432418");

      expect(literal2ScryptType("PrivKey(0x3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062)").toLiteral())
        .to.equal("PrivKey(0x3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062)");

      expect(literal2ScryptType("b'62f0245bb9'").value).to.equal("62f0245bb9");


      expect(literal2ScryptType("PubKey(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')").value)
        .to.equal("3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062");
      expect(literal2ScryptType("PubKey(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')").toLiteral())
        .to.equal("PubKey(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')");

      expect(literal2ScryptType("Sig(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')").value)
        .to.equal("3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062");
      expect(literal2ScryptType("Sig(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')").toLiteral())
        .to.equal("Sig(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')");

      expect(literal2ScryptType("Ripemd160(b'3847f126769a6c65d281d925f9ff99')").value)
        .to.equal("3847f126769a6c65d281d925f9ff99");
      expect(literal2ScryptType("Ripemd160(b'3847f126769a6c65d281d925f9ff99')").toLiteral())
        .to.equal("Ripemd160(b'3847f126769a6c65d281d925f9ff99')");


      expect(literal2ScryptType("Sha1(b'3847f126769a6c65d281d925f9ff99')").value)
        .to.equal("3847f126769a6c65d281d925f9ff99");
      expect(literal2ScryptType("Sha1(b'3847f126769a6c65d281d925f9ff99')").toLiteral())
        .to.equal("Sha1(b'3847f126769a6c65d281d925f9ff99')");

      expect(literal2ScryptType("Sha256(b'3847f126769a6c65d281d925f9ff99')").value)
        .to.equal("3847f126769a6c65d281d925f9ff99");
      expect(literal2ScryptType("Sha256(b'3847f126769a6c65d281d925f9ff99')").toLiteral())
        .to.equal("Sha256(b'3847f126769a6c65d281d925f9ff99')");


      expect(literal2ScryptType("SigHashType(b'01')").value)
        .to.equal(0x01);
      expect(literal2ScryptType("SigHashType(b'80')").value)
        .to.equal(0x80);
      expect(literal2ScryptType("SigHashType(b'01')").toLiteral())
        .to.equal("SigHashType(b'01')");

      expect(literal2ScryptType("SigHashPreimage(b'3847f126769a6c65d281d925f9ff99')").value)
        .to.equal("3847f126769a6c65d281d925f9ff99");
      expect(literal2ScryptType("SigHashPreimage(b'3847f126769a6c65d281d925f9ff99')").toLiteral())
        .to.equal("SigHashPreimage(b'3847f126769a6c65d281d925f9ff99')");


      expect(literal2ScryptType("OpCodeType(b'01')").value)
        .to.equal("01");
      expect(literal2ScryptType("OpCodeType(b'01')").toLiteral())
        .to.equal("OpCodeType(b'01')");
    });
  })

})
