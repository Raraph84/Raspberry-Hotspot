const { query } = require("raraph84-lib");
const { getDhcpLease } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql").Pool} database 
 */
module.exports.run = async (request, database) => {

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

    let registeredDevice;
    try {
        registeredDevice = (await query(database, "SELECT * FROM Registered_Devices WHERE MAC_Address=?", [dhcpLease.mac]))[0];
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    request.end(200, {
        ...dhcpLease,
        firstName: registeredDevice ? registeredDevice.First_Name : null
    });
}

module.exports.infos = {
    path: "/dhcp/leases/:mac",
    method: "GET",
    requireLogin: true
}
