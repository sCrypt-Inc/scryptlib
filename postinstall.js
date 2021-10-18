const { exec } = require("child_process");

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const request = require('request');
const { basename } = require("path");
const { exit } = require("process");

function apply(patches) {
    patches.forEach(patch => {
        let cmd = "git apply --ignore-whitespace  " + patch;
        console.log(cmd)
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`error: ${error.message}`);
                console.log(`scryptlib: please delete module related to ${basename(patch)} in the node_modules and run npm install again.`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }
            console.log(`scryptlib: apply ${patch} successfully: ${stdout}`);
        });

    })

}


let patches = [path.join(__dirname, 'patches/bsv+1.5.6.patch'), path.join(__dirname, 'patches/json-bigint+1.0.0.patch')];

patches.forEach(patch => {
    if (!fs.existsSync(patch)) {
        console.error(`can not found patch ${patch} ...`);
        exit(1);
    }
})


const cwd = process.cwd();
console.log('scryptlib: cwd', cwd);

console.log('scryptlib: patches', patches);

let bsv = path.join(__dirname, 'node_modules', 'bsv');


if (fs.existsSync(bsv)) {
    apply(patches)
} else {

    bsv = path.join(__dirname, '..', 'bsv');
    if (fs.existsSync(bsv)) {

        //chdir
        process.chdir('../../');
        apply(patches)
        //restore dir
        process.chdir(cwd);
    }
}

// download binary

let FILENAME = "Windows.exe";
const VERSION = "1.4.0"; // TODO: get it dynamically

if (os.platform() === 'linux') {
    FILENAME = "Linux";
} else if (os.platform() === 'darwin') {
    FILENAME = "macOS";
}

const urlCompiler= `https://github.com/sCrypt-Inc/compiler_dist/releases/download/v${VERSION}/scryptc-${VERSION}-${FILENAME}`
const filePathCompiler = `${__dirname}/bin/scryptc-${FILENAME}`;

request(urlCompiler)
.pipe(fs.createWriteStream(filePathCompiler))
.on('close', function () {
    console.log('File written!');
    fs.chmodSync(filePathCompiler, '755');
});
