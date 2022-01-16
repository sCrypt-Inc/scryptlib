
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';



const Test = buildContractClass(loadDescription('LibAsProperty7_desc.json'));
const { L, ST } = buildTypeClasses(Test);

describe('LibAsProperty7 test', () => {
  let instance, result;

  before(() => {
    instance = new Test(1, new L(new ST({
      x: 1,
      y: 1
    })));
  });

  it('should success when call unlock', () => {
    result = instance.unlock(1).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should success when call unlock', () => {
    result = instance.unlock(2).verify()
    expect(result.success, result.error).to.be.false
  });

});