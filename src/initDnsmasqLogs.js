const { spawn } = require("child_process");
const { getDhcpLeases } = require("./utils");

module.exports.lastQueries = [];

/**
 * @param {import("mysql2/promise").Pool} database 
 * @param {import("raraph84-lib/src/WebSocketServer")} gateway
 */
module.exports.start = (database, gateway) => {

    const proc = spawn("tail", ["-n", "0", "-F", "/var/log/dnsmasq.log"]);

    let processing = false;
    let output = "";
    const onData = async (data) => {

        output += data;
        if (processing) return;
        processing = true;

        const date = Date.now();

        while (output.includes("\n")) {
            const line = output.slice(0, output.indexOf("\n"));
            output = output.slice(output.indexOf("\n") + 1);
            await onLine(date, line);
        }

        processing = false;
    };
    proc.stdout.on("data", (data) => onData(data.toString()));
    proc.stderr.on("data", (data) => onData(data.toString()));

    const onLine = async (date, line) => {

        const parts = line.split(" ").filter((part) => part !== "");
        if (parts.length !== 8 || !parts[4].startsWith("query")) return;

        const lease = (await getDhcpLeases()).find((lease) => lease.ip === parts[7]);
        if (!lease) return;

        let registeredDevice;
        try {
            [registeredDevice] = await database.query("SELECT * FROM Registered_Devices WHERE MAC_Address=?", [lease.mac]);
            registeredDevice = registeredDevice[0];
        } catch (error) {
            console.log(`SQL Error - ${__filename} - ${error}`);
            return;
        }

        const dnsQuery = { date, mac: lease.mac, name: registeredDevice ? registeredDevice.First_Name : parts[7], domain: parts[5] };

        gateway.clients.filter((client) => client.infos.logged).forEach((client) => client.emitEvent("DNS_QUERY", dnsQuery));

        this.lastQueries.push(dnsQuery);
        if (this.lastQueries.length > 100) this.lastQueries.shift();
    };
}
