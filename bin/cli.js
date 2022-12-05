#!/usr/bin/env node
const { findCompiler } = require('../dist/findCompiler.js');
const { getBinary, safeCompilerVersion } = require("../util/getBinary");
const { compileScryptFile } = require("../util/compile");


function main() {
  require('yargs')
    .scriptName("scryptlib")
    .usage('$0 <cmd> [args]')
    .version(false)
    .command('compile [file]', 'compile scrypt contract file', (yargs) => {
      yargs.positional('file', {
        type: 'string',
        default: 'demo.scrypt',
        describe: 'the scrypt file to be compiled'
      })
    }, function (argv) {
      compileScryptFile(argv.file)
    })
    .command('download [version]', 'download scrypt compiler', (yargs) => {
      yargs.positional('version', {
        type: 'string',
        default: '',
        describe: 'the scrypt compiler version to be compiled, default latest.'
      })
    }, function (argv) {
      getBinary(argv.version)
    })
    .command('version', 'show scrypt compiler version', (yargs) => {

    }, function (argv) {
      let scryptc = findCompiler()
      if (scryptc) {
        console.info(safeCompilerVersion(scryptc))
      } else {
        console.log("No scrypt compiler found.")
      }

    })
    .help()
    .argv

  // const arg = process.argv.slice(2)[0];


  // if (arg === 'download') {
  //   getBinary()
  //   return;
  // }

}

if (require.main === module) {
  main();
}
