const { getHostapdStatus } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    const status = await getHostapdStatus();

    request.end(200, { status });
}

module.exports.infos = {
    path: "/wifi/status",
    method: "GET"
}
