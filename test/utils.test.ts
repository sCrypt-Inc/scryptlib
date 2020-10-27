import { expect } from 'chai'
import { num2bin, bin2num, bsv } from '../src/utils'

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

})
