/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql2/promise").Pool} database 
 */
module.exports.run = async (request, database) => {

    let registeredDevices;
    try {
        [registeredDevices] = await database.query("SELECT * FROM Registered_Devices");
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    request.end(200, {
        registeredDevices: registeredDevices.map((registeredDevice) => ({
            mac: registeredDevice.MAC_Address,
            firstName: registeredDevice.First_Name,
            registeredDate: registeredDevice.Registered_Date
        }))
    });
}

module.exports.infos = {
    path: "/registereddevices",
    method: "GET",
    requireLogin: true
}
