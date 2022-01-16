
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';



const Test = buildContractClass(loadDescription('LibAsProperty8_desc.json'));
const { L, ST } = buildTypeClasses(Test);

describe('LibAsProperty7 test', () => {
  let instance, result;

  before(() => {
    instance = new Test(2, new L([new ST({
      x: 1,
      y: 1
    }), new ST({
      x: 2,
      y: 2
    }), new ST({
      x: 3,
      y: 3
    })]));
  });

  it('should success when call unlock', () => {
    result = instance.unlock(10).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should success when call unlock', () => {
    result = instance.unlock(12).verify()
    expect(result.success, result.error).to.be.false
  });

});