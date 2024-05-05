const { getDhcpLeases, removeIpFromIpset } = require("../utils");

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

    let bannedDevice;
    try {
        [bannedDevice] = await database.query("SELECT * FROM Banned_Devices WHERE MAC_Address=?", [mac]);
        bannedDevice = bannedDevice[0];
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    if (!bannedDevice) {
        request.end(400, "Device not banned");
        return;
    }

    try {
        await database.query("DELETE FROM Banned_Devices WHERE MAC_Address=?", [bannedDevice.MAC_Address]);
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    const dhcpLeases = await getDhcpLeases();
    const dhcpLease = dhcpLeases.find((lease) => lease.mac === bannedDevice.MAC_Address);
    if (dhcpLease) await removeIpFromIpset(dhcpLease.ip, "banned");

    request.end(204);
}

module.exports.infos = {
    path: "/banneddevices/:mac",
    method: "DELETE",
    requireLogin: true
}
