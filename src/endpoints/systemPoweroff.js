const { poweroff } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    request.end(204);

    setTimeout(() => poweroff(), 500);
}

module.exports.infos = {
    path: "/system/poweroff",
    method: "POST",
    requireLogin: true
}
