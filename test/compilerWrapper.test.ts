import { assert } from 'chai';
import { compile, CompileResult } from '../src/compilerWrapper';
import path = require("path");



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
})

function compileContract(fileName: string, folder: string): CompileResult {
  const filePath = path.join(__dirname, folder, fileName);
  const result = compile(
    { path: filePath },
    { desc: true, outputDir: path.join(__dirname, '') }
  );
  return result;
}