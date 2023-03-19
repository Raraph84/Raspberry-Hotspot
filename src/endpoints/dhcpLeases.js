const { getDhcpLeases } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    request.end(200, { dhcpLeases: await getDhcpLeases() });
}

module.exports.infos = {
    path: "/dhcp/leases",
    method: "GET",
    requireLogin: true
}
