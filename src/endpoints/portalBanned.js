const { getDhcpLeases } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql2/promise").Pool} database 
 */
module.exports.run = async (request, database) => {

    const lease = (await getDhcpLeases()).find((lease) => lease.ip === request.ip);
    if (!lease) {
        request.end(400, "Device not found");
        return;
    }

    let bannedDevice;
    try {
        [bannedDevice] = await database.query("SELECT * FROM Banned_Devices WHERE MAC_Address=?", [lease.mac]);
        bannedDevice = bannedDevice[0];
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    if (!bannedDevice) request.end(200, { banned: false });
    else request.end(200, { banned: true, reason: bannedDevice.Reason });
}

module.exports.infos = {
    path: "/portal/banned",
    method: "GET",
    requireLogin: false
}
