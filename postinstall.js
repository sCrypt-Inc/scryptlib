const { exec } = require("child_process");
var fs = require('fs');
var path = require('path');
const { exit } = require("process");


function apply(patches) {
    let cmd = "git apply --ignore-whitespace  " + patches;
    console.log(cmd)
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`error: ${error.message}`);
            console.log(`scryptlib: please delete bsv in the node_moudules and run npm install again.`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`scryptlib: apply patches successfully: ${stdout}`);
    });
}


let patches = path.join(__dirname, 'patches/bsv+1.5.6.patch');

if (!fs.existsSync(patches)) {
    console.error(`can not found patches ...`);
    exit(1);
}

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


