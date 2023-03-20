const { reboot } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    request.end(204);

    setTimeout(() => reboot(), 500);
}

module.exports.infos = {
    path: "/system/reboot",
    method: "POST",
    requireLogin: true
}
