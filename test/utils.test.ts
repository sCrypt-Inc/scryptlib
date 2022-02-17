import { expect } from 'chai'
import { buildContractClass, buildTypeClasses } from '../src/contract';
import { Int, Bool, Bytes, PrivKey, Ripemd160, PubKey } from '../src/scryptTypes'
import {
  num2bin, bin2num, bsv, parseLiteral, literal2ScryptType, int2Asm, arrayTypeAndSize, checkSupportedParamType,
  flatternArray, subscript, flattenSha256, findKeyIndex, parseGenericType,
  flatternParams, flatternStruct, isArrayType, isStructType, compileContract,
  toLiteral, asm2int, isGenericType, sha256, hash256, hash160, isLibraryType,
  buildOpreturnScript, buildPublicKeyHashScript, toHex, signTx, parseAbiFromUnlockingScript,
  inferrType
} from '../src/utils'
import { getContractFilePath, loadDescription, newTx } from './helper';
import { tmpdir } from 'os'
import { FunctionCall } from '../src/abi';


const mixedstructDescr = loadDescription('mixedstruct_desc.json');
const { Person, Block, Bsver, Token } = buildTypeClasses(mixedstructDescr);


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
      expect(bin2num('00')).to.equal(0)
      expect(bin2num('0a')).to.equal(0x0a)
      expect(bin2num('2301')).to.equal(0x123)
      expect(bin2num('debc9a78563412')).to.equal(0x123456789abcde)
      expect(bin2num('e883')).to.equal(-1000)

      expect(bin2num('000000')).to.equal(0)
      expect(bin2num('0100')).to.equal(1)
      expect(bin2num('debc9a78563412000000')).to.equal(0x123456789abcde)
      expect(bin2num('e8030080')).to.equal(-1000)
      expect(bin2num('15cd5b0700000080')).to.equal(-123456789)
    })
  })

  describe('num2bin() & bin2num()', () => {
    it('support bigint type', () => {
      // max number in Javascript
      let bn = BigInt(Number.MAX_SAFE_INTEGER)
      const bnZero = BigInt(0)
      expect(num2bin(bnZero, 32)).to.equal('00'.repeat(32))
      expect(bin2num('00'.repeat(32))).to.equal(0)
      const bnOne = BigInt(1)
      const bnHundred = BigInt(100)
      bn = bn + bnOne
      expect(num2bin(bn, 8)).to.equal('0000000000002000')
      expect(bin2num('0000000000002000')).to.equal(bn.toString())
      bn = bn + bnHundred
      expect(num2bin(bn, 8)).to.equal('6400000000002000')
      expect(bin2num('6400000000002000')).to.equal(bn.toString())
      //negative bigint
      bn = -bn
      expect(num2bin(bn, 8)).to.equal('6400000000002080')
      expect(bin2num('6400000000002080')).to.equal(bn.toString())
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
      const buffer = bn.toBuffer({ endian: 'little', size: 9 })
      expect(bin2num(buffer).toString()).to.equal(bn.toString())
    })

  })


  describe('int2Asm()', () => {

    it('int string to asm', () => {
      expect(int2Asm("992218700866541488854030164190743727617658394826382323005192752278160641622424126616186015754450906117445668830393086070718237548341612508577988597572812"))
        .to.equal("cce42011b595b8ef7742710a4492a130e4b7e020097044e7b86258f82ae25f0467e8a0141ae5afd7038810f692f52d43fbb03363b8320d3b43dc65092eddf112")


      expect(int2Asm("0x12f1dd2e0965dc433b0d32b86333b0fb432df592f6108803d7afe51a14a0e867045fe22af85862b8e744700920e0b7e430a192440a714277efb895b51120e4cc"))
        .to.equal("cce42011b595b8ef7742710a4492a130e4b7e020097044e7b86258f82ae25f0467e8a0141ae5afd7038810f692f52d43fbb03363b8320d3b43dc65092eddf112")

      expect(int2Asm("-1"))
        .to.equal("OP_1NEGATE")

      expect(int2Asm("0"))
        .to.equal("OP_0")


      expect(int2Asm("1"))
        .to.equal("OP_1")

      expect(int2Asm("-2"))
        .to.equal("82")
    });
  })


  describe('asm2int()', () => {

    it('asm string to int', () => {
      expect(asm2int("cce42011b595b8ef7742710a4492a130e4b7e020097044e7b86258f82ae25f0467e8a0141ae5afd7038810f692f52d43fbb03363b8320d3b43dc65092eddf112"))
        .to.equal(992218700866541488854030164190743727617658394826382323005192752278160641622424126616186015754450906117445668830393086070718237548341612508577988597572812n)


      expect(asm2int("OP_1"))
        .to.equal(1)

      expect(asm2int("OP_0"))
        .to.equal(0)

      expect(asm2int("OP_1NEGATE"))
        .to.equal(-1)

      expect(asm2int("82"))
        .to.equal(130)

    });
  })



  describe('parseLiteral()', () => {

    it('parser Literal string', () => {
      expect(parseLiteral("9007199254740991")).to.have.members(["ffffffffffff1f", BigInt(9007199254740991), "int"]);
      expect(parseLiteral("0xdebc9a78563")).to.have.members(["6385a7c9eb0d", 15306351674723, "int"]);
      expect(parseLiteral("0")).to.have.members(["OP_0", 0, "int"]);
      expect(parseLiteral("16")).to.have.members(["OP_16", 16, "int"]);
      expect(parseLiteral("-1")).to.have.members(["OP_1NEGATE", -1, "int"]);
      expect(parseLiteral("-111111")).to.have.members(["07b281", -111111, "int"]);
      expect(parseLiteral("false")).to.have.members(["OP_FALSE", false, "bool"]);
      expect(parseLiteral("b''")).to.have.members(["OP_0", "", "bytes"]);
      expect(parseLiteral("b'62f0245bb9'")).to.have.members(["62f0245bb9", "62f0245bb9", "bytes"]);
      expect(parseLiteral("PrivKey(1)")).to.have.members(["OP_1", 1, "PrivKey"]);
      expect(parseLiteral("PrivKey(16)")).to.have.members(["OP_16", 16, "PrivKey"]);
      expect(parseLiteral("PrivKey(0)")).to.have.members(["OP_0", 0, "PrivKey"]);
      expect(parseLiteral("PrivKey(0x3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062)")).to.have.members([
        "62f0245bb90aef0d18f914c3c8191d430f99fff925d981d2656c9a7626f14738",
        BigInt("0x3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062"),
        "PrivKey"
      ]);
      expect(parseLiteral("PubKey(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')")).to.have.members([
        "3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062",
        "3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062",
        "PubKey"
      ]);
      expect(parseLiteral("Sig(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')")).to.have.members([
        "3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062",
        "3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062",
        "Sig"]);
      expect(parseLiteral("Ripemd160(b'3847f126769a6c65d281d925f9ff99')")).to.have.members(["3847f126769a6c65d281d925f9ff99", "3847f126769a6c65d281d925f9ff99", "Ripemd160"]);
      expect(parseLiteral("Sha1(b'3847f126769a6c65d281d925f9ff99')")).to.have.members(["3847f126769a6c65d281d925f9ff99", "3847f126769a6c65d281d925f9ff99", "Sha1"]);
      expect(parseLiteral("Sha256(b'3847f126769a6c65d281d925f9ff99')")).to.have.members(["3847f126769a6c65d281d925f9ff99", "3847f126769a6c65d281d925f9ff99", "Sha256"]);
      expect(parseLiteral("SigHashType(b'01')")).to.have.members(["01", 0x01, "SigHashType"]);
      expect(parseLiteral("SigHashType(b'02')")).to.have.members(["02", 0x02, "SigHashType"]);
      expect(parseLiteral("SigHashType(b'03')")).to.have.members(["03", 0x03, "SigHashType"]);
      expect(parseLiteral("SigHashType(b'40')")).to.have.members(["40", 0x40, "SigHashType"]);
      expect(parseLiteral("SigHashType(b'80')")).to.have.members(["80", 0x80, "SigHashType"]);
      expect(parseLiteral("SigHashPreimage(b'3847f126769a6c65d281d925f9ff99')")).to.have.members(["3847f126769a6c65d281d925f9ff99", "3847f126769a6c65d281d925f9ff99", "SigHashPreimage"]);
      expect(parseLiteral("OpCodeType(b'01')")).to.have.members(["01", "01", "OpCodeType"]);
      expect(parseLiteral("b'01'")).to.have.members(["OP_1", "01", "bytes"]);
      expect(parseLiteral("b'03'")).to.have.members(["OP_3", "03", "bytes"]);
      expect(parseLiteral("b'00'")).to.have.members(["00", "00", "bytes"]);
      expect(parseLiteral("b'10'")).to.have.members(["OP_16", "10", "bytes"]);
      expect(parseLiteral("b'11'")).to.have.members(["11", "11", "bytes"]);
      expect(parseLiteral("b'0001'")).to.have.members(["0001", "0001", "bytes"]);
    });
  })


  describe('literal2ScryptType()', () => {

    it('literal2ScryptType', () => {
      expect(literal2ScryptType("9007199254740991").value).to.equal(BigInt(9007199254740991));
      expect(literal2ScryptType("0xdebc9a78563").value).to.equal(15306351674723);
      expect(literal2ScryptType("0").value).to.equal(0);
      expect(literal2ScryptType("-1").value).to.equal(-1);
      expect(literal2ScryptType("false").value).to.equal(false);
      expect(literal2ScryptType("b''").value).to.equal("");
      expect(literal2ScryptType("b'62f0245bb9'").value).to.equal("62f0245bb9");
      expect(literal2ScryptType("PrivKey(1)").value).to.equal(1);
      expect(literal2ScryptType("PrivKey(1)").toLiteral()).to.equal("PrivKey(0x01)");
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

  describe('arrayTypeAndSize()', () => {

    it('arrayTypeAndSize int[7]', () => {
      const [elemTypeName, arraySize] = arrayTypeAndSize("int[7]");
      expect(elemTypeName).to.equal('int')
      expect(arraySize).to.includes.members([7])
    })

    it('arrayTypeAndSize int[2][3]', () => {

      const [elemTypeName, arraySize] = arrayTypeAndSize("int[2][3]");
      expect(elemTypeName).to.equal('int')
      expect(arraySize).to.includes.members([2, 3])
    })

    it('arrayTypeAndSize bool[2][3][8][1]', () => {

      const [elemTypeName, arraySize] = arrayTypeAndSize("bool[2][3][8][1]");
      expect(elemTypeName).to.equal('bool')
      expect(arraySize).to.includes.members([2, 3, 8, 1])
    })


    it('arrayTypeAndSize bool[2][3][8][1]', () => {

      const [elemTypeName, arraySize] = arrayTypeAndSize("bool[2][3][8][1]");
      expect(elemTypeName).to.equal('bool')
      expect(arraySize).to.includes.members([2, 3, 8, 1])
    })

    it('arrayTypeAndSize L<St, int>[3]', () => {

      const [elemTypeName, arraySize] = arrayTypeAndSize("L<St,int>[3]");
      expect(elemTypeName).to.equal('L<St,int>')
      expect(arraySize).to.includes.members([3])
    })

    it('arrayTypeAndSize L<struct ST {}, int[3]>[3][2]', () => {

      const [elemTypeName, arraySize] = arrayTypeAndSize("L<struct ST {},int[3]>[3][2]");
      expect(elemTypeName).to.equal('L<struct ST {},int[3]>')
      expect(arraySize).to.includes.members([3, 2])
    })
  })


  describe('subArrayType()', () => {

    it('subArrayType int[7][7]', () => {
      const [elemTypeName, arraySize] = arrayTypeAndSize("int[7]");
      expect(elemTypeName).to.equal('int')
      expect(arraySize).to.includes.members([7])
    })

    it('subArrayType bool[2][3][8][1]', () => {

      const [elemTypeName, arraySize] = arrayTypeAndSize("bool[3][8][1]");
      expect(elemTypeName).to.equal('bool')
      expect(arraySize).to.includes.members([3, 8, 1])
    })
  })


  describe('checkArray()', () => {

    it('checkArray int[3]', () => {
      expect(checkSupportedParamType([3, 3, 3], {
        name: "a",
        type: 'int[3]'
      }, (type: string) => type)).to.undefined;
    })

    it('checkArray int[3]', () => {
      expect(checkSupportedParamType([3, 3], {
        name: "a",
        type: 'int[3]'
      }, (type: string) => type)).to.not.undefined
    })

    it('checkArray int[3]', () => {
      expect(checkSupportedParamType([3, 3, 1, 3], {
        name: "a",
        type: 'int[3]'
      }, (type: string) => type)).to.not.undefined
    })

    it('checkArray int[3]', () => {
      expect(checkSupportedParamType([3, 3, new Int(2)], {
        name: "a",
        type: 'int[3]'
      }, (type: string) => type)).to.undefined;
    })

    it('checkArray int[3]', () => {
      expect(checkSupportedParamType([3, 3, new Bool(true)], {
        name: "a",
        type: 'int[3]'
      }, (type: string) => type)).to.not.undefined
    })


    it('checkArray int[2][3]', () => {
      expect(checkSupportedParamType([[3, 3, 3], [3, 12, 3]], {
        name: "a",
        type: 'int[2][3]'
      }, (type: string) => type)).to.undefined;
    })

    it('checkArray int[2][3]', () => {
      expect(checkSupportedParamType([[3, 3, 3], [3, 12, 3], [1, 1, 1]], {
        name: "a",
        type: 'int[2][3]'
      }, (type: string) => type)).to.not.undefined
    })

    it('checkArray int[2][3]', () => {
      expect(checkSupportedParamType([[3, 3, 3], [3, 12]], {
        name: "a",
        type: 'int[2][3]'
      }, (type: string) => type)).to.not.undefined
    })

    it('checkArray int[2][1][3]', () => {
      expect(checkSupportedParamType([[[3, 3, 3]], [[3, 12, 3]]], {
        name: "a",
        type: 'int[2][1][3]'
      }, (type: string) => type)).to.undefined;
    })

    it('checkArray int[2][1][3]', () => {
      expect(checkSupportedParamType([[[3, 3, 3], 1], [[3, 12, 3]]], {
        name: "a",
        type: 'int[2][1][3]'
      }, (type: string) => type)).to.not.undefined
    })


    it('checkArray int[2][2][3]', () => {
      expect(checkSupportedParamType([[[3, 3, 3], [3, 3, 3]], [[3, 12, 3], [3, 3, 3]]], {
        name: "a",
        type: 'int[2][2][3]'
      }, (type: string) => type)).to.undefined;
    })


    it('checkArray int[2][2][3]', () => {
      expect(checkSupportedParamType([[[3, 3, 3], [3, 3, 3]], [[3, 12, 3], [3, 3, 3]]], {
        name: "a",
        type: 'int[2][2][3]'
      }, (type: string) => type)).to.undefined;
    })


    it('checkArray int[2][3][4]', () => {
      expect(checkSupportedParamType([[
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12]
      ],
      [
        [13, 14, 15, 16],
        [17, 18, 19, 20],
        [21, 22, 23, 24]
      ]], {
        name: "a",
        type: 'int[2][3][4]'
      }, (type: string) => type)).to.undefined;
    })

    it('checkArray int[2][3][4]', () => {
      expect(checkSupportedParamType([[1, 3, 5], [2, 4, 6]], {
        name: "a",
        type: 'int[2][3][4]'
      }, (type: string) => type)).to.not.undefined
    })

  })


  describe('flatternArray()', () => {


    it('flatternArray int[2][2][3]', () => {
      expect(flatternArray([[[3, 3, 3], [3, 3, 3]], [[3, 12, 3], [3, 3, 3]]], "a", "int[2][2][3]")).to.deep.ordered.members([{
        name: "a[0][0][0]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[0][0][1]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[0][0][2]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[0][1][0]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[0][1][1]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[0][1][2]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[1][0][0]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[1][0][1]",
        type: "int",
        value: new Int(12)
      }, {
        name: "a[1][0][2]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[1][1][0]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[1][1][1]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[1][1][2]",
        type: "int",
        value: new Int(3)
      }])
    })

    it('flatternArray int[2][3]', () => {
      expect(flatternArray([[1, 2, 3], [4, 12, 5]], "a", "int[2][3]")).to.deep.ordered.members([{
        name: "a[0][0]",
        type: "int",
        value: new Int(1)
      }, {
        name: "a[0][1]",
        type: "int",
        value: new Int(2)
      }, {
        name: "a[0][2]",
        type: "int",
        value: new Int(3)
      }, {
        name: "a[1][0]",
        type: "int",
        value: new Int(4)
      }, {
        name: "a[1][1]",
        type: "int",
        value: new Int(12)
      }, {
        name: "a[1][2]",
        type: "int",
        value: new Int(5)
      },
      ])
    })

    it('flatternArray int[1][1][1][2]', () => {
      expect(flatternArray([[[[3, 4]]]], "a", "int[1][1][1][2]")).to.deep.ordered.members([
        {
          name: "a[0][0][0][0]",
          type: "int",
          value: new Int(3)
        },
        {
          name: "a[0][0][0][1]",
          type: "int",
          value: new Int(4)
        }
      ])
    })

    it('flatternArray int[3]', () => {
      expect(flatternArray([1, 2, 3], "a", "int[3]")).to.deep.ordered.members([
        {
          name: "a[0]",
          type: "int",
          value: new Int(1)
        },
        {
          name: "a[1]",
          type: "int",
          value: new Int(2)
        },
        {
          name: "a[2]",
          type: "int",
          value: new Int(3)
        }
      ])
    })



    it('flatternArray int[2][3][4]', () => {
      expect(flatternArray([[
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12]
      ],
      [
        [13, 14, 15, 16],
        [17, 18, 19, 20],
        [21, 22, 23, 24]
      ]], "a", "int[2][3][4]")).to.deep.ordered.members([
        {
          name: "a[0][0][0]",
          type: "int",
          value: new Int(1)
        },
        {
          name: "a[0][0][1]",
          type: "int",
          value: new Int(2)
        },
        {
          name: "a[0][0][2]",
          type: "int",
          value: new Int(3)
        },
        {
          name: "a[0][0][3]",
          type: "int",
          value: new Int(4)
        },
        {
          name: "a[0][1][0]",
          type: "int",
          value: new Int(5)
        }, {
          name: "a[0][1][1]",
          type: "int",
          value: new Int(6)
        }, {
          name: "a[0][1][2]",
          type: "int",
          value: new Int(7)
        }, {
          name: "a[0][1][3]",
          type: "int",
          value: new Int(8)
        }, {
          name: "a[0][2][0]",
          type: "int",
          value: new Int(9)
        }, {
          name: "a[0][2][1]",
          type: "int",
          value: new Int(10)
        }, {
          name: "a[0][2][2]",
          type: "int",
          value: new Int(11)
        }, {
          name: "a[0][2][3]",
          type: "int",
          value: new Int(12)
        }, {
          name: "a[1][0][0]",
          type: "int",
          value: new Int(13)
        }, {
          name: "a[1][0][1]",
          type: "int",
          value: new Int(14)
        }, {
          name: "a[1][0][2]",
          type: "int",
          value: new Int(15)
        }, {
          name: "a[1][0][3]",
          type: "int",
          value: new Int(16)
        }, {
          name: "a[1][1][0]",
          type: "int",
          value: new Int(17)
        }, {
          name: "a[1][1][1]",
          type: "int",
          value: new Int(18)
        }, {
          name: "a[1][1][2]",
          type: "int",
          value: new Int(19)
        }, {
          name: "a[1][1][3]",
          type: "int",
          value: new Int(20)
        }, {
          name: "a[1][2][0]",
          type: "int",
          value: new Int(21)
        }, {
          name: "a[1][2][1]",
          type: "int",
          value: new Int(22)
        }, {
          name: "a[1][2][2]",
          type: "int",
          value: new Int(23)
        }, {
          name: "a[1][2][3]",
          type: "int",
          value: new Int(24)
        }
      ])
    })
  })


  describe('flatternStruct()', () => {
    it('flatternStruct Block', () => {
      expect(flatternStruct(new Block({
        time: 10000,
        hash: new Bytes('68656c6c6f20776f726c6421'),
        header: new Bytes('1156'),
      }), "block")).to.deep.ordered.members([{
        value: new Bytes('68656c6c6f20776f726c6421'),
        name: "block.hash",
        type: "bytes"
      }, {
        value: new Bytes('1156'),
        name: "block.header",
        type: "bytes"
      }, {
        value: new Int(10000),
        name: "block.time",
        type: "int"
      }])
    })


    it('flatternStruct Person', () => {
      expect(flatternStruct(new Person({
        name: new Bytes('7361746f736869206e616b616d6f746f'),
        addr: new Bytes('6666'),
        isMale: true,
        age: 33,
        blk: new Block({
          time: 10000,
          hash: new Bytes('68656c6c6f20776f726c6421'),
          header: new Bytes('1156'),
        })
      }), "p")).to.deep.ordered.members([{
        value: new Bytes('7361746f736869206e616b616d6f746f'),
        name: "p.name",
        type: "bytes"
      }, {
        value: new Bytes('6666'),
        name: "p.addr",
        type: "bytes"
      }, {
        value: new Bool(true),
        name: "p.isMale",
        type: "bool"
      }, {
        value: new Int(33),
        name: "p.age",
        type: "int"
      }, {
        value: new Bytes('68656c6c6f20776f726c6421'),
        name: "p.blk.hash",
        type: "bytes"
      }, {
        value: new Bytes('1156'),
        name: "p.blk.header",
        type: "bytes"
      }, {
        value: new Int(10000),
        name: "p.blk.time",
        type: "int"
      }])
    })


    it('flatternStruct Bsver', () => {
      expect(flatternStruct(new Bsver({
        name: new Bytes('6666'),
        friend: new Person({
          name: new Bytes('7361746f736869206e616b616d6f746f'),
          addr: new Bytes('6666'),
          isMale: true,
          age: 33,
          blk: new Block({
            time: 10000,
            hash: new Bytes('68656c6c6f20776f726c6421'),
            header: new Bytes('1156'),
          })
        }),
        tokens: [new Token({
          id: new Bytes('0001'),
          createTime: 1000000
        }), new Token({
          id: new Bytes('0002'),
          createTime: 1000001
        }), new Token({
          id: new Bytes('0003'),
          createTime: 1000002
        })]
      }), "b")).to.deep.ordered.members([{
        value: new Bytes('6666'),
        name: "b.name",
        type: "bytes"
      }, {
        value: new Bytes('0001'),
        name: "b.tokens[0].id",
        type: "bytes"
      }, {
        value: new Int(1000000),
        name: "b.tokens[0].createTime",
        type: "int"
      }, {
        value: new Bytes('0002'),
        name: "b.tokens[1].id",
        type: "bytes"
      }, {
        value: new Int(1000001),
        name: "b.tokens[1].createTime",
        type: "int"
      }, {
        value: new Bytes('0003'),
        name: "b.tokens[2].id",
        type: "bytes"
      }, {
        value: new Int(1000002),
        name: "b.tokens[2].createTime",
        type: "int"
      }, {
        value: new Bytes('7361746f736869206e616b616d6f746f'),
        name: "b.friend.name",
        type: "bytes"
      }, {
        value: new Bytes('6666'),
        name: "b.friend.addr",
        type: "bytes"
      }, {
        value: new Bool(true),
        name: "b.friend.isMale",
        type: "bool"
      }, {
        value: new Int(33),
        name: "b.friend.age",
        type: "int"
      }, {
        value: new Bytes('68656c6c6f20776f726c6421'),
        name: "b.friend.blk.hash",
        type: "bytes"
      }, {
        value: new Bytes('1156'),
        name: "b.friend.blk.header",
        type: "bytes"
      }, {
        value: new Int(10000),
        name: "b.friend.blk.time",
        type: "int"
      }])
    })
  })


  describe('subscript() [2][3][4]', () => {
    it('subscript should be [0][0][0] when one-dimensions index = 0', () => {
      expect(subscript(0, [2, 3, 4])).to.equal('[0][0][0]')
    })


    it('subscript should be [0][0][1] when one-dimensions index = 1', () => {
      expect(subscript(1, [2, 3, 4])).to.equal('[0][0][1]')
    })

    it('subscript should be [0][0][2] when one-dimensions index = 2', () => {
      expect(subscript(2, [2, 3, 4])).to.equal('[0][0][2]')
    })

    it('subscript should be [0][0][3] when one-dimensions index = 3', () => {
      expect(subscript(3, [2, 3, 4])).to.equal('[0][0][3]')
    })

    it('subscript should be [0][1][0] when one-dimensions index = 4', () => {
      expect(subscript(4, [2, 3, 4])).to.equal('[0][1][0]')
    })

    it('subscript should be [0][1][1] when one-dimensions index = 5', () => {
      expect(subscript(5, [2, 3, 4])).to.equal('[0][1][1]')
    })

    it('subscript should be [0][1][2] when one-dimensions index = 6', () => {
      expect(subscript(6, [2, 3, 4])).to.equal('[0][1][2]')
    })

    it('subscript should be [0][1][3] when one-dimensions index = 7', () => {
      expect(subscript(7, [2, 3, 4])).to.equal('[0][1][3]')
    })

    it('subscript should be [0][2][0] when  one-dimensions index = 8', () => {
      expect(subscript(8, [2, 3, 4])).to.equal('[0][2][0]')
    })

    it('subscript should be [0][2][1] when one-dimensions index = 9', () => {
      expect(subscript(9, [2, 3, 4])).to.equal('[0][2][1]')
    })

    it('subscript should be [0][2][2] when one-dimensions index = 10', () => {
      expect(subscript(10, [2, 3, 4])).to.equal('[0][2][2]')
    })

    it('subscript should be [0][2][3] when one-dimensions index = 11', () => {
      expect(subscript(11, [2, 3, 4])).to.equal('[0][2][3]')
    })

    it('subscript should be [1][0][0] when one-dimensions index = 12', () => {
      expect(subscript(12, [2, 3, 4])).to.equal('[1][0][0]')
    })


    it('subscript should be [1][0][1] when one-dimensions index = 13', () => {
      expect(subscript(13, [2, 3, 4])).to.equal('[1][0][1]')
    })

    it('subscript should be [1][0][2] when one-dimensions index = 14', () => {
      expect(subscript(14, [2, 3, 4])).to.equal('[1][0][2]')
    })

    it('subscript should be [1][0][3] when one-dimensions index = 15', () => {
      expect(subscript(15, [2, 3, 4])).to.equal('[1][0][3]')
    })


    it('subscript should be [1][1][0] when one-dimensions index = 16', () => {
      expect(subscript(16, [2, 3, 4])).to.equal('[1][1][0]')
    })

    it('subscript should be [1][1][1] when one-dimensions index = 17', () => {
      expect(subscript(17, [2, 3, 4])).to.equal('[1][1][1]')
    })

    it('subscript should be [1][1][2] when one-dimensions index = 18', () => {
      expect(subscript(18, [2, 3, 4])).to.equal('[1][1][2]')
    })

    it('subscript should be [1][1][3] when one-dimensions index = 19', () => {
      expect(subscript(19, [2, 3, 4])).to.equal('[1][1][3]')
    })

    it('subscript should be [1][2][0] when one-dimensions index = 20', () => {
      expect(subscript(20, [2, 3, 4])).to.equal('[1][2][0]')
    })

    it('subscript should be [1][2][1] when one-dimensions index = 21', () => {
      expect(subscript(21, [2, 3, 4])).to.equal('[1][2][1]')
    })

    it('subscript should be [1][2][2] when one-dimensions index = 22', () => {
      expect(subscript(22, [2, 3, 4])).to.equal('[1][2][2]')
    })

    it('subscript should be [1][2][3] when one-dimensions index = 23', () => {
      expect(subscript(23, [2, 3, 4])).to.equal('[1][2][3]')
    })

    it('subscript should be [0] when one-dimensions index = 0', () => {
      expect(subscript(0, [2])).to.equal('[0]')
    })

    it('subscript should be [1] when one-dimensions index = 1', () => {
      expect(subscript(1, [2])).to.equal('[1]')
    })

  })

  describe('isArrayType()', () => {

    it('isArrayType should succeeding when test int[1]', () => {
      expect(isArrayType('int[1]')).to.be.true
    })

    it('isArrayType should succeeding when test bytes[1][2][1]', () => {
      expect(isArrayType('bytes[1][2][1]')).to.be.true
    })


    it('isArrayType should succeeding when test st.y[1][2][1]', () => {
      expect(isArrayType('st.y[1][2][1]')).to.be.true
    })

    it('isArrayType should succeeding when test struct Token {}[3]', () => {
      expect(isArrayType('struct Token {}[3]')).to.be.true
    })

    it('isArrayType should succeeding when test L<int, bool>[3]', () => {
      expect(isArrayType('L<int, bool>[3]')).to.be.true
    })

    it('isArrayType should succeeding when test L<struct ST {}, int[3]>[3]', () => {
      expect(isArrayType('L<struct ST {}, int[3]>[3]')).to.be.true
    })


    it('isArrayType should fail when test bytes[1][2][1', () => {
      expect(isArrayType('int[1][2][1')).to.be.false
    })

    it('isArrayType should fail when start with space', () => {
      expect(isArrayType(' int[1][2][1]')).to.be.false
    })

    it('isArrayType should fail when start with aa', () => {
      expect(isArrayType('aa')).to.be.false
    })

  })


  describe('isStructType()', () => {

    it('isStructType should succeeding when test struct Token {}', () => {
      expect(isStructType('struct Token {}')).to.be.true
    })


    it('isStructType should fail when test struct Token {}[3]', () => {
      expect(isStructType('struct Token {}[3]')).to.be.false
    })

    it('isStructType should fail when test struct Token {', () => {
      expect(isStructType('struct Token {')).to.be.false
    })

    it('isStructType should fail when test struct Token }', () => {
      expect(isStructType('struct Token }')).to.be.false
    })

    it('isStructType should fail when test struct Token{}', () => {
      expect(isStructType('struct Token{}')).to.be.false
    })

    it('isStructType should fail when test aa', () => {
      expect(isStructType('aa')).to.be.false
    })

    it('isStructType should fail when test int[3]', () => {
      expect(isStructType('int[3]')).to.be.false
    })

  })


  describe('isLibraryType()', () => {

    it('isLibraryType should succeeding when test library L {}', () => {
      expect(isLibraryType('library L {}')).to.be.true
    })

    it('isLibraryType should succeeding when test L<int>', () => {
      expect(isLibraryType('L<int>')).to.be.true
    })

    it('isLibraryType should succeeding when test L<K>', () => {
      expect(isLibraryType('L<K>')).to.be.true
    })

    it('isLibraryType should succeeding when test L<K,T>', () => {
      expect(isLibraryType('L<K,T>')).to.be.true
    })
  })



  describe('test compileContract', () => {

    describe('compileContract ackermann.scrypt', () => {
      let ackermann, result;

      before(() => {
        const Ackermann = buildContractClass(loadDescription('ackermann_desc.json'));
        ackermann = new Ackermann(2, 1);
      });

      it('should show stop ackermann.scrypt#38', () => {
        result = ackermann.unlock(15).verify()
        expect(result.error).to.contains("ackermann.scrypt#38");
      });
    });

    describe('compileContract ackermann.scrypt without sourcemap', () => {
      let ackermann, result;

      before(() => {
        const Ackermann = buildContractClass(compileContract(getContractFilePath('ackermann.scrypt'), {
          out: tmpdir(),
          sourceMap: false
        }));
        ackermann = new Ackermann(2, 1);
      });

      it('should not show stop ackermann.scrypt#38', () => {
        result = ackermann.unlock(15).verify()
        expect(result.error).to.not.contains("ackermann.scrypt#38");
      });

      it('should run success', () => {
        result = ackermann.unlock(5).verify()
        expect(result.success).to.be.true
      });
    });
  })


  describe('toLiteral() ', () => {

    it('toLiteral should returns right', () => {
      expect(toLiteral(new PrivKey("111111111111111111111111111111111111111111"))).to.be.equal("PrivKey(111111111111111111111111111111111111111111)");
      expect(toLiteral(new PrivKey("111111111111111111111111111111111111111111"))).to.be.equal("PrivKey(111111111111111111111111111111111111111111)");
      expect(toLiteral(new PrivKey("0x111111111111111111111111111111111111111111"))).to.be.equal("PrivKey(0x111111111111111111111111111111111111111111)");
      expect(toLiteral(new PrivKey(111111111111111111111111111111111111111111n))).to.be.equal("PrivKey(0x014686b59ab3939851acf5c2e071c71c71c7)");
      expect(toLiteral(new PrivKey(0x111111111111111111111111111111111111111111n))).to.be.equal("PrivKey(0x111111111111111111111111111111111111111111)");
      expect(toLiteral(new PrivKey(24942961277114076470676221145024563535461248733457n))).to.be.equal("PrivKey(0x111111111111111111111111111111111111111111)");
      expect(toLiteral(new PrivKey("24942961277114076470676221145024563535461248733457"))).to.be.equal("PrivKey(24942961277114076470676221145024563535461248733457)");

      expect(toLiteral(new Int("111111111111111111111111111111111111111111"))).to.be.equal("111111111111111111111111111111111111111111");
      expect(toLiteral(new Int("0x111111111111111111111111111111111111111111"))).to.be.equal("0x111111111111111111111111111111111111111111");
      expect(toLiteral(new Int(111111111111111111111111111111111111111111n))).to.be.equal("111111111111111111111111111111111111111111");
      expect(toLiteral(new Int(0x111111111111111111111111111111111111111111n))).to.be.equal("24942961277114076470676221145024563535461248733457");
      expect(toLiteral(new Int(24942961277114076470676221145024563535461248733457n))).to.be.equal("24942961277114076470676221145024563535461248733457");
      expect(toLiteral(new Int("24942961277114076470676221145024563535461248733457"))).to.be.equal("24942961277114076470676221145024563535461248733457");
      expect(toLiteral(new Int(1))).to.be.equal("1");
      expect(toLiteral(new Int(0))).to.be.equal("0");
    });


  })



  describe('flatternParams() ', () => {

    const Counter = buildContractClass(loadDescription('mixstate_desc.json'));

    const types = buildTypeClasses(loadDescription('mixstate_desc.json'));


    const Alias = buildContractClass(loadDescription('alias_desc.json'));



    it('flattern struct', () => {
      expect(flatternParams([{ name: 'a', type: 'StatesA' }], Counter.resolver).map(a => a.name).join(' ')).to.be.equal("a.states[0].counter a.states[0].done a.states[1].counter a.states[1].done a.hex");

      expect(flatternParams([{ name: 'a', type: 'States' }], Counter.resolver).map(a => a.name).join(' ')).to.be.equal("a.counter a.done");
    })


    it('flattern basic', () => {
      expect(flatternParams([{ name: 'a', type: 'int' }, { name: 'b', type: 'bool' }, { name: 'c', type: 'bytes' }], Counter.resolver).map(a => a.name).join(' '))
        .to.be.equal("a b c");

    })

    it('flattern array', () => {
      expect(flatternParams([{ name: 'a', type: 'int[1][3]' }, { name: 'b', type: 'bool' }, { name: 'c', type: 'bytes' }], Counter.resolver).map(a => a.name).join(' '))
        .to.be.equal("a[0][0] a[0][1] a[0][2] b c");

      expect(flatternParams([{ name: 'a', type: 'StatesA[2]' }, { name: 'b', type: 'bool' }, { name: 'c', type: 'bytes' }], Counter.resolver).map(a => a.name).join(' '))
        .to.be.equal("a[0].states[0].counter a[0].states[0].done a[0].states[1].counter a[0].states[1].done a[0].hex a[1].states[0].counter a[1].states[0].done a[1].states[1].counter a[1].states[1].done a[1].hex b c");
    })



    it('flattern alias', () => {


      expect(flatternParams([{ name: 'a', type: 'Female' }, { name: 'b', type: 'MaleB' }], Alias.resolver).map(a => a.name).join(' '))
        .to.be.equal("a.age a.name a.token b[0].age b[0].name b[0].token b[1].age b[1].name b[1].token b[2].age b[2].name b[2].token");

      expect(flatternParams([{ name: 'a', type: 'Tokens[2]' }], Alias.resolver).map(a => a.name).join(' '))
        .to.be.equal("a[0][0] a[0][1] a[0][2] a[1][0] a[1][1] a[1][2]");
    })


  })


  describe('flattenSha256() ', () => {

    it('flattern data', () => {


      expect(flattenSha256(1))
        .to.be.equal("4bf5122f344554c53bde2ebb8cd2b7e3d1600ad631c385a5d7cce23c7785459a");

      expect(flattenSha256(11111))
        .to.be.equal("5b915ddcebcd384637b13712bb52dc4deaa4b1ce2951aeb34ae61db66dfba9f9");

      expect(flattenSha256(new Bytes('')))
        .to.be.equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

      expect(flattenSha256(false))
        .to.be.equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
      expect(flattenSha256(0))
        .to.be.equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

      expect(flattenSha256(true))
        .to.be.equal("4bf5122f344554c53bde2ebb8cd2b7e3d1600ad631c385a5d7cce23c7785459a");

      expect(flattenSha256([1, 2, 3, 0]))
        .to.be.equal("8b6f70403ba37d5b70d867904b81fbe60056fed2a9e6e1bb21670e79381a6c10");
      expect(flattenSha256([new Int(1), new Int(2), new Int(3), new Int(0)]))
        .to.be.equal("8b6f70403ba37d5b70d867904b81fbe60056fed2a9e6e1bb21670e79381a6c10");

      const person = new Person({
        name: new Bytes('7361746f736869206e616b616d6f746f'),
        addr: new Bytes('6666'),
        isMale: true,
        age: 33,
        blk: new Block({
          time: 10000,
          hash: new Bytes('68656c6c6f20776f726c6421'),
          header: new Bytes('1156'),
        })
      });
      expect(flattenSha256(person))
        .to.be.equal("46fb1bc7b9494a2cd2ebac253782c0fdbe2a00a146417b8ab3503fdaa29209ef");

      expect(flattenSha256([person, person]))
        .to.be.equal("3a51045a7c808a07675b298a383e6d2dbf1c26416b53443dee0941ea4eddca45");
    })

  })




  describe('findKeyIndex() ', () => {

    it('findKeyIndex data', () => {

      const map = new Map<number, number>();

      map.set(1, 33);
      map.set(99, 55);
      map.set(5, 77);
      map.set(78765, 77);
      map.set(66, 77);
      map.set(42, 77);
      map.set(546, 77);
      expect(findKeyIndex(map, 66))
        .to.be.equal(5);

      expect(findKeyIndex(map, 546))
        .to.be.equal(6);

      expect(findKeyIndex(map, 11111))
        .to.be.equal(-1);

    })

  })


  describe('isGenericType() ', () => {

    it('isGenericType', () => {

      expect(isGenericType("AA<D>"))
        .to.be.true;
      expect(isGenericType("AA<D, a>"))
        .to.be.true;

      expect(isGenericType("A<Da, da>"))
        .to.be.true;

    })

    it('parseGenericType', () => {

      expect(parseGenericType("HashedMap<int, int>"))
        .to.deep.eq(["HashedMap", ["int", "int"]]);


      expect(parseGenericType("HashedMap<int, bytes>"))
        .to.deep.eq(["HashedMap", ["int", "bytes"]]);


      expect(parseGenericType("Mylib< int, bool >"))
        .to.deep.eq(["Mylib", ["int", "bool"]]);

      expect(parseGenericType("LL<int, struct ST1 {}>"))
        .to.deep.eq(["LL", ["int", "struct ST1 {}"]]);


      //dont allow space
      expect(() => parseGenericType("Mylib <int, bool>"))
        .to.throw('"Mylib <int, bool>" is not generic type')
    })

    it('isGenericType', () => {

      expect(isGenericType("HashedMap<int, int>"))
        .to.be.true

      expect(isGenericType("HashedMap<ST, int[3][3]>"))
        .to.be.true

      expect(isGenericType("HashedMap<ST[3], int[3][3]>"))
        .to.be.true

      expect(isGenericType("HashedMap<ST[3], int[3][3]"))
        .to.be.false

      expect(isGenericType("HashedMap<ST[3], )int[3][3]>"))
        .to.be.false
    })


    it('test hash256', () => {
      // bytes s = hash256(b'01');
      expect(hash256("01"))
        .to.be.eq("9c12cfdc04c74584d787ac3d23772132c18524bc7ab28dec4219b8fc5b425f70")
    })

    it('test sha256', () => {
      // bytes s = hash256(b'01');
      expect(sha256("01"))
        .to.be.eq("4bf5122f344554c53bde2ebb8cd2b7e3d1600ad631c385a5d7cce23c7785459a")
    })

    it('test hash160', () => {
      //bytes s = hash160(b'01');
      expect(hash160("01"))
        .to.be.eq("c51b66bced5e4491001bd702669770dccf440982")
    })


    it('test buildOpreturnScript', () => {

      expect(buildOpreturnScript("0011").toHex())
        .to.be.eq("006a020011")

      expect(buildOpreturnScript("").toHex())
        .to.be.eq("006a00")
    })

    it('test buildPublicKeyHashScript', () => {

      expect(buildPublicKeyHashScript(new Ripemd160("e1c396944f470d717e6041b0bfb95378d22110ce")).toHex())
        .to.be.eq("76a914e1c396944f470d717e6041b0bfb95378d22110ce88ac")

    })

  })

  describe('inferrTypes() ', () => {
    it('test inferrTypes', () => {


      expect(inferrType(1))
        .to.eq("int");

      expect(inferrType(true))
        .to.eq("bool");

      expect(inferrType("11"))
        .to.eq("int");

      expect(inferrType(new Bytes("")))
        .to.eq("bytes");

      expect(inferrType(new Block({
        time: 10000,
        hash: new Bytes('68656c6c6f20776f726c6421'),
        header: new Bytes('1156'),
      })))
        .to.eq("struct Block {}");

      expect(inferrType([new Block({
        time: 10000,
        hash: new Bytes('68656c6c6f20776f726c6421'),
        header: new Bytes('1156'),
      })]))
        .to.eq("struct Block {}[1]");

      expect(inferrType([[1, 2, 3], [1, 3, 3]]))
        .to.eq("int[2][3]");


      expect(inferrType([[[1, 2, 3], [1, 3, 3]], [[1, 2, 3], [1, 3, 3]]]))
        .to.eq("int[2][2][3]");

      expect(inferrType([[[1, 2, 3], [1, 3, 3]], [[1, 2, 3], [1, 3, 3]]]))
        .to.eq("int[2][2][3]");

      expect(() => inferrType([1, true])).to.throw('cannot inferr type from [1,true] , not all element types are the same')

      expect(() => inferrType([[1, 3], [1]])).to.throw('cannot inferr type from [1,3,1] , not all length of element are the same')

    })
  });



  describe('parseAbiFromUnlockingScript() ', () => {

    it('test parseAbiFromUnlockingScript when contract only have one public function', () => {

      const privateKey = new bsv.PrivateKey.fromRandom('testnet');
      const publicKey = privateKey.publicKey;
      const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
      const inputSatoshis = 100000;
      const jsonDescr = loadDescription('p2pkh_desc.json');
      const DemoP2PKH = buildContractClass(jsonDescr);
      const p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));
      const tx = newTx(inputSatoshis);
      const sig = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis);
      let pubkey: PubKey = new PubKey(toHex(publicKey));

      const fn = p2pkh.unlock(sig, pubkey) as FunctionCall;

      expect(parseAbiFromUnlockingScript(p2pkh, fn.toHex()))
        .to.deep.eq({
          type: 'function',
          name: 'unlock',
          index: 0,
          params: [{ name: 'sig', type: 'Sig' }, { name: 'pubKey', type: 'PubKey' }]
        })

    })


    it('test parseAbiFromUnlockingScript when contract only have multiple public function', () => {

      const jsonDescr = loadDescription('mdarray_desc.json');
      const MDArray = buildContractClass(jsonDescr);

      let mdArray = new MDArray([[
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [999999999999999999999999999999n, 10, 11, 12]
      ],
      [
        [13, 14, 15, 16],
        [17, 18, 19, 20],
        [21, 22, 23, 11111111111111111111111111111111111n]
      ]]);

      const fn = mdArray.unlockX([[
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        ["999999999999999999999999999999", 10, 11, 12]
      ],
      [
        [13, 14, 15, 16],
        [17, 18, 19, 20],
        [21, 22, 23, "11111111111111111111111111111111111"]
      ]]) as FunctionCall;


      expect(parseAbiFromUnlockingScript(mdArray, fn.toHex()))
        .to.deep.eq({
          type: 'function',
          name: 'unlockX',
          index: 4,
          params: [{ name: 'x', type: 'int[2][3][4]' }]
        })

    })
  })
})
