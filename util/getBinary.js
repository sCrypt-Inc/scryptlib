const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const os = require('os');
const fs = require('fs');
const stream = require('stream');
const util = require('util');

console.log(process.argv.slice(2));

const getBinary = async () => {
  let FILENAME = "Windows.exe";
  const VERSION = process.argv.slice(2);

  if (os.platform() === 'linux') {
      FILENAME = "Linux";
  } else if (os.platform() === 'darwin') {
      FILENAME = "macOS";
  }

  const streamPipeline = util.promisify(stream.pipeline);
  const urlCompiler= `https://github.com/sCrypt-Inc/compiler_dist/releases/download/v${VERSION}/scryptc-${VERSION}-${FILENAME}`
  const filePathCompiler = `${__dirname}/../bin/scryptc-${FILENAME}`;
  const response = await fetch(urlCompiler);

  if (!response.ok) {
    console.log(`Download Unsuccesful: ${response.statusText}`);
  }

  await streamPipeline(response.body, fs.createWriteStream(filePathCompiler));
  console.log(`Download Successful`);
}

if (require.main === module) {
  getBinary();
}

module.exports = getBinary;
