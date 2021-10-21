const fs = require('fs');
const { join } = require("path");
const { execSync } = require("child_process");



function isDev() {
    let target = join(__dirname, 'node_modules', "bsv");
    return fs.existsSync(target);
}

const isDevEnv = isDev();

function rmdir(m) {

    if (Array.isArray(m)) {
        m.forEach(dir => {
            rmdir(dir);
        })
    } else {
        let target = isDevEnv ? join(__dirname, 'node_modules', m) : join(__dirname, '..', m);

        if (fs.existsSync(target)) {
            fs.rmdirSync(target, { recursive: true });
        } else {
            console.error('target' + target + " not found")
        }
    }
}


if (isDevEnv) {
    rmdir(['bsv', 'json-bigint']);
} else {
    console.log('uninstalling scryptlib ...')
    const output = execSync("npm uninstall scryptlib --no-save");
    console.log('uninstalled scryptlib：', output.toString())
}


