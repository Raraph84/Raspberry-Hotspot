const { query } = require("raraph84-lib");
const { getDhcpLeases } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql").Pool} database 
 */
module.exports.run = async (request, database) => {

    const dhcpLeases = await getDhcpLeases();

    let registeredDevices;
    try {
        registeredDevices = await query(database, "SELECT * FROM Registered_Devices");
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    request.end(200, {
        dhcpLeases: dhcpLeases.map((dhcpLease) => {
            const registeredDevice = registeredDevices.find((registeredDevice) => registeredDevice.MAC_Address === dhcpLease.mac);
            return {
                ...dhcpLease,
                firstName: registeredDevice ? registeredDevice.First_Name : null
            }
        })
    });
}

module.exports.infos = {
    path: "/dhcp/leases",
    method: "GET",
    requireLogin: true
}
