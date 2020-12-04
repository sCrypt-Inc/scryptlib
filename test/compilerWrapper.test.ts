import { assert } from 'chai';
import path = require("path");
import { existsSync, readFileSync } from 'fs';
import { compileContract } from './helper'


describe('compile()', () => {
  it('compile successfully', () => {
    const result = compileContract("p2pkh.scrypt", "fixture");

    assert.typeOf(result, 'object');
    assert.equal(result.errors.length, 0, "No Errors");
  })


  it('should return SyntaxError', () => {
    const result = compileContract("p2pkh_wrong.scrypt", "fixture/invalid");
    
    assert.isAbove(result.errors.length, 0, "exist Errors");
    assert.include(result.errors[0].type, 'SyntaxError', 'contract has SyntaxError');
  })
  
  it('should generate description file properly', () => {
    const result = compileContract('bar.scrypt', 'fixture');
    const outputFile = path.join(__dirname, 'fixture/bar_desc.json');

    assert.typeOf(result, 'object');
    assert.isTrue(existsSync(outputFile));

    const content = JSON.parse(readFileSync(outputFile).toString());

    assert.deepEqual(content['abi'], [
      {
        "type": "function",
        "name": "unlock",
        "index": 0,
        "params": [
          {
            "name": "y",
            "type": "int"
          }
        ]
      }, {
        "type": "constructor",
        "params": [
          {
            "name": "_x",
            "type": "int"
          },
          {
            "name": "y",
            "type": "int"
          },
          {
            "name": "z",
            "type": "int"
          }
        ]
      }
    ])
  })

  it('should generate structs properly', () => {
    const result = compileContract("person.scrypt", "fixture");

    assert.equal(result.structs.length, 1);

  })

})