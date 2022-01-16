
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';



const Test = buildContractClass(loadDescription('LibAsProperty6_desc.json'));
const { L } = buildTypeClasses(Test);

describe('LibAsProperty6 test', () => {
  let instance, result;

  // before(() => {
  //   instance = new Test(1, [new L(1, 1), new L(2, 2), new L(3, 3)]);
  // });

  // it('should success when call unlock', () => {
  //   result = instance.unlock(12).verify()
  //   expect(result.success, result.error).to.be.true
  // });

  // it('should success when call unlock', () => {
  //   result = instance.unlock(11).verify()
  //   expect(result.success, result.error).to.be.false
  // });

});