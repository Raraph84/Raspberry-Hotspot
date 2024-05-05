const { getConfig } = require("raraph84-lib");
const { createIpsetIfNoExists, flushIpset, addRuleIfNotExists, getDhcpLeases, listIpset, addIpToIpset, removeIpFromIpset } = require("./utils");
const config = getConfig(__dirname + "/..");

/**
 * @param {import("mysql2/promise").Pool} database 
 * @param {string} internetInterface 
 */
module.exports.start = async (database, internetInterface) => {

    await createIpsetIfNoExists("banned", "hash:ip");
    await flushIpset("banned");
    await addRuleIfNotExists("PREROUTING -i " + config.hotspotInterface + " -p tcp --dport 80 -m set --match-set banned src -j DNAT --to-destination 192.168.2.1:80 -t nat");
    await addRuleIfNotExists("PREROUTING -i " + config.hotspotInterface + " -p tcp --dport 443 -m set --match-set banned src -j DNAT --to-destination 192.168.2.1:443 -t nat");
    await addRuleIfNotExists("FORWARD -i " + config.hotspotInterface + " -o " + internetInterface + " -m set --match-set banned src -j DROP", true);

    await this.updateSet(database);
    setInterval(() => this.updateSet(database), 10 * 1000);
}

/**
 * @param {import("mysql2/promise").Pool} database 
 */
module.exports.updateSet = async (database) => {

    let bannedDevices;
    try {
        [bannedDevices] = await database.query("SELECT * FROM Banned_Devices");
    } catch (error) {
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    const bannedIps = await listIpset("banned");
    const dhcpLeases = await getDhcpLeases();

    for (const bannedIp of bannedIps) {
        const lease = dhcpLeases.find((lease) => lease.ip === bannedIp);
        if (!lease || !bannedDevices.some((device) => device.MAC_Address === lease.mac))
            await removeIpFromIpset(bannedIp, "banned");
    }

    for (const bannedDevice of bannedDevices) {
        const lease = dhcpLeases.find((lease) => lease.mac === bannedDevice.MAC_Address);
        if (lease && !bannedIps.some((ip) => ip === lease.ip))
            await addIpToIpset(lease.ip, "banned");
    }
}
