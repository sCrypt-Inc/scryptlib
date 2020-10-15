import { expect } from 'chai'
import { num2bin, pack, unpack, bin2num, bsv } from '../src/utils'

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

    it('should raise error if the number can not fit in certain bytes length', () => {
      expect(() => num2bin(128, 1)).to.throw('128 cannot fit in 1 byte[s]')
      expect(() => num2bin(0xffff, 2)).to.throw('65535 cannot fit in 2 byte[s]')
    })
  })

  describe('bin2num()', () => {
    it('bin2num', () => {
      expect(bin2num('00')).to.equal(0)
      expect(bin2num('0a')).to.equal(10)
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
  
  describe('pack() & unpack()', () => {
    it('BigInt', () => {
      //2 ** 53 - 1 is max number in Javascript
      let bn = new BN(2 ** 53 - 1)
      const bnOne = new BN(1)
      const bnHundred = new BN(1)
      bn = bn.add(bnOne)
      expect(pack(bn, 8)).to.equal('0000000000002000')
      expect(unpack('0000000000002000').toString()).to.equal(bn.toString())
      bn = bn.add(bnHundred)
      expect(pack(bn, 8)).to.equal('0100000000002000')
      expect(unpack('0100000000002000').toString()).to.equal(bn.toString())
      //negative bigint
      bn = bn.neg()
      expect(pack(bn, 8)).to.equal('0100000000002080')
      expect(unpack('0100000000002080').toString()).to.equal(bn.toString())
    })

    it('HexInt', () => {
      let bn = new BN('010000000000200001', 16, 'le')
      expect(pack(bn, 9)).to.equal('010000000000200001')
      expect(unpack('010000000000200001').toString()).to.equal(bn.toString())
    })

    it('UInt256', () => {
      let bn = new BN(
        '0100000000002000010000000000200001000000000020000100000000002000',
        16,
        'le'
      )
      expect(pack(bn, 32)).to.equal(
        '0100000000002000010000000000200001000000000020000100000000002000'
      )
      expect(
        unpack(
          '0100000000002000010000000000200001000000000020000100000000002000'
        ).toString()
      ).to.equal(bn.toString())
    })
  })

})
