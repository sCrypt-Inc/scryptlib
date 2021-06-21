import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { DebugLaunch } from '../src/abi';
import { buildContractClass, VerifyError, buildTypeClasses, AbstractContract } from '../src/contract';


describe('Contract description old version test', () => {

  describe('should throw when missing version', () => {

    it('should throw when missing version', () => {
      const jsonDescr = loadDescription('p2pkh_desc_missing_version.json');
      expect(() => { buildContractClass(jsonDescr); }).to.throw('Contract description version deprecated,  Please update your sCrypt extension to the latest version and recompile');
    });
  });

  describe('test version 1', () => {
    it('test version 1', () => {
      const jsonDescr = loadDescription('version_1.json');
      const Contract = buildContractClass(jsonDescr)
      expect(typeof Contract === typeof AbstractContract).to.be.true;

      const Classes = buildTypeClasses(jsonDescr);

      assert.deepEqual(Classes, {})

    });
  });

  describe('test version 2', () => {
    it('test version 2', () => {
      const jsonDescr = loadDescription('version_2.json');
      const Contract = buildContractClass(jsonDescr)
      expect(typeof Contract === typeof AbstractContract).to.be.true;

      const Classes = buildTypeClasses(jsonDescr);

      expect(Object.keys(Classes)).to.includes.members(["Age", "Block", "Coinbase", "Person", "Female", "Height", "Integer", "Male", "MaleAAA", "Name", "Time", "Tokens"])

      Object.keys(Classes).forEach(t => {
        assert.isTrue(Classes[t] instanceof Function)
      })


    });
  });


})