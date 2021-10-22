
const { execSync } = require("child_process");
const { exit } = require("process");
const { join, basename } = require("path");
const { existsSync, rmdirSync } = require('fs');

function isDev() {
    const cwd = process.cwd();
    if (cwd.indexOf("node_modules") > -1) {
        return false;
    }

    return true;
}

const _isDev = isDev();


function rmNodeModules() {

    let target = _isDev ? join(__dirname, 'node_modules') : join(__dirname, '..');
    if (basename(target) === "node_modules" && existsSync(target)) {
        rmdirSync(target, { recursive: true });
        console.log('deleted node_modules ');
    } else {
        console.error('target [' + target + "] not found")
    }
}

try {
    const cwd = process.cwd();
    console.log('workspace:', cwd)
    if (!_isDev) {
        process.chdir('../../');
        console.log('changed workspace:', process.cwd())

        execSync("npx patch-package --patch-dir node_modules/scryptlib/patches --error-on-fail", { stdio: 'inherit' })
    } else {
        execSync("npx patch-package --error-on-fail", { stdio: 'inherit' });
    }

} catch (error) {

    try {

        console.log('Patch failed, removing node_modules and trying again ...')
        rmNodeModules();
        execSync("npm install", { stdio: 'inherit' });

    } catch (error) {

        console.error('retry failed', error);
        exit(-1)
    }

}

// download binary
getBinary();
