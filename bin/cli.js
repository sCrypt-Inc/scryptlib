#!/usr/bin/env node
const os = require('os');
const path = require('path');
const { exec } = require("child_process");

function main() {
  let FILENAME = "Windows.exe";
  if (os.platform() === 'linux') {
      FILENAME = "Linux";
  } else if (os.platform() === 'darwin') {
      FILENAME = "macOS";
  }

  let scryptBinaryPath = process.env.npm_config_user_agent ? `./node_modules/scryptlib/bin/scryptc-${FILENAME}` : `./bin/scryptc-${FILENAME}`;
  exec(`${scryptBinaryPath} ${process.argv.slice(2).join(' ')}`, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`${stdout}`);
  });
}

if (require.main === module) {
    main();
}
