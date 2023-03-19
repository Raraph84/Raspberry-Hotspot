const { query } = require("raraph84-lib");
const { getClients } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql").Pool} database 
 */
module.exports.run = async (request, database) => {

    const wifiClients = await getClients();

    let registeredDevices;
    try {
        registeredDevices = await query(database, "SELECT * FROM Registered_Devices");
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    request.end(200, {
        wifiClients: wifiClients.map((wifiClient) => {
            const registeredDevice = registeredDevices.find((registeredDevice) => registeredDevice.MAC_Address === wifiClient.mac);
            return {
                ...wifiClient,
                firstName: registeredDevice ? registeredDevice.First_Name : null
            }
        })
    });
}

module.exports.infos = {
    path: "/wifi/clients",
    method: "GET",
    requireLogin: true
}
