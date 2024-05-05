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

    let registeredDevice;
    try {
        [registeredDevice] = await database.query("SELECT * FROM Registered_Devices WHERE MAC_Address=?", [mac]);
        registeredDevice = registeredDevice[0];
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    if (!registeredDevice) {
        request.end(400, "Device not registered");
        return;
    }

    try {
        await database.query("DELETE FROM Registered_Devices WHERE MAC_Address=?", [registeredDevice.MAC_Address]);
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    request.end(204);
}

module.exports.infos = {
    path: "/registereddevices/:mac",
    method: "DELETE",
    requireLogin: true
}
