const { getSystemStats } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    const stats = await getSystemStats();

    request.end(200, stats);
}

module.exports.infos = {
    path: "/system/stats",
    method: "GET",
    requireLogin: true
}
