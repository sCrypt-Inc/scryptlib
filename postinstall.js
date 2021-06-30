const { exec } = require("child_process");
var fs = require('fs');
var path = require('path');
const { exit } = require("process");


function apply(patches) {
    let cmd = "git apply --ignore-whitespace  " + patches;
    console.log(cmd)
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`apply patches successfully: ${stdout}`);
    });
}


let patches = path.join(__dirname, 'patches/bsv+1.5.6.patch');

if (!fs.existsSync(patches)) {
    console.error(`can not found patches ...`);
    exit(1);
}

console.log('patches', patches);

let bsv = path.join(__dirname, 'node_modules', 'bsv');


if (fs.existsSync(bsv)) {
    checkIfIDE(bsv)
    apply(patches)
} else {

    bsv = path.join(__dirname, '..', 'bsv');
    if (fs.existsSync(bsv)) {
        checkIfIDE(bsv)
        const cwd = process.cwd();
        console.log('cwd', cwd);
        //chdir
        process.chdir('../../');
        apply(patches)
        //restore dir
        process.chdir(cwd);
    }
}


function checkIfIDE(bsv) {
    console.log('checkIfIDE', bsv);
    let bsvPackage = path.join(bsv, 'package.json');
    if (JSON.parse(fs.readFileSync(bsvPackage)).ide) {
        console.log('sCrypt IDE bsv, ignore patches')
        exit(0);
    }
}
