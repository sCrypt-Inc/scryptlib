import glob = require('glob');
import { join } from 'path';
import { compileContract } from '../../src/utils';
import { exit } from 'process';

function compileAllContracts() {
  const contracts = glob.sync(join(__dirname, './*.scrypt'));
  contracts.forEach(filePath => {

    const result = compileContract(filePath, join(__dirname, "..", "..", "out"));

    if (result.errors.length > 0) {
      console.log(`Contract ${filePath} compiling failed with errors:`);
      console.log(result.errors);
      exit(1);
    }
  })
}

compileAllContracts();