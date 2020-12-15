import { assert, expect } from 'chai';
import path = require("path");
import { existsSync, readFileSync } from 'fs';
import { compileContract,loadDescription,loadFile } from './helper'
import { join } from 'path';
import { ABIEntityType } from '../src/compilerWrapper';


describe('compile()', () => {
  it('compile successfully', () => {
    const result = compileContract(loadFile('p2pkh.scrypt'));

    assert.typeOf(result, 'object');
    assert.equal(result.errors.length, 0, "No Errors");
  })



  it('should generate description file properly', () => {
    const result = compileContract(loadFile('bar.scrypt'));
    const outputFile = path.join(__dirname, 'fixture/bar_desc.json');

    assert.typeOf(result, 'object');

    const content = loadDescription('bar_desc.json');

    assert.deepEqual(content.abi, [
      {
        "type": ABIEntityType.FUNCTION,
        "name": "unlock",
        "index": 0,
        "params": [
          {
            "name": "y",
            "type": "int"
          }
        ]
      }, {
        "type": ABIEntityType.CONSTRUCTOR,
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
    const result = compileContract(loadFile('person.scrypt'));
    console.log("result", JSON.stringify(result.structs))
    assert.equal(result.structs.length, 2);

    expect(result.structs).to.deep.include.members([{
      name: 'Person',
      params: [{
        "name": "addr",
        "type": "bytes"
      }, {
        "name": "isMale",
        "type": "bool"
      }, {
        "name": "age",
        "type": "int"
      }]
    }, {
      name: 'Block',
      params: [{
        "name": "hash",
        "type": "bytes"
      }, {
        "name": "header",
        "type": "bytes"
      }, {
        "name": "time",
        "type": "int"
      }]
    }
    ])
  })

})