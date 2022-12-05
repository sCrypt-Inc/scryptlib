var autoPatch = require("./patches/applyPatch")
var { getBinary } = require("./util/getBinary")

autoPatch();

getBinary()
