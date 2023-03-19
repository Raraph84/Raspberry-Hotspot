const { query } = require("raraph84-lib");

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

    let bannedDevice;
    try {
        bannedDevice = (await query(database, "SELECT Banned_Devices.*, Registered_Devices.First_Name FROM Banned_Devices LEFT JOIN Registered_Devices ON Banned_Devices.MAC_Address=Registered_Devices.MAC_Address WHERE Banned_Devices.MAC_Address=?", [mac]))[0];
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    if (!bannedDevice) {
        request.end(400, "Device not banned");
        return;
    }

    request.end(200, {
        mac: bannedDevice.MAC_Address,
        reason: bannedDevice.Reason,
        firstName: bannedDevice.First_Name || null
    });
}

module.exports.infos = {
    path: "/banneddevices/:mac",
    method: "GET",
    requireLogin: true
}
