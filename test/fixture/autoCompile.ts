import glob = require('glob');
import { basename, join } from 'path';
import { compileContract, findCompiler } from '../../src';
import { exit } from 'process';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { compilerVersion } from '../../src/compilerWrapper';

function compileAllContracts() {

  const out = join(__dirname, "..", "..", "out");
  if (!existsSync(out)) {
    mkdirSync(out);
  }

  const scryptc = findCompiler();
  console.log('compiler binary: ', scryptc)
  console.log('compiler version: ', compilerVersion(scryptc))

  const contracts = glob.sync(join(__dirname, './*.scrypt'));
  contracts.forEach(filePath => {

    const result = compileContract(filePath, {
      out: out
    });

    if (result.errors.length > 0) {
      console.log(`Contract ${filePath} compiling failed with errors:`);
      console.log(JSON.stringify(result.errors, null, 4));
      exit(1);
    }
  })
}


function copyDescFiles() {
  const descs = glob.sync(join(__dirname, 'desc', './*.json'));
  descs.forEach(filePath => {
    copyFileSync(filePath, join(__dirname, '..', '..', 'out', basename(filePath)))
  })
}


compileAllContracts();

copyDescFiles();