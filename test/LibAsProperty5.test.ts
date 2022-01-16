
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';



const Test = buildContractClass(loadDescription('LibAsProperty5_desc.json'));
const { L } = buildTypeClasses(Test);

describe('LibAsProperty5 test', () => {
  let instance, result;

  before(() => {
    instance = new Test(1, [new L(1), new L(2), new L(3)]);
  });

  it('should success when call unlock', () => {
    result = instance.unlock(5).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should success when call unlock', () => {
    result = instance.unlock(4).verify()
    expect(result.success, result.error).to.be.false
  });

});