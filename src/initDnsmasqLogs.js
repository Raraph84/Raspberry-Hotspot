const { spawn } = require("child_process");
const { query } = require("raraph84-lib");
const { getDhcpLeases } = require("./utils");

/**
 * @param {import("mysql").Pool} database 
 * @param {import("raraph84-lib/src/WebSocketServer")} gateway
 */
module.exports.start = async (database, gateway) => {

    const proc = spawn("tail", ["-f", "/var/log/dnsmasq.log"]);
    proc.stdout.on("data", async (data) => {
        for (const line of data.toString().trim().split("\n")) {

            const parts = line.split(" ").filter((part) => part !== "");
            if (parts.length !== 8 || !parts[4].startsWith("query")) return;

            const lease = (await getDhcpLeases()).find((lease) => lease.ip === parts[7]);

            let registeredDevice;
            if (lease) {
                try {
                    registeredDevice = (await query(database, "SELECT * FROM Registered_Devices WHERE MAC_Address=?", [lease.mac]))[0];
                } catch (error) {
                    console.log(`SQL Error - ${__filename} - ${error}`);
                    return;
                }
            }

            gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("DNS_QUERY", { mac: lease ? lease.mac : null, name: registeredDevice ? registeredDevice.First_Name : parts[7], domain: parts[5] }));
        }
    });
}
