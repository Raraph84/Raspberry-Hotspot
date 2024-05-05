const { spawn } = require("child_process");
const { query } = require("raraph84-lib");
const { getDhcpLeases } = require("./utils");

module.exports.lastQueries = [];

/**
 * @param {import("mysql").Pool} database 
 * @param {import("raraph84-lib/src/WebSocketServer")} gateway
 */
module.exports.start = (database, gateway) => {

    const proc = spawn("tail", ["-n", "0", "-F", "/var/log/dnsmasq.log"]);

    let processing = false;
    let data = [""];
    proc.stdout.on("data", async (chunk) => {

        const date = Date.now();

        data[data.length - 1] += chunk.toString().split("\n")[0];
        data.push(...chunk.toString().split("\n").slice(1));

        if (processing) return;
        processing = true;
        while (data.length > 1)
            await onLine(date, data.shift());
        processing = false;
    });

    const onLine = async (date, line) => {

        const parts = line.split(" ").filter((part) => part !== "");
        if (parts.length !== 8 || !parts[4].startsWith("query")) return;

        const lease = (await getDhcpLeases()).find((lease) => lease.ip === parts[7]);
        if (!lease) return;

        let registeredDevice;
        try {
            registeredDevice = (await query(database, "SELECT * FROM Registered_Devices WHERE MAC_Address=?", [lease.mac]))[0];
        } catch (error) {
            console.log(`SQL Error - ${__filename} - ${error}`);
            return;
        }

        const dnsQuery = { date, mac: lease.mac, name: registeredDevice ? registeredDevice.First_Name : parts[7], domain: parts[5] };

        gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("DNS_QUERY", dnsQuery));

        this.lastQueries.push(dnsQuery);
        if (this.lastQueries.length > 100) this.lastQueries.shift();
    }
}
