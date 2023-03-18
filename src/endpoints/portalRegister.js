const { query } = require("raraph84-lib");
const { getDhcpLeases, addIpToIpset } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql").Pool} database 
 */
module.exports.run = async (request, database) => {

    let message;
    try {
        message = JSON.parse(request.data);
    } catch (error) {
        request.end(400, "Invalid JSON");
        return;
    }

    if (typeof message.firstName === "undefined") {
        request.end(400, "Missing firstName");
        return;
    }

    if (typeof message.firstName !== "string") {
        request.end(400, "FirstName must be a string");
        return;
    }

    if (message.firstName.length === 0) {
        request.end(400, "FirstName cannot be empty");
        return;
    }

    if (message.firstName.length > 50) {
        request.end(400, "FirstName too long");
        return;
    }

    const lease = (await getDhcpLeases()).find((lease) => lease.ip === request.ip);
    if (!lease) {
        request.end(400, "Device not found");
        return;
    }

    let registeredDevice;
    try {
        registeredDevice = (await query(database, "SELECT * FROM Registered_Devices WHERE MAC_Address=?", [lease.mac]))[0];
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    if (registeredDevice) {
        request.end(400, "Device already registered");
        return;
    }

    try {
        await query(database, "INSERT INTO Registered_Devices (MAC_Address, First_Name) VALUES (?, ?)", [lease.mac, message.firstName]);
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    await addIpToIpset(lease.ip, "authorized");

    request.end(204);
}

module.exports.infos = {
    path: "/portal/register",
    method: "POST",
    requireLogin: false
}
