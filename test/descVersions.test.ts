import { assert, expect } from 'chai';
import { loadDescription } from './helper';
import { buildContractClass, buildTypeClasses, AbstractContract } from '../src/contract';


describe('Contract description old version test', () => {

  it('should throw when missing version', () => {
    const jsonDescr = loadDescription('p2pkh_desc_missing_version.json');
    expect(() => { buildContractClass(jsonDescr); }).to.throw('missing field `version` in description');
  });

  it('should throw when version lower', () => {

    expect(() => { buildContractClass(loadDescription('version_1.json')); }).to.throw('Contract description version deprecated, The minimum version number currently supported is 8');

    expect(() => { buildContractClass(loadDescription('version_2.json')); }).to.throw('Contract description version deprecated, The minimum version number currently supported is 8');

  });

  it('should support version 8', () => {

    const Demo = buildContractClass(loadDescription('version_8.json'));

    const demo = new Demo(1, 3);

    let result = demo.add(4).verify();

    assert.isTrue(result.success)

    result = demo.add(3).verify();
    expect(result.error).to.be.contains("VerifyError: SCRIPT_ERR_EVAL_FALSE_IN_STACK \n");
    expect(result.error).to.be.contains("demo.scrypt#15");
    expect(result.error).to.be.contains("fails at OP_ENDIF\n");

  });

  it('test basic type in p2pkh_desc.json', () => {
    const jsonDescr = loadDescription('p2pkh_desc.json');
    const Contract = buildContractClass(jsonDescr)
    expect(typeof Contract === typeof AbstractContract).to.be.true;

    const Classes = buildTypeClasses(jsonDescr);

    expect(Object.keys(Classes)).to.includes.members(["bool", "int", "bytes", "PubKey", "PrivKey", "Sig", "Sha1", "Ripemd160", "Sha256", "SigHashType", "OpCodeType", "SigHashPreimage"])

  });

  it('test user defined type in alias_desc.json', () => {
    const jsonDescr = loadDescription('alias_desc.json');
    const Contract = buildContractClass(jsonDescr)
    expect(typeof Contract === typeof AbstractContract).to.be.true;

    const Classes = buildTypeClasses(jsonDescr);
    expect(Object.keys(Classes)).to.includes.members(["Age", "Block", "Coinbase", "Person", "Female", "Height", "Integer", "Male", "MaleAAA", "Name", "Time"])

    Object.keys(Classes).forEach(t => {
      assert.isTrue(Classes[t] instanceof Function)
    })

  });

})