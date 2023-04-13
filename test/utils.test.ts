import { expect } from 'chai'
import { buildContractClass } from '../src/contract';
import { Int, Bool, Bytes, PrivKey, Ripemd160, PubKey, SymbolType, TypeResolver, Sig } from '../src/scryptTypes'
import {
  num2bin, bin2num, bsv, int2Asm, arrayTypeAndSize,
  parseGenericType,
  isArrayType, compileContract,
  isGenericType, sha256, hash256, hash160,
  buildOpreturnScript, buildPublicKeyHashScript, toHex, signTx, parseAbiFromUnlockingScript,

} from '../src'
import { getContractFilePath, getRandomInt, loadArtifact, newTx } from './helper';
import { tmpdir } from 'os'
import { FunctionCall } from '../src/abi';
import { checkSupportedParamType } from '../src/typeCheck';
import { and, invert, or, parseLiteral, subscript, xor } from '../src/internal';

const BN = bsv.crypto.BN

describe('utils', () => {
  describe('num2bin()', () => {
    it('should return searialized format of the number with certain bytes length', () => {
      expect(num2bin(0n, 1)).to.equal('00')
      expect(num2bin(10n, 1)).to.equal('0a')
      expect(num2bin(0x123n, 2)).to.equal('2301')
      expect(num2bin(0x123456789abcden, 7)).to.equal('debc9a78563412')
      expect(num2bin(-1000n, 2)).to.equal('e883')

      // padded
      expect(num2bin(0n, 3)).to.equal('000000')
      expect(num2bin(1n, 2)).to.equal('0100')
      expect(num2bin(0x123456789abcden, 10)).to.equal('debc9a78563412000000')
      expect(num2bin(-1000n, 4)).to.equal('e8030080')
      expect(num2bin(-123456789n, 8)).to.equal('15cd5b0700000080')
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
      expect(() => num2bin(128n, 1)).to.throw('128 cannot fit in 1 byte[s]')
      expect(() => num2bin(0xffffn, 2)).to.throw('65535 cannot fit in 2 byte[s]')
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
      expect(bin2num('0000000000002000').toString()).to.equal(bn.toString())
      bn = bn + bnHundred
      expect(num2bin(bn, 8)).to.equal('6400000000002000')
      expect(bin2num('6400000000002000').toString()).to.equal(bn.toString())
      //negative bigint
      bn = -bn
      expect(num2bin(bn, 8)).to.equal('6400000000002080')
      expect(bin2num('6400000000002080').toString()).to.equal(bn.toString())
    })

    it('support BN.js type', () => {
      // max number in Javascript
      let bn = new BN(Number.MAX_SAFE_INTEGER)
      const bnOne = new BN(1)
      const bnHundred = new BN(100)
      bn = bn.add(bnOne)
      expect(num2bin(BigInt(bn.toString()), 8)).to.equal('0000000000002000')
      expect(bin2num('0000000000002000').toString()).to.equal(bn.toString())
      bn = bn.add(bnHundred)
      expect(num2bin(BigInt(bn.toString()), 8)).to.equal('6400000000002000')
      expect(bin2num('6400000000002000').toString()).to.equal(bn.toString())
      //negative bigint
      bn = bn.neg()
      expect(num2bin(BigInt(bn.toString()), 8)).to.equal('6400000000002080')
      expect(bin2num('6400000000002080').toString()).to.equal(bn.toString())
    })

    it('HexInt with 9bytes', () => {
      const bn = new BN('010000000000200001', 16, 'le')
      expect(num2bin(BigInt(bn.toString()), 9)).to.equal('010000000000200001')
      expect(bin2num('010000000000200001').toString()).to.equal(bn.toString())
    })

    it('UInt256 with 32ytes', () => {
      const bn = new BN(
        '0100000000002000010000000000200001000000000020000100000000002000',
        16,
        'le'
      )
      expect(num2bin(BigInt(bn.toString()), 32)).to.equal(
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
      expect(num2bin(BigInt(bn.toString()), 9)).to.equal('010000000000200001')
      const buffer = bn.toBuffer({ endian: 'little', size: 9 })
      expect(bin2num(buffer.toString('hex')).toString()).to.equal(bn.toString())
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



  describe('parseLiteral()', () => {

    it('parser Literal string', () => {

      expect(parseLiteral("b''")).to.have.members(["", "bytes"]);
      expect(parseLiteral("b'62f0245bb9'")).to.have.members(["62f0245bb9", "bytes"]);
      expect(parseLiteral("PrivKey(1)")).to.have.members([1n, "PrivKey"]);
      expect(parseLiteral("PrivKey(16)")).to.have.members([16n, "PrivKey"]);
      expect(parseLiteral("PrivKey(0)")).to.have.members([0n, "PrivKey"]);
      expect(parseLiteral("PrivKey(0x3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062)")).to.have.members([
        0x3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062n,
        "PrivKey"
      ]);
      expect(parseLiteral("PubKey(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')")).to.have.members([
        "3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062",
        "PubKey"
      ]);
      expect(parseLiteral("Sig(b'3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062')")).to.have.members([
        "3847f126769a6c65d281d925f9ff990f431d19c8c314f9180def0ab95b24f062",
        "Sig"]);
      expect(parseLiteral("Ripemd160(b'3847f126769a6c65d281d925f9ff99')")).to.have.members([
        "3847f126769a6c65d281d925f9ff99", "Ripemd160"]);
      expect(parseLiteral("Sha1(b'3847f126769a6c65d281d925f9ff99')")).to.have.members([
        "3847f126769a6c65d281d925f9ff99", "Sha1"]);
      expect(parseLiteral("Sha256(b'3847f126769a6c65d281d925f9ff99')")).to.have.members([
        "3847f126769a6c65d281d925f9ff99", "Sha256"]);
      expect(parseLiteral("SigHashType(b'01')")).to.have.members(["01", "SigHashType"]);
      expect(parseLiteral("SigHashType(b'02')")).to.have.members(["02", "SigHashType"]);
      expect(parseLiteral("SigHashType(b'03')")).to.have.members(["03", "SigHashType"]);
      expect(parseLiteral("SigHashType(b'40')")).to.have.members(["40", "SigHashType"]);
      expect(parseLiteral("SigHashType(b'80')")).to.have.members(["80", "SigHashType"]);
      expect(parseLiteral("SigHashPreimage(b'3847f126769a6c65d281d925f9ff99')")).to.have.members([
        "3847f126769a6c65d281d925f9ff99", "SigHashPreimage"]);
      expect(parseLiteral("OpCodeType(b'01')")).to.have.members(["01", "OpCodeType"]);
      expect(parseLiteral("b'01'")).to.have.members(["01", "bytes"]);
      expect(parseLiteral("b'03'")).to.have.members(["03", "bytes"]);
      expect(parseLiteral("b'00'")).to.have.members(["00", "bytes"]);
      expect(parseLiteral("b'10'")).to.have.members(["10", "bytes"]);
      expect(parseLiteral("b'11'")).to.have.members(["11", "bytes"]);
      expect(parseLiteral("b'0001'")).to.have.members(["0001", "bytes"]);
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

      const [elemTypeName, arraySize] = arrayTypeAndSize("L<ST,int[3]>[3][2]");
      expect(elemTypeName).to.equal('L<ST,int[3]>')
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

    let resolver: TypeResolver = (type: string) => ({ symbolType: SymbolType.ScryptType, finalType: type, generic: false })
    it('checkArray int[3]', () => {
      expect(checkSupportedParamType([3n, 3n, 3n], {
        name: "a",
        type: 'int[3]',
      }, resolver)).to.undefined;
    })

    it('checkArray int[3]', () => {
      expect(checkSupportedParamType([3n, 3n], {
        name: "a",
        type: 'int[3]'
      }, resolver)).to.not.undefined
    })

    it('checkArray int[3]', () => {
      expect(checkSupportedParamType([3n, 3n, 1n, 3n], {
        name: "a",
        type: 'int[3]'
      }, resolver)).to.not.undefined
    })

    it('checkArray int[3]', () => {
      expect(checkSupportedParamType([3n, 3n, Int(2)], {
        name: "a",
        type: 'int[3]'
      }, resolver)).to.undefined;
    })

    it('checkArray int[3]', () => {
      expect(checkSupportedParamType([3n, 3n, Bool(true)], {
        name: "a",
        type: 'int[3]'
      }, resolver)).to.not.undefined
    })


    it('checkArray int[2][3]', () => {
      expect(checkSupportedParamType([[3n, 3n, 3n], [3n, 12n, 3n]], {
        name: "a",
        type: 'int[2][3]'
      }, resolver)).to.undefined;
    })

    it('checkArray int[2][3]', () => {
      expect(checkSupportedParamType([[3n, 3n, 3n], [3n, 12n, 3n], [1n, 1n, 1n]], {
        name: "a",
        type: 'int[2][3]'
      }, resolver)).to.not.undefined
    })

    it('checkArray int[2][3]', () => {
      expect(checkSupportedParamType([[3n, 3n, 3n], [3n, 12n]], {
        name: "a",
        type: 'int[2][3]'
      }, resolver)).to.not.undefined
    })

    it('checkArray int[2][1][3]', () => {
      expect(checkSupportedParamType([[[3n, 3n, 3n]], [[3n, 12n, 3n]]], {
        name: "a",
        type: 'int[2][1][3]'
      }, resolver)).to.undefined;
    })

    it('checkArray int[2][1][3]', () => {
      expect(checkSupportedParamType([[[3n, 3n, 3n], 1n], [[3n, 12n, 3n]]], {
        name: "a",
        type: 'int[2][1][3]'
      }, resolver)).to.not.undefined
    })


    it('checkArray int[2][2][3]', () => {
      expect(checkSupportedParamType([[[3n, 3n, 3n], [3n, 3n, 3n]], [[3n, 12n, 3n], [3n, 3n, 3n]]], {
        name: "a",
        type: 'int[2][2][3]'
      }, resolver)).to.undefined;
    })


    it('checkArray int[2][2][3]', () => {
      expect(checkSupportedParamType([[[3n, 3n, 3n], [3n, 3n, 3n]], [[3n, 12n, 3n], [3n, 3n, 3n]]], {
        name: "a",
        type: 'int[2][2][3]'
      }, resolver)).to.undefined;
    })


    it('checkArray int[2][3][4]', () => {
      expect(checkSupportedParamType([[
        [1n, 2n, 3n, 4n],
        [5n, 6n, 7n, 8n],
        [9n, 10n, 11n, 12n]
      ],
      [
        [13n, 14n, 15n, 16n],
        [17n, 18n, 19n, 20n],
        [21n, 22n, 23n, 24n]
      ]], {
        name: "a",
        type: 'int[2][3][4]'
      }, resolver)).to.undefined;
    })

    it('checkArray int[2][3][4]', () => {
      expect(checkSupportedParamType([[1n, 3n, 5n], [2n, 4n, 6n]], {
        name: "a",
        type: 'int[2][3][4]'
      }, resolver)).to.not.undefined
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

    it('isArrayType should succeeding when test Token[3]', () => {
      expect(isArrayType('Token[3]')).to.be.true
    })

    it('isArrayType should succeeding when test L<int, bool>[3]', () => {
      expect(isArrayType('L<int, bool>[3]')).to.be.true
    })

    it('isArrayType should succeeding when test L<ST, int[3]>[3]', () => {
      expect(isArrayType('L<ST, int[3]>[3]')).to.be.true
    })


    it('isArrayType should fail when test bytes[1][2][1', () => {
      expect(isArrayType('int[1][2][1')).to.be.false
    })

    it('isArrayType should success when start with space', () => {
      expect(isArrayType(' int[1][2][1]')).to.be.true
    })

    it('isArrayType should fail when start with aa', () => {
      expect(isArrayType('aa')).to.be.false
    })

  })

  describe('test compileContract', () => {

    describe('compileContract ackermann.scrypt', () => {
      let ackermann, result;

      before(() => {
        const Ackermann = buildContractClass(loadArtifact('ackermann.json'));
        ackermann = new Ackermann(2n, 1n);
      });

      it('should show stop ackermann.scrypt#38', () => {
        result = ackermann.unlock(15n).verify()
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
        ackermann = new Ackermann(2n, 1n);
      });

      it('should not show stop ackermann.scrypt#38', () => {
        result = ackermann.unlock(15n).verify()
        expect(result.error).to.not.contains("ackermann.scrypt#38");
      });

      it('should run success', () => {
        result = ackermann.unlock(5n).verify()
        expect(result.success).to.be.true
      });
    });
  })


  describe('Literal', () => {

    it('Literal should returns right', () => {
      expect(PrivKey(111111111111111111111111111111111111111111n)).to.be.equal(111111111111111111111111111111111111111111n);

    });


  })



  describe('flatternParams() ', () => {

    const Counter = buildContractClass(loadArtifact('mixstate.json'));

    const Alias = buildContractClass(loadArtifact('alias.json'));



    // it('flattern struct', () => {
    //   expect(flatternParams([{ name: 'a', type: 'StatesA' }], Counter.resolver).map(a => a.name).join(' ')).to.be.equal("a.states[0].counter a.states[0].done a.states[1].counter a.states[1].done a.hex");

    //   expect(flatternParams([{ name: 'a', type: 'States' }], Counter.resolver).map(a => a.name).join(' ')).to.be.equal("a.counter a.done");
    // })


    // it('flattern basic', () => {
    //   expect(flatternParams([{ name: 'a', type: 'int' }, { name: 'b', type: 'bool' }, { name: 'c', type: 'bytes' }], Counter.resolver).map(a => a.name).join(' '))
    //     .to.be.equal("a b c");

    // })

    // it('flattern array', () => {
    //   expect(flatternParams([{ name: 'a', type: 'int[1][3]' }, { name: 'b', type: 'bool' }, { name: 'c', type: 'bytes' }], Counter.resolver).map(a => a.name).join(' '))
    //     .to.be.equal("a[0][0] a[0][1] a[0][2] b c");

    //   expect(flatternParams([{ name: 'a', type: 'StatesA[2]' }, { name: 'b', type: 'bool' }, { name: 'c', type: 'bytes' }], Counter.resolver).map(a => a.name).join(' '))
    //     .to.be.equal("a[0].states[0].counter a[0].states[0].done a[0].states[1].counter a[0].states[1].done a[0].hex a[1].states[0].counter a[1].states[0].done a[1].states[1].counter a[1].states[1].done a[1].hex b c");
    // })



    // it('flattern alias', () => {


    //   expect(flatternParams([{ name: 'a', type: 'Female' }, { name: 'b', type: 'MaleB' }], Alias.resolver).map(a => a.name).join(' '))
    //     .to.be.equal("a.age a.name a.token b[0].age b[0].name b[0].token b[1].age b[1].name b[1].token b[2].age b[2].name b[2].token");

    //   expect(flatternParams([{ name: 'a', type: 'Tokens[2]' }], Alias.resolver).map(a => a.name).join(' '))
    //     .to.be.equal("a[0][0] a[0][1] a[0][2] a[1][0] a[1][1] a[1][2]");
    // })


  })


  // describe('flattenSha256() ', () => {

  //   it('flattern data', () => {


  //     expect(flattenSha256(1))
  //       .to.be.equal("4bf5122f344554c53bde2ebb8cd2b7e3d1600ad631c385a5d7cce23c7785459a");

  //     expect(flattenSha256(11111))
  //       .to.be.equal("5b915ddcebcd384637b13712bb52dc4deaa4b1ce2951aeb34ae61db66dfba9f9");

  //     expect(flattenSha256(new Bytes('')))
  //       .to.be.equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

  //     expect(flattenSha256(false))
  //       .to.be.equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  //     expect(flattenSha256(0))
  //       .to.be.equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

  //     expect(flattenSha256(true))
  //       .to.be.equal("4bf5122f344554c53bde2ebb8cd2b7e3d1600ad631c385a5d7cce23c7785459a");

  //     expect(flattenSha256([1, 2, 3, 0]))
  //       .to.be.equal("8b6f70403ba37d5b70d867904b81fbe60056fed2a9e6e1bb21670e79381a6c10");
  //     expect(flattenSha256([new Int(1), new Int(2), new Int(3), new Int(0)]))
  //       .to.be.equal("8b6f70403ba37d5b70d867904b81fbe60056fed2a9e6e1bb21670e79381a6c10");

  //     const person = new Person({
  //       name: new Bytes('7361746f736869206e616b616d6f746f'),
  //       addr: new Bytes('6666'),
  //       isMale: true,
  //       age: 33,
  //       blk: new Block({
  //         time: 10000,
  //         hash: new Bytes('68656c6c6f20776f726c6421'),
  //         header: new Bytes('1156'),
  //       })
  //     });
  //     expect(flattenSha256(person))
  //       .to.be.equal("46fb1bc7b9494a2cd2ebac253782c0fdbe2a00a146417b8ab3503fdaa29209ef");

  //     expect(flattenSha256([person, person]))
  //       .to.be.equal("3a51045a7c808a07675b298a383e6d2dbf1c26416b53443dee0941ea4eddca45");

  //     let map = new Map<number, any>();

  //     map.set(22, new Bytes("f1"))
  //     map.set(3, new Bytes("99"))
  //     map.set(1234, new Bytes("f1ff"))

  //     expect(toData(map).toHex())
  //       .to.be.equal("4cc0084fed08b978af4d7d196a7446a86b58009e636b611db16211b65a9aadff29c5fd9528b920d6d3956e9e16114523e1889c751e8c1e040182116d4c906b43f5587cb7c4547cf2653590d7a9ace60cc623d25148adfbc88a89aeb0ef88da7839bad4f09e5c5af99a24c7e304ca7997d26cb00901697de08a49be0d46ab5839b614806505393e046db3163e748c7c7ee1763d242f1f7815a0aaa32c211916df6f0438999152af10c421ddd26ea0baa3ad39ac02d45108d0bd2a6689321273293632");


  //   })

  // })



  // describe('findKeyIndex() ', () => {

  //   it('findKeyIndex data', () => {

  //     const map = new Map<number, number>();

  //     map.set(1, 33);
  //     map.set(99, 55);
  //     map.set(5, 77);
  //     map.set(78765, 77);
  //     map.set(66, 77);
  //     map.set(42, 77);
  //     map.set(546, 77);
  //     expect(findKeyIndex(map, 66))
  //       .to.be.equal(5);

  //     expect(findKeyIndex(map, 546))
  //       .to.be.equal(6);

  //     expect(findKeyIndex(map, 11111))
  //       .to.be.equal(-1);

  //   })

  // })


  describe('isGenericType() ', () => {

    it('isGenericType', () => {

      expect(isGenericType("AA<D>"))
        .to.be.true;
      expect(isGenericType("AA<D, a>"))
        .to.be.true;

      expect(isGenericType("A<Da, da>"))
        .to.be.true;

      expect(isGenericType("ST1<ST0<int>>"))
        .to.be.true;


      expect(isGenericType("ST1<ST0<int>[3],ST0<int, [3]>[3]>"))
        .to.be.true;

    })

    it('parseGenericType', () => {

      expect(parseGenericType("HashedMap<int, int>"))
        .to.deep.eq(["HashedMap", ["int", "int"]]);


      expect(parseGenericType("HashedMap<int, bytes>"))
        .to.deep.eq(["HashedMap", ["int", "bytes"]]);


      expect(parseGenericType("Mylib< int, bool >"))
        .to.deep.eq(["Mylib", ["int", "bool"]]);

      expect(parseGenericType("LL<int, ST1>"))
        .to.deep.eq(["LL", ["int", "ST1"]]);

      expect(parseGenericType("ST0<ST0<int,int>,int>"))
        .to.deep.eq(["ST0", ["ST0<int,int>", "int"]]);


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

      expect(buildPublicKeyHashScript(Ripemd160("e1c396944f470d717e6041b0bfb95378d22110ce")).toHex())
        .to.be.eq("76a914e1c396944f470d717e6041b0bfb95378d22110ce88ac")

    })

  })




  describe('parseAbiFromUnlockingScript() ', () => {

    it('test parseAbiFromUnlockingScript when contract only have one public function', () => {

      const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet);
      const publicKey = privateKey.publicKey;
      const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
      const inputSatoshis = 100000;
      const jsonArtifact = loadArtifact('p2pkh.json');
      const DemoP2PKH = buildContractClass(jsonArtifact);
      const p2pkh = new DemoP2PKH(Ripemd160(toHex(pubKeyHash)));
      const tx = newTx(inputSatoshis);
      const sig = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis);
      let pubkey: PubKey = PubKey(toHex(publicKey));

      const fn = p2pkh.unlock(Sig(sig), pubkey) as FunctionCall;

      expect(parseAbiFromUnlockingScript(p2pkh, fn.toHex()))
        .to.deep.eq({
          type: 'function',
          name: 'unlock',
          index: 0,
          params: [{ name: 'sig', type: 'Sig' }, { name: 'pubKey', type: 'PubKey' }]
        })

    })


    it('test parseAbiFromUnlockingScript when contract only have multiple public function', () => {

      const jsonArtifact = loadArtifact('mdarray.json');
      const MDArray = buildContractClass(jsonArtifact);

      let mdArray = new MDArray([[
        [1n, 2n, 3n, 4n],
        [5n, 6n, 7n, 8n],
        [999999999999999999999999999999n, 10n, 11n, 12n]
      ],
      [
        [13n, 14n, 15n, 16n],
        [17n, 18n, 19n, 20n],
        [21n, 22n, 23n, 11111111111111111111111111111111111n]
      ]]);

      const fn = mdArray.unlockX([[
        [1n, 2n, 3n, 4n],
        [5n, 6n, 7n, 8n],
        [999999999999999999999999999999n, 10n, 11n, 12n]
      ],
      [
        [13n, 14n, 15n, 16n],
        [17n, 18n, 19n, 20n],
        [21n, 22n, 23n, 11111111111111111111111111111111111n]
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

  describe('bitwise', () => {
    let bitwise
    before(() => {
      const jsonArtifact = loadArtifact('intbitwise.json')
      const Intbitwise = buildContractClass(jsonArtifact)
      bitwise = new Intbitwise()
    })


    it('should succeed', () => {
      // &
      expect(and(Int(0), Int(0)))
        .to.eq(0n);

      expect(and(Int(1), Int(0)))
        .to.eq(0n);

      expect(and(Int(1), Int(1)))
        .to.eq(1n);

      expect(and(Int(-1), Int(-1)))
        .to.eq(-1n);

      expect(and(Int(-1), Int(1)))
        .to.eq(1n);

      // |
      expect(or(Int(0), Int(0)))
        .to.eq(0n);

      expect(or(Int(1), Int(0)))
        .to.eq(1n);

      expect(or(Int(1), Int(1)))
        .to.eq(1n);

      expect(or(Int(-1), Int(-1)))
        .to.eq(-1n);

      expect(or(Int(-1), Int(1)))
        .to.eq(-1n);

      // ^

      expect(xor(Int(0), Int(0)))
        .to.eq(0n);

      expect(xor(Int(1), Int(0)))
        .to.eq(1n);

      expect(xor(Int(1), Int(1)))
        .to.eq(0n);

      expect(xor(Int(-1), Int(-1)))
        .to.eq(0n);

      expect(xor(Int(-1), Int(1)))
        .to.eq(0n);

      // ~


      expect(invert(Int(-2142284617)))
        .to.eq(5199030n);

      expect(invert(Int(0)))
        .to.eq(0n);

      expect(invert(Int(1)))
        .to.eq(-126n);

      expect(invert(Int(-1)))
        .to.eq(126n);

      expect(invert(Int(-2)))
        .to.eq(125n);

      expect(invert(Int(2)))
        .to.eq(-125n);





      let bigL = Int(12394723457348573489578978964n);
      let bigR = Int(2345243523456256345623456n);
      let bigV = Int(758103938891062806383232n);
      expect(and(bigL, bigR))
        .to.eq(bigV);

      expect(bitwise.and(bigL, bigR, and(bigL, bigR)).verify().success).to.be.true

      expect(bitwise.or(bigL, bigR, or(bigL, bigR)).verify().success).to.be.true

      expect(bitwise.xor(bigL, bigR, xor(bigL, bigR)).verify().success).to.be.true

      expect(bitwise.invert(bigL, invert(bigL)).verify().success).to.be.true
      expect(bitwise.invert(bigR, invert(bigR)).verify().success).to.be.true
      let counter = 100;

      while (--counter > 0) {
        let l = Int(getRandomInt(-100000000000, 100000000000));
        let r = Int(getRandomInt(-100000000000, 100000000000));
        let result = bitwise.and(l, r, and(l, r)).verify();
        expect(result.success, result.error).to.be.true


        result = bitwise.or(l, r, or(l, r)).verify();
        expect(result.success, result.error).to.be.true


        result = bitwise.xor(l, r, xor(l, r)).verify();
        expect(result.success, result.error).to.be.true

        result = bitwise.invert(l, invert(l)).verify();
        expect(result.success, result.error).to.be.true

        result = bitwise.invert(r, invert(r)).verify();
        expect(result.success, result.error).to.be.true
      }

    })
  })
})
