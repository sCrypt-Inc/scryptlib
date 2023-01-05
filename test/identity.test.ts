const { expect } = require('chai');

import { assert } from 'chai';
import { Int, readLaunchJson } from '../src';
import { buildContractClass } from '../src/contract';
import { getRandomInt, loadArtifact } from './helper';

describe('Test sCrypt contract identity In Javascript', () => {
  let test, result

  before(() => {
    const Test = buildContractClass(loadArtifact('identity.json'));
    test = new Test();
  });



  it('bitwiseAlgebra should return true', () => {

    let counter = 100;

    while (--counter > 0) {
      let x = Int(getRandomInt(-100000000000, 100000000000));
      let y = Int(getRandomInt(-100000000000, 100000000000));
      let z = Int(getRandomInt(-100000000000, 100000000000));


      result = test.bitwiseAlgebra(x, y, z).verify()

      expect(result.success, result.error).to.be.true

    }

  });



  it('boolAlgebra should return true', () => {

    let counter = 1000;

    while (--counter > 0) {
      let x = getRandomInt(-100000000000, 100000000000) > 0;
      let y = getRandomInt(-100000000000, 100000000000) > 0;
      let z = getRandomInt(-100000000000, 100000000000) > 0;

      result = test.boolAlgebra(x, y, z).verify()
      if (result.success === false) {
        console.log(JSON.stringify(readLaunchJson(result.error)))
      }
      expect(result.success, result.error).to.be.true
    }

  });

  it('mathAlgebra should return true', () => {

    let counter = 1000;

    while (--counter > 0) {
      let x = Int(getRandomInt(-100000000000, 100000000000));
      let y = Int(getRandomInt(-100000000000, 100000000000));
      let z = Int(getRandomInt(-100000000000, 100000000000));

      result = test.mathAlgebra(x, y, z).verify()
      if (result.success === false) {
        console.log(JSON.stringify(readLaunchJson(result.error)))
      }
      expect(result.success, result.error).to.be.true
    }

  });


  it('shiftAlgebra should return true', () => {

    let counter = 1000;

    while (--counter > 0) {
      let x = Int(getRandomInt(-100000000000, 100000000000));
      let y = Int(getRandomInt(0, 1000));

      result = test.shiftAlgebra(x, y).verify()
      if (result.success === false) {
        console.log(JSON.stringify(readLaunchJson(result.error)))
      }
      expect(result.success, result.error).to.be.true
    }

    let x = Int(getRandomInt(-100000000000, 100000000000));
    result = test.shiftAlgebra(x, -1n).verify()
    expect(result.success, result.error).to.be.false

  });

});
