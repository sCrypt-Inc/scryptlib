import { expect } from 'chai'
import { num2bin, bin2num, bsv } from '../src/utils'
import { serializeState } from '../src/serializer'

const BN = bsv.crypto.BN
const Script = bsv.Script

describe('serializer', () => {
  describe('BSV Script()', () => {
    it('zero', () => {
      const script = Script.fromASM('0')
      const hex = script.toHex()
      expect(hex).to.equal('00')
    })

    it('double zero', () => {
      const script = Script.fromASM('00')
      const hex = script.toHex()
      expect(hex).to.equal('0100')
    })

    it('-1', () => {
      const script = Script.fromASM('-1')
      const hex = script.toHex()
      expect(hex).to.equal('4f')
    })

    it('false', () => {
      const script = Script.fromASM('OP_FALSE')
      const hex = script.toHex()
      expect(hex).to.equal('00')
    })

    it('true', () => {
      const script = Script.fromASM('OP_TRUE')
      const hex = script.toHex()
      expect(hex).to.equal('51')
    })
  })

  describe('serializeState()', () => {
    it('object type', () => {
      const state = { counter: 11, bytes: '1234', flag: true }
      const serial = serializeState(state)
      const script = Script.fromASM(serial)
      const hex = script.toHex()

      expect(serial).to.equal('0b 1234 OP_1 0600')
      expect(hex).to.equal('010b02123451020600')
    })

    it('array type', () => {
      const state = [11, '1234', false]
      const serial = serializeState(state)
      const script = Script.fromASM(serial)
      const hex = script.toHex()

      expect(serial).to.equal('0b 1234 0 0600')
      expect(hex).to.equal('010b02123400020600')
    })

    it('special number', () => {
      const state = [0, -1, 1, 11, '1234', true]
      const serial = serializeState(state)
      const script = Script.fromASM(serial)
      const hex = script.toHex()

      expect(serial).to.equal('00 81 01 0b 1234 OP_1 0c00')
      expect(hex).to.equal('010001810101010b02123451020c00')
    })

    it('special string', () => {
      const state = ['0', '-1', '1', '11', '1234', true]
      const serial = serializeState(state)
      const script = Script.fromASM(serial)
      const hex = script.toHex()

      expect(serial).to.equal('0 -1 11 1234 OP_1 0900')
      expect(hex).to.equal('004f011102123451020900')
    })

    it('negative number', () => {
      const state = [-100]
      const serial = serializeState(state)
      const script = Script.fromASM(serial)
      const hex = script.toHex()

      expect(serial).to.equal('e4 0200')
      expect(hex).to.equal('01e4020200')
    })

    it('bool', () => {
      const state = [true, false]
      const serial = serializeState(state)
      const script = Script.fromASM(serial)
      const hex = script.toHex()

      expect(serial).to.equal('OP_1 0 0200')
      expect(hex).to.equal('5100020200')
    })

    it('bigint', () => {
      const state = [0n, 0x0an, 0x123n, 0x123456789abcden, -1000n]
      const serial = serializeState(state)
      const script = Script.fromASM(serial)
      const hex = script.toHex()

      expect(serial).to.equal('00 0a 2301 debc9a78563412 e883 1200')
      expect(hex).to.equal('0100010a02230107debc9a7856341202e883021200')
    })

    it('pushdata 0', () => {
      const state = ['FF'.repeat(75)]
      const serial = serializeState(state)
      const script = Script.fromASM(serial)
      const hex = script.toHex()

      expect(serial).to.equal('ff'.repeat(75) + ' 4c00')
      expect(hex).to.equal('4b' + 'ff'.repeat(75) + '024c00')
    })

    it('pushdata 1', () => {
      const state = ['FF'.repeat(76)]
      const serial = serializeState(state)
      const script = Script.fromASM(serial)
      const hex = script.toHex()

      expect(serial).to.equal('ff'.repeat(76) + ' 4e00')
      expect(hex).to.equal('4c4c' + 'ff'.repeat(76) + '024e00')
    })

    it('pushdata 2', () => {
      const state = ['FF'.repeat(2 ** 8)]
      const serialize = serializeState(state)
      const script = Script.fromASM(serialize)
      const hex = script.toHex()

      expect(serialize).to.equal('ff'.repeat(2 ** 8) + ' 0301')
      expect(hex).to.equal('4d0001' + 'ff'.repeat(2 ** 8) + '020301')
    })

    it('pushdata 4', () => {
      const state = ['FF'.repeat(2 ** 16)]
      // use 4 bytes to accomodate
      const serial = serializeState(state, 4)
      const script = Script.fromASM(serial)
      const hex = script.toHex()

      expect(serial).to.equal('ff'.repeat(2 ** 16) + ' 05000100')
      expect(hex).to.equal('4e00000100' + 'ff'.repeat(2 ** 16) + '0405000100')
    })
  })
})
