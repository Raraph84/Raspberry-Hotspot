const { getConfig } = require("raraph84-lib");
const { createIpsetIfNoExists, flushIpset, addRuleIfNotExists, getDhcpLeases, addIpToIpset, removeIpFromIpset, listIpset } = require("./utils");
const config = getConfig(__dirname + "/..");

/**
 * @param {import("mysql2/promise").Pool} database 
 * @param {string} internetInterface 
 */
module.exports.start = async (database, internetInterface) => {

    await createIpsetIfNoExists("authorized", "hash:ip");
    await flushIpset("authorized");
    await addRuleIfNotExists("PREROUTING -i " + config.hotspotInterface + " -p tcp --dport 80 -m set ! --match-set authorized src -j DNAT --to-destination 192.168.2.1:80 -t nat");
    await addRuleIfNotExists("PREROUTING -i " + config.hotspotInterface + " -p tcp --dport 443 -m set ! --match-set authorized src -j DNAT --to-destination 192.168.2.1:443 -t nat");
    await addRuleIfNotExists("FORWARD -i " + config.hotspotInterface + " -o " + internetInterface + " -m set ! --match-set authorized src -j DROP", true);

    await this.updateSet(database);
    setInterval(() => this.updateSet(database), 10 * 1000);
}

/**
 * @param {import("mysql2/promise").Pool} database 
 */
module.exports.updateSet = async (database) => {

    let registeredDevices;
    try {
        [registeredDevices] = await database.query("SELECT * FROM Registered_Devices");
    } catch (error) {
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    const authorizedIps = await listIpset("authorized");
    const dhcpLeases = await getDhcpLeases();

    for (const authorizedIp of authorizedIps) {
        const lease = dhcpLeases.find((lease) => lease.ip === authorizedIp);
        if (!lease || !registeredDevices.some((device) => device.MAC_Address === lease.mac))
            await removeIpFromIpset(authorizedIp, "authorized");
    }

    for (const registeredDevice of registeredDevices) {
        const lease = dhcpLeases.find((lease) => lease.mac === registeredDevice.MAC_Address);
        if (lease && !authorizedIps.some((ip) => ip === lease.ip))
            await addIpToIpset(lease.ip, "authorized");
    }
}
