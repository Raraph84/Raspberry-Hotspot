const { getClients } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    request.end(200, { wifiClients: await getClients() });
}

module.exports.infos = {
    path: "/wifi/clients",
    method: "GET",
    requireLogin: true
}
