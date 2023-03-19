const { getDhcpLease } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 */
module.exports.run = async (request) => {

    const mac = request.urlParams.mac.toLowerCase();

    if (!/^([0-9a-f]{2}[:]){5}([0-9a-f]{2})$/.test(mac)) {
        request.end(400, "Invalid MAC address");
        return;
    }

    let dhcpLease;
    try {
        dhcpLease = await getDhcpLease(mac);
    } catch (error) {
        request.end(400, "This dhcp lease does not exist");
        return;
    }

    request.end(200, dhcpLease);
}

module.exports.infos = {
    path: "/dhcp/leases/:mac",
    method: "GET",
    requireLogin: true
}
