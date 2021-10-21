const { exec } = require("child_process");
const fs = require('fs');
const os = require('os');
const { basename } = require("path");
const { basename, join } = require("path");
const { exit } = require("process");
const getBinary = require("./util/getBinary");

function apply(patches) {
    patches.forEach(patch => {
        let cmd = "git apply --ignore-whitespace  " + patch;
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


let patches = [join(__dirname, 'patches/bsv+1.5.6.patch'), join(__dirname, 'patches/json-bigint+1.0.0.patch')];

patches.forEach(patch => {
    if (!fs.existsSync(patch)) {
        console.error(`can not found patch ${patch} ...`);
        exit(1);
    }
})


const cwd = process.cwd();
console.log('scryptlib: cwd', cwd);

console.log('scryptlib: patches', patches);

let bsv = join(__dirname, 'node_modules', 'bsv');


if (fs.existsSync(bsv)) {
    apply(patches)
} else {

    bsv = join(__dirname, '..', 'bsv');
    if (fs.existsSync(bsv)) {

        //chdir
        process.chdir('../../');
        apply(patches)
        //restore dir
        process.chdir(cwd);
    }
}

// download binary
getBinary();
