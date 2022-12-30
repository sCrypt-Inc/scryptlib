
import { assert, expect } from 'chai';
import { newTx, loadArtifact } from './helper';
import { buildContractClass } from '../src/contract';
import { Bytes, } from '../src/scryptTypes';


const jsonArtifact = loadArtifact('mixedstruct.json');
const MixedStruct = buildContractClass(jsonArtifact);

const mixedArtifact = loadArtifact('mixed.json');

const MixedArrayAndStruct = buildContractClass(mixedArtifact);


describe('MixedStruct  test', () => {

  describe('check MixedStruct', () => {
    let mixedStruct, result;

    before(() => {
      mixedStruct = new MixedStruct({
        name: Bytes('6666'),
        friend: {
          name: Bytes('7361746f736869206e616b616d6f746f'),
          addr: Bytes('6666'),
          isMale: true,
          age: 33n,
          blk: {
            time: 10000n,
            hash: Bytes('68656c6c6f20776f726c6421'),
            header: Bytes('1156'),
          }
        },
        tokens: [{
          id: Bytes('0001'),
          createTime: 1000000n
        }, {
          id: Bytes('0002'),
          createTime: 1000001n
        }, {
          id: Bytes('0003'),
          createTime: 1000002n
        }]
      });

    });



    it('should succeeding when call unlock', () => {
      result = mixedStruct.unlock({
        name: Bytes('7361746f736869206e616b616d6f746f'),
        addr: Bytes('68656c6c6f20776f726c6421'),
        isMale: true,
        age: 33n,
        blk: {
          time: 10000n,
          hash: Bytes('68656c6c6f20776f726c6420'),
          header: Bytes('1156'),
        }
      }).verify()
      expect(result.success, result.error).to.be.true
    });


    it('should succeeding when call unlock', () => {

      let person = {
        name: Bytes('7361746f736869206e616b616d6f746f'),
        addr: Bytes('68656c6c6f20776f726c6421'),
        isMale: false,
        age: 11n,
        blk: {
          time: 10000n,
          hash: Bytes('68656c6c6f20776f726c6420'),
          header: Bytes('1156'),
        }
      };


      person.isMale = true;
      person.age = 33n;

      result = mixedStruct.unlock(person).verify()
      expect(result.success, result.error).to.be.true
    });



    it('should fail when name error', () => {
      result = mixedStruct.unlock({
        name: Bytes('11'),
        addr: Bytes('68656c6c6f20776f726c6421'),
        isMale: true,
        age: 33n,
        blk: {
          time: 10000n,
          hash: Bytes('68656c6c6f20776f726c6420'),
          header: Bytes('1156'),
        }
      }).verify()
      expect(result.success, result.error).to.be.false
    });


    it('should fail when time error', () => {
      result = mixedStruct.unlock({
        name: Bytes('11'),
        addr: Bytes('68656c6c6f20776f726c6421'),
        isMale: true,
        age: 33n,
        blk: {
          time: 10001n,
          hash: Bytes('68656c6c6f20776f726c6420'),
          header: Bytes('1156'),
        }
      }).verify()
      expect(result.success, result.error).to.be.false
    });


    it('should fail when missing member name', () => {

      expect(() => {
        result = mixedStruct.unlock({
          addr: Bytes('68656c6c6f20776f726c6421'),
          isMale: true,
          age: 33n,
          blk: {
            time: 10001n,
            hash: Bytes('68656c6c6f20776f726c6420'),
            header: Bytes('1156'),
          }
        }).verify()

      }).to.throw('The type of p is wrong, expected Person but missing member [name]');
    });


    it('should fail when missing member hash', () => {

      expect(() => {
        result = mixedStruct.unlock({
          name: Bytes('7361746f736869206e616b616d6f746f'),
          addr: Bytes('68656c6c6f20776f726c6421'),
          isMale: true,
          age: 33n,
          blk: {
            time: 10001n,
            header: Bytes('1156'),
          }
        }).verify()

      }).to.throw('The type of blk is wrong, expected Block but missing member [hash]');
    });


    it('struct Bsver property tokens should be struct Token {}[3]', () => {

      expect(() => {
        new MixedStruct({
          name: Bytes('6666'),
          friend: {
            name: Bytes('7361746f736869206e616b616d6f746f'),
            addr: Bytes('6666'),
            isMale: true,
            age: 33n,
            blk: {
              time: 10000n,
              hash: Bytes('68656c6c6f20776f726c6421'),
              header: Bytes('1156'),
            }
          },
          tokens: [{
            id: Bytes('0001'),
            createTime: 1000000n
          }, {
            id: Bytes('0002'),
            createTime: 1000001n
          }]
        });

      }).to.throw('The type of tokens is wrong, expected a array with length = 3 but got a array with length = 2');


      expect(() => {
        new MixedStruct({
          name: Bytes('6666'),
          friend: {
            name: Bytes('7361746f736869206e616b616d6f746f'),
            addr: Bytes('6666'),
            isMale: true,
            age: 33n,
            blk: {
              time: 10000n,
              hash: Bytes('68656c6c6f20776f726c6421'),
              header: Bytes('1156'),
            }
          },
          tokens: [{
            id: Bytes('0001'),
            createTime: 1000000n
          }, {
            id: Bytes('0002'),
            createTime: 1000001n
          }, {
            id: Bytes('0003'),
            createTime: 1000002n
          }, {
            id: Bytes('0004'),
            createTime: 1000003n
          }]
        });

      }).to.throw('The type of tokens is wrong, expected a array with length = 3 but got a array with length = 4');


      expect(() => {
        new MixedStruct({
          name: Bytes('6666'),
          friend: {
            name: Bytes('7361746f736869206e616b616d6f746f'),
            addr: Bytes('6666'),
            isMale: true,
            age: 33n,
            blk: {
              time: 10000n,
              hash: Bytes('68656c6c6f20776f726c6421'),
              header: Bytes('1156'),
            }
          },
          tokens: {
            id: Bytes('0001'),
            createTime: 1000000n
          }
        });
      }).to.throw('The type of tokens is wrong, expected Token[3] but got object');

    });

  });

  describe('check mixed', () => {
    let mixed, result;

    before(() => {
      mixed = new MixedArrayAndStruct();
    });


    it('unlock mixed should succeeding', () => {
      result = mixed.unlock(1n).verify()
      expect(result.success, result.error).to.be.true
    });

    it('unlock mixed should fail', () => {
      result = mixed.unlock(0n).verify()
      expect(result.success, result.error).to.be.false
    });

    it('unlock mixed should fail', () => {
      result = mixed.unlock(4n).verify()
      expect(result.success, result.error).to.be.false
    });
  })
})

