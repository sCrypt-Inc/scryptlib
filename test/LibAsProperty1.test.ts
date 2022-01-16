
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';



const Test = buildContractClass(loadDescription('LibAsProperty1_desc.json'));
const { L } = buildTypeClasses(Test);

describe('LibAsProperty1 test', () => {
  let instance, result;

  before(() => {
    instance = new Test(1, new L(1,2));
  });

  it('should success when call unlock', () => {
    result = instance.unlock(2).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should success when call unlock', () => {
    result = instance.unlock(3).verify()
    expect(result.success, result.error).to.be.false
  });

});