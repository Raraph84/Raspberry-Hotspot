const { getClient, disconnectClient } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql2/promise").Pool} database 
 */
module.exports.run = async (request, database) => {

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

    await disconnectClient(wifiClient.mac);

    request.end(204);
}

module.exports.infos = {
    path: "/wifi/clients/:mac",
    method: "DELETE",
    requireLogin: true
}
