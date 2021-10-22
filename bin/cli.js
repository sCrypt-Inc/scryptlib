#!/usr/bin/env node
const os = require('os');
const path = require('path');
const { exec } = require("child_process");
const { compile } = require('../dist/compilerWrapper.js');

function main() {
  let FILENAME = "Windows.exe";
  if (os.platform() === 'linux') {
      FILENAME = "Linux";
  } else if (os.platform() === 'darwin') {
      FILENAME = "macOS";
  }

  let scryptBinaryPath = process.env.npm_config_user_agent ? `./node_modules/scryptlib/bin/scryptc-${FILENAME}` : `./bin/scryptc-${FILENAME}`;
  compile(
    {
      path: process.argv.slice(2)[0]  //  the file path of the contract
    },
    {
      desc: true,
      asm: true,
      optimize: false,
      sourceMap: true,
      cmdPrefix: scryptBinaryPath
    }
  );
}

if (require.main === module) {
    main();
}
