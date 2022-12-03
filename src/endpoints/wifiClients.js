const { getClients, getDhcpLeases } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    const clients = await getClients();
    const leases = await getDhcpLeases();

    request.end(200, { clients: clients.map((client) => ({ ...client, ...leases.find((lease) => lease.mac === client.mac) })) });
}

module.exports.infos = {
    path: "/wifi/clients",
    method: "GET",
    requireLogin: true
}
