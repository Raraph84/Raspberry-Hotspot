const { getHostapdStatus, startHostapd } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    const status = await getHostapdStatus();

    if (status) {
        request.end(400, "Wifi is already started");
        return;
    }

    await startHostapd();

    request.end(204);
}

module.exports.infos = {
    path: "/wifi/start",
    method: "POST",
    requireLogin: true
}
