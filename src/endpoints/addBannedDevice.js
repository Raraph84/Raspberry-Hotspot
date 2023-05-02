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

    if (typeof message.mac === "undefined") {
        request.end(400, "Missing mac");
        return;
    }

    if (typeof message.mac !== "string") {
        request.end(400, "Mac must be a string");
        return;
    }

    if (!/^([0-9a-f]{2}[:]){5}([0-9a-f]{2})$/.test(message.mac)) {
        request.end(400, "Invalid mac");
        return;
    }

    if (typeof message.reason === "undefined") {
        request.end(400, "Missing reason");
        return;
    }

    if (typeof message.reason !== "string") {
        request.end(400, "Reason must be a string");
        return;
    }

    if (message.reason.length === 0) {
        request.end(400, "Reason cannot be empty");
        return;
    }

    if (message.reason.length > 500) {
        request.end(400, "Reason too long");
        return;
    }

    let bannedDevice;
    try {
        bannedDevice = (await query(database, "SELECT * FROM Banned_Devices WHERE MAC_Address=?", [message.mac]))[0];
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    if (bannedDevice) {
        request.end(400, "Device already banned");
        return;
    }

    try {
        await query(database, "INSERT INTO Banned_Devices (MAC_Address, Reason) VALUES (?, ?)", [message.mac, message.reason]);
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    const dhcpLeases = await getDhcpLeases();
    const dhcpLease = dhcpLeases.find((lease) => lease.mac === message.mac);
    if (dhcpLease) await addIpToIpset(dhcpLease.ip, "banned");

    request.end(204);
}

module.exports.infos = {
    path: "/banneddevices",
    method: "POST",
    requireLogin: true
}
