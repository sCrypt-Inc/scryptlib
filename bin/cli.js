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

  exec(`./node_modules/scryptlib/bin/scryptc-${FILENAME} ${process.argv.slice(2).join(' ')}`, (error, stdout, stderr) => {
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
