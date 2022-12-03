const { getClient, getDhcpLease } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    const mac = request.urlParams.mac.toLowerCase();

    if (!/^([0-9a-f]{2}[:]){5}([0-9a-f]{2})$/.test(mac)) {
        request.end(400, "Invalid MAC address");
        return;
    }

    let client;
    try {
        client = await getClient(mac);
    } catch (error) {
        request.end(400, "This client does not exist");
        return;
    }

    const lease = await getDhcpLease(mac);

    request.end(200, { ...client, ...lease });
}

module.exports.infos = {
    path: "/wifi/clients/:mac",
    method: "GET",
    requireLogin: true
}
