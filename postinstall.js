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

const cwd = process.cwd();

if (fs.existsSync(bsv)) {

    apply(patches)

} else {

    bsv = path.join(__dirname, '..', 'bsv');

    if (fs.existsSync(bsv)) {
        const cwd = process.cwd();
        console.log('cwd', cwd);
        //chdir
        process.chdir('../../');
        apply(patches)
        //restore dir
        process.chdir(cwd);
    }
}
