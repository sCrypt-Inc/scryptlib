import { assert, expect } from 'chai';
import { loadArtifact } from './helper';
import { buildContractClass, AbstractContract } from '../src/contract';


describe('Contract artifact old version test', () => {

  it('should throw when missing version', () => {
    const jsonArtifact = loadArtifact('p2pkh_missing_version.json');
    expect(() => { buildContractClass(jsonArtifact); }).to.throw('Missing field `version` in artifact');
  });

  it('should throw when version lower', () => {

    expect(() => { buildContractClass(loadArtifact('version_1.json')); }).to.throw('Contract artifact version deprecated, The minimum version number currently supported is 8');

    expect(() => { buildContractClass(loadArtifact('version_2.json')); }).to.throw('Contract artifact version deprecated, The minimum version number currently supported is 8');

  });

  it('should support version 8', () => {

    const Demo = buildContractClass(loadArtifact('version_8.json'));

    const demo = new Demo(1n, 3n);

    let result = demo.add(4n).verify();

    assert.isTrue(result.success)

    result = demo.add(3n).verify();
    expect(result.error).to.be.contains("VerifyError: SCRIPT_ERR_EVAL_FALSE_IN_STACK \n");
    expect(result.error).to.be.contains("demo.scrypt#15");
    expect(result.error).to.be.contains("fails at OP_ENDIF\n");

  });

  it('test basic type in p2pkh.json', () => {
    const jsonArtifact = loadArtifact('p2pkh.json');
    const Contract = buildContractClass(jsonArtifact)
    expect(typeof Contract === typeof AbstractContract).to.be.true;
  });

})