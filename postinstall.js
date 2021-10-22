
const { execSync } = require("child_process");
const { exit } = require("process");



try {
    const cwd = process.cwd();
    console.log('workspace:', cwd)
    if (cwd.indexOf("node_modules") > -1) {
        process.chdir('../../');
        console.log('changed workspace:', process.cwd())

        execSync("npx patch-package --patch-dir node_modules/scryptlib/patches", { stdio: 'inherit' })
    } else {
        execSync("npx patch-package", { stdio: 'inherit' });
    }
} catch (error) {
    console.error(error)
    exit(-1)
}

// download binary
getBinary();
