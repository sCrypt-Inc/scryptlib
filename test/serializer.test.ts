import { expect } from 'chai';
import {
  bsv,
  serializeState,
  deserializeState,
  STATE_LEN_2BYTES,
  STATE_LEN_4BYTES,
} from '../src/index';

const BN = bsv.crypto.BN;
const Script = bsv.Script;

describe('serializer', () => {
  describe('BSV Script()', () => {
    it('zero', () => {
      const script = Script.fromASM('0');
      const hex = script.toHex();
      expect(hex).to.equal('00');
    });

    it('double zero', () => {
      const script = Script.fromASM('00');
      const hex = script.toHex();
      expect(hex).to.equal('0100');
    });

    it('-1', () => {
      const script = Script.fromASM('-1');
      const hex = script.toHex();
      expect(hex).to.equal('4f');
    });

    it('false', () => {
      const script = Script.fromASM('OP_FALSE');
      const hex = script.toHex();
      expect(hex).to.equal('00');
    });

    it('true', () => {
      const script = Script.fromASM('OP_TRUE');
      const hex = script.toHex();
      expect(hex).to.equal('51');
    });
  });

  describe('serializeState()', () => {
    it('object type', () => {
      const state = { counter: 11, bytes: '1234', flag: true };
      const serial = serializeState(state);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('0b 1234 OP_1 0600');
      expect(hex).to.equal('010b02123451020600');
    });

    it('object type with schema', () => {
      //support string type when using schema
      const schema = {
        str: 'string',
        counter: 'number',
        bytes: 'hex',
        flag: 'boolean',
      };

      const state = {
        str: 'Helloこんにちは你好',
        counter: 11,
        bytes: '1234',
        flag: true,
      };
      const serial = serializeState(state, STATE_LEN_2BYTES, schema);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal(
        '48656c6c6fe38193e38293e381abe381a1e381afe4bda0e5a5bd 0b 1234 OP_1 2100'
      );
      expect(hex).to.equal(
        '1a48656c6c6fe38193e38293e381abe381a1e381afe4bda0e5a5bd010b02123451022100'
      );
    });

    it('array type', () => {
      const state = [11, '1234', false];
      const serial = serializeState(state);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('0b 1234 0 0600');
      expect(hex).to.equal('010b02123400020600');
    });

    it('array type with schema', () => {
      //support string type when using schema
      const schema = ['string', 'number', 'hex', 'boolean'];
      const state = ['Helloこんにちは你好', 11, '1234', false];
      const serial = serializeState(state, STATE_LEN_2BYTES, schema);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal(
        '48656c6c6fe38193e38293e381abe381a1e381afe4bda0e5a5bd 0b 1234 0 2100'
      );
      expect(hex).to.equal(
        '1a48656c6c6fe38193e38293e381abe381a1e381afe4bda0e5a5bd010b02123400022100'
      );
    });

    it('special number', () => {
      const state = [0, -1, 1, 11, '1234', true];
      const serial = serializeState(state);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('00 81 01 0b 1234 OP_1 0c00');
      expect(hex).to.equal('010001810101010b02123451020c00');
    });

    it('special string', () => {
      const state = ['0', '-1', 'OP_1', '11', '1234', true];
      const serial = serializeState(state);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('0 -1 OP_1 11 1234 OP_1 0900');
      expect(hex).to.equal('004f51011102123451020900');
    });

    it('special string with schema', () => {
      const schema = ['string', 'string', 'string', 'string'];
      //emptr, space, double space, UTF8 Full-Word Space
      const state = ['', ' ', '  ', '　'];
      const serial = serializeState(state, STATE_LEN_2BYTES, schema);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('00 20 2020 e38080 0b00');
      expect(hex).to.equal('0100012002202003e38080020b00');
    });

    it('negative number', () => {
      const state = [-100];
      const serial = serializeState(state);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('e4 0200');
      expect(hex).to.equal('01e4020200');
    });

    it('bool', () => {
      const state = [true, false];
      const serial = serializeState(state);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('OP_1 0 0200');
      expect(hex).to.equal('5100020200');
    });

    it('bigint', () => {
      const state = [0n, 0x0an, 0x123n, 0x123456789abcden, -1000n];
      const serial = serializeState(state);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('00 0a 2301 debc9a78563412 e883 1200');
      expect(hex).to.equal('0100010a02230107debc9a7856341202e883021200');
    });

    it('pushdata 0', () => {
      const state = ['ff'.repeat(75)];
      const serial = serializeState(state);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('ff'.repeat(75) + ' 4c00');
      expect(hex).to.equal('4b' + 'ff'.repeat(75) + '024c00');
    });

    it('pushdata 1', () => {
      const state = ['ff'.repeat(76)];
      const serial = serializeState(state);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('ff'.repeat(76) + ' 4e00');
      expect(hex).to.equal('4c4c' + 'ff'.repeat(76) + '024e00');
    });

    it('pushdata 2', () => {
      const state = ['ff'.repeat(2 ** 8)];
      const serialize = serializeState(state);
      const script = Script.fromASM(serialize);
      const hex = script.toHex();

      expect(serialize).to.equal('ff'.repeat(2 ** 8) + ' 0301');
      expect(hex).to.equal('4d0001' + 'ff'.repeat(2 ** 8) + '020301');
    });

    it('pushdata 4', () => {
      const state = ['ff'.repeat(2 ** 16)];
      // use 4 bytes to accomodate
      const serial = serializeState(state, STATE_LEN_4BYTES);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('ff'.repeat(2 ** 16) + ' 05000100');
      expect(hex).to.equal('4e00000100' + 'ff'.repeat(2 ** 16) + '0405000100');
    });
  });

  describe('deserializeState()', () => {
    it('object type', () => {
      const states = { counter: 11, bytes: '1234', flag: true, big: 100n };
      const serial = serializeState(states);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('0b 1234 OP_1 64 0800');
      expect(hex).to.equal('010b021234510164020800');

      const deStates = deserializeState(hex, states);
      expect(deStates).to.eql(states);
    });

    it('object type with schema', () => {
      //support string type when using schema
      const schema = {
        str: 'string',
        counter: 'number',
        bytes: 'hex',
        flag: 'boolean',
      };

      const states = {
        str: 'Helloこんにちは你好',
        counter: 11,
        bytes: '1234',
        flag: true,
      };
      const serial = serializeState(states, STATE_LEN_2BYTES, schema);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal(
        '48656c6c6fe38193e38293e381abe381a1e381afe4bda0e5a5bd 0b 1234 OP_1 2100'
      );
      expect(hex).to.equal(
        '1a48656c6c6fe38193e38293e381abe381a1e381afe4bda0e5a5bd010b02123451022100'
      );

      const deStates = deserializeState(hex, schema);
      expect(deStates).to.eql(states);
    });

    it('object type with schema 2', () => {
      const schema = {
        counter: 'number',
        bytes: 'hex',
        flag: 'boolean',
        str: 'string',
      };
      const states = { counter: 11, bytes: '1234', flag: true };
      const serial = serializeState(states, STATE_LEN_2BYTES, schema);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('0b 1234 OP_1 0600');
      expect(hex).to.equal('010b02123451020600');

      const deStates = deserializeState(hex, {
        counter: 'number',
        bytes: 'hex',
      });
      expect(deStates).to.eql({ counter: 11, bytes: '1234' });
    });

    it('object type with schema 3', () => {
      const schema = {
        counter: 'number',
        bytes: 'hex',
        flag: 'boolean',
        str: 'string',
      };
      const states = { counter: 11, bytes: '1234', flag: true };
      const serial = serializeState(states, STATE_LEN_2BYTES, schema);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('0b 1234 OP_1 0600');
      expect(hex).to.equal('010b02123451020600');

      const deStates = deserializeState(hex, {
        counter: 'number',
        bytes: 'hex',
        flag: 'boolean',
        big: 'bigint',
        other: 'string',
      });
      expect(deStates).to.eql(states);
    });

    it('array type', () => {
      const states = [11, '1234', false];
      const serial = serializeState(states);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('0b 1234 0 0600');
      expect(hex).to.equal('010b02123400020600');

      const deStates = deserializeState(hex);
      expect(deStates[0].toNumber()).to.equal(states[0]);
      expect(deStates[1].toHex()).to.equal(states[1]);
      expect(deStates[2].toBoolean()).to.equal(states[2]);
    });

    it('array type with schema', () => {
      //support string type when using schema
      const schema = ['string', 'number', 'hex', 'boolean'];
      const states = ['Helloこんにちは你好', 11, '1234', false];
      const serial = serializeState(states, STATE_LEN_2BYTES, schema);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal(
        '48656c6c6fe38193e38293e381abe381a1e381afe4bda0e5a5bd 0b 1234 0 2100'
      );
      expect(hex).to.equal(
        '1a48656c6c6fe38193e38293e381abe381a1e381afe4bda0e5a5bd010b02123400022100'
      );

      const deStates = deserializeState(hex, schema);
      expect(deStates).to.eql(states);
    });

    it('array type 2', () => {
      const states = [11, '1234', false];
      const serial = serializeState(states);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('0b 1234 0 0600');
      expect(hex).to.equal('010b02123400020600');

      //schema from state
      const deStates = deserializeState(hex, states);
      expect(deStates).to.eql(states);
    });

    it('array type 3', () => {
      const states = [11, '1234', false];
      const serial = serializeState(states);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('0b 1234 0 0600');
      expect(hex).to.equal('010b02123400020600');

      //schema array
      const deStates = deserializeState(hex, ['number', 'hex', 'boolean']);
      expect(deStates).to.eql(states);
    });

    it('OP_RETURN', () => {
      const states = [11, '1234', false];
      const serial = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();
      expect(serial).to.equal('0b 1234 0 0600');
      expect(hex).to.equal('516a010b02123400020600');

      const deStates = deserializeState(hex, ['number', 'hex', 'boolean']);
      expect(deStates).to.eql(states);
    });

    it('Script Object', () => {
      const states = [11, '1234', false];
      const serial = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();
      expect(serial).to.equal('0b 1234 0 0600');
      expect(hex).to.equal('516a010b02123400020600');

      //script object
      const deStates = deserializeState(hex, ['number', 'hex', 'boolean']);
      expect(deStates).to.eql(states);
    });

    it('Script ASM', () => {
      const states = [11, '1234', false];
      const serial = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();
      expect(serial).to.equal('0b 1234 0 0600');
      expect(hex).to.equal('516a010b02123400020600');

      //script object
      const deStates = deserializeState(script.toASM(), [
        'number',
        'hex',
        'boolean',
      ]);
      expect(deStates).to.eql(states);
    });

    it('special number', () => {
      const states = [
        0, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
      ];
      const serial = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();

      expect(serial).to.equal(
        '00 81 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f 10 11 12 2800'
      );
      expect(hex).to.equal(
        '516a01000181010101020103010401050106010701080109010a010b010c010d010e010f011001110112022800'
      );

      const deStates = deserializeState(hex);
      for (let i = 0; i < states.length; i++) {
        expect(deStates[i].toNumber()).to.equal(states[i]);
      }
    });

    it('special string', () => {
      const states = [
        'OP_0',
        'OP_1',
        'OP_2',
        'OP_3',
        'OP_4',
        'OP_5',
        'OP_6',
        'OP_7',
        'OP_8',
        'OP_9',
        'OP_10',
        'OP_11',
        'OP_12',
        'OP_13',
        'OP_14',
        'OP_15',
        'OP_16',
        17,
        18,
        19,
      ];
      const serial = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();

      expect(serial).to.equal(
        '0 OP_1 OP_2 OP_3 OP_4 OP_5 OP_6 OP_7 OP_8 OP_9 OP_10 OP_11 OP_12 OP_13 OP_14 OP_15 OP_16 11 12 13 1700'
      );
      expect(hex).to.equal(
        '516a005152535455565758595a5b5c5d5e5f60011101120113021700'
      );

      const deStates = deserializeState(hex);
      for (let i = 0; i < states.length; i++) {
        expect(deStates[i].toNumber()).to.equal(i);
      }
    });

    it('special string with schema', () => {
      const schema = ['string', 'string', 'string', 'string', 'string'];
      //emptr, space, double space, UTF8 Full-Word Space, string with left & right space
      const states = ['', ' ', '  ', '　', '  hello   '];
      const serial = serializeState(states, STATE_LEN_2BYTES, schema);
      const script = Script.fromASM(serial);
      const hex = script.toHex();

      expect(serial).to.equal('00 20 2020 e38080 202068656c6c6f202020 1600');
      expect(hex).to.equal(
        '0100012002202003e380800a202068656c6c6f202020021600'
      );

      const deStates = deserializeState(hex, schema);
      expect(deStates).to.eql(states);
    });

    it('negative number', () => {
      const states = [-100];
      const serial = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();

      expect(serial).to.equal('e4 0200');
      expect(hex).to.equal('516a01e4020200');

      const deStates = deserializeState(hex);
      expect(deStates[0].toNumber()).to.equal(states[0]);
    });

    it('bool', () => {
      const states = [true, false];
      const serial = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();

      expect(serial).to.equal('OP_1 0 0200');
      expect(hex).to.equal('516a5100020200');

      const deStates = deserializeState(hex);
      expect(deStates[0].toBoolean()).to.equal(states[0]);
      expect(deStates[1].toBoolean()).to.equal(states[1]);
    });

    it('bigint', () => {
      const states = [0n, 0x0an, 0x123n, 0x123456789abcden, -1000n];
      const serial = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();

      expect(serial).to.equal('00 0a 2301 debc9a78563412 e883 1200');
      expect(hex).to.equal('516a0100010a02230107debc9a7856341202e883021200');

      const deStates = deserializeState(hex);
      for (let i = 0; i < states.length; i++) {
        expect(deStates[i].toBigInt()).to.equal(states[i]);
      }
    });

    it('pushdata 0', () => {
      const states = ['ff'.repeat(75)];
      const serial = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();

      expect(serial).to.equal('ff'.repeat(75) + ' 4c00');
      expect(hex).to.equal('516a4b' + 'ff'.repeat(75) + '024c00');

      const deStates = deserializeState(hex);
      expect(deStates[0].toHex()).to.equal(states[0]);
    });

    it('pushdata 1', () => {
      const states = ['ff'.repeat(76)];
      const serial = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();

      expect(serial).to.equal('ff'.repeat(76) + ' 4e00');
      expect(hex).to.equal('516a4c4c' + 'ff'.repeat(76) + '024e00');

      const deStates = deserializeState(hex);
      expect(deStates[0].toHex()).to.equal(states[0]);
    });

    it('pushdata 2', () => {
      const states = ['ff'.repeat(2 ** 8)];
      const serialize = serializeState(states);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serialize);
      const hex = script.toHex();

      expect(serialize).to.equal('ff'.repeat(2 ** 8) + ' 0301');
      expect(hex).to.equal('516a4d0001' + 'ff'.repeat(2 ** 8) + '020301');

      const deStates = deserializeState(hex);
      expect(deStates[0].toHex()).to.equal(states[0]);
    });

    it('pushdata 4', () => {
      const states = ['ff'.repeat(2 ** 16)];
      // use 4 bytes to accomodate
      const serial = serializeState(states, 4);
      const script = Script.fromASM('OP_TRUE OP_RETURN ' + serial);
      const hex = script.toHex();

      expect(serial).to.equal('ff'.repeat(2 ** 16) + ' 05000100');
      expect(hex).to.equal(
        '516a4e00000100' + 'ff'.repeat(2 ** 16) + '0405000100'
      );

      const deStates = deserializeState(hex);
      expect(deStates[0].toHex()).to.equal(states[0]);
    });
  });
});
