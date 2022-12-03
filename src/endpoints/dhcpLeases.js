const { getDhcpLeases } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    const leases = await getDhcpLeases();

    request.end(200, { leases });
}

module.exports.infos = {
    path: "/dhcp/leases",
    method: "GET",
    requireLogin: true
}
