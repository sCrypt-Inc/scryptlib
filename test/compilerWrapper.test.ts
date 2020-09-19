import { assert } from 'chai';
import { compile,CompileResult } from '../src/compilerWrapper';
import path = require("path")



describe('compile()', () => {     
    it('compile successfully', () => {    
      const result = compileContract("demo.scrypt","fixture");

      assert.typeOf(result, 'object');
      assert.equal(result.errors.length,0,"No Errors")
    })


    it('should return SyntaxError', () => {
      const result = compileContract("demo_wrong.scrypt","fixture/invalid");

      assert.notEqual(result.errors.length,0,"No Errors")
      assert.include(result.errors[0].type, 'SyntaxError', 'contract has SyntaxError');
    })
})

function compileContract(fileName:string, folder:string){
  const filePath = path.join(__dirname, folder, fileName);
  const result = compile(
    { path: filePath },
    { desc: true, outputDir: path.join(__dirname, '') }
  )
  return result
}