const { query } = require("raraph84-lib");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql").Pool} database 
 */
module.exports.run = async (request, database) => {

    let bannedDevices;
    try {
        bannedDevices = await query(database, "SELECT Banned_Devices.*, Registered_Devices.First_Name FROM Banned_Devices LEFT JOIN Registered_Devices ON Banned_Devices.MAC_Address=Registered_Devices.MAC_Address");
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    request.end(200, {
        bannedDevices: bannedDevices.map((bannedDevice) => ({
            mac: bannedDevice.MAC_Address,
            reason: bannedDevice.Reason,
            firstName: bannedDevice.First_Name || null
        }))
    });
}

module.exports.infos = {
    path: "/banneddevices",
    method: "GET",
    requireLogin: true
}
