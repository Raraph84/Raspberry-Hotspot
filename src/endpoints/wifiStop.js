const { getHostapdStatus, stopHostapd } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    const status = await getHostapdStatus();

    if (!status) {
        request.end(400, "Wifi is already stopped");
        return;
    }

    await stopHostapd();

    request.end(204);
}

module.exports.infos = {
    path: "/wifi/stop",
    method: "POST",
    requireLogin: true
}
