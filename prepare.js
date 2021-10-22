const fs = require('fs');
const { join } = require("path");
const { execSync } = require("child_process");



function isDev() {
    const cwd = process.cwd();
    if (cwd.indexOf("node_modules") > -1) {
        return false;
    }

    return true;
}


function rmdir(m) {

    if (Array.isArray(m)) {
        m.forEach(dir => {
            rmdir(dir);
        })
    } else {
        let target = isDev() ? join(__dirname, 'node_modules', m) : join(__dirname, '..', m);

        if (fs.existsSync(target)) {
            console.log('deleted node_modules:' + m);
            fs.rmdirSync(target, { recursive: true });
        } else {
            console.error('target' + target + " not found")
        }
    }
}


rmdir(['bsv', 'json-bigint']);
