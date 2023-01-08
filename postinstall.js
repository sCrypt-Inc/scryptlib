
var fs = require("fs")
var autoPatch = require("./patches/applyPatch")

autoPatch();

if (fs.existsSync('./dist')) {
    var { getBinary } = require("./util/getBinary")
    getBinary()
}