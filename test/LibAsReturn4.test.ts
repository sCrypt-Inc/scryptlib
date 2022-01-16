
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';



const Test = buildContractClass(loadDescription('LibAsReturn3_desc.json'));
const { L } = buildTypeClasses(Test);

describe('LibAsReturn3 test', () => {
  let instance, result;

  before(() => {
    instance = new Test(1);
  });

  it('should success when call unlock', () => {
    result = instance.unlock(1).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should success when call unlock', () => {
    result = instance.unlock(2).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should success when call unlock1', () => {
    result = instance.unlock2(4).verify()
    expect(result.success, result.error).to.be.true
  });

  it('should success when call unlock', () => {
    result = instance.unlock2(2).verify()
    expect(result.success, result.error).to.be.false
  });


});