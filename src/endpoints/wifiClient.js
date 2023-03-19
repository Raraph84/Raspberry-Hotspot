const { query } = require("raraph84-lib");
const { getClient } = require("../utils");

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

    let wifiClient;
    try {
        wifiClient = await getClient(mac);
    } catch (error) {
        request.end(400, "This client does not exist");
        return;
    }

    let registeredDevice;
    try {
        registeredDevice = (await query(database, "SELECT * FROM Registered_Devices WHERE MAC_Address=?", [wifiClient.mac]))[0];
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    request.end(200, {
        ...wifiClient,
        firstName: registeredDevice ? registeredDevice.First_Name : null
    });
}

module.exports.infos = {
    path: "/wifi/clients/:mac",
    method: "GET",
    requireLogin: true
}
