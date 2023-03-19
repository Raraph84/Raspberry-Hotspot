const { getClient } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    const mac = request.urlParams.mac.toLowerCase();

    if (!/^([0-9a-f]{2}[:]){5}([0-9a-f]{2})$/.test(mac)) {
        request.end(400, "Invalid MAC address");
        return;
    }

    let wifiClient;
    try {
        wifiClient = await getClient(mac);
    } catch (error) {
        request.end(400, "This client does not exist");
        return;
    }

    request.end(200, wifiClient);
}

module.exports.infos = {
    path: "/wifi/clients/:mac",
    method: "GET",
    requireLogin: true
}
