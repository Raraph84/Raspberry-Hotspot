const { getConfig } = require("raraph84-lib");
const { exec, addRuleIfNotExists, getHostapdStatus, startHostapd } = require("./utils");
const Config = getConfig(__dirname + "/..");

/**
 * @param {string} internetInterface 
 */
module.exports.start = async (internetInterface) => {

    // Delete unwanted default routes
    const routes = (await exec("ip route")).split("\n");
    for (const route of routes.filter((route) => route.startsWith("default") && !route.includes(internetInterface)))
        await exec("ip route del " + route);

    // Route traffic with iptables if rules are not already set
    await addRuleIfNotExists("POSTROUTING -o " + internetInterface + " -j MASQUERADE -t nat");
    await addRuleIfNotExists("FORWARD -i " + internetInterface + " -o " + Config.hotspotInterface + " -m state --state RELATED,ESTABLISHED -j ACCEPT");
    await addRuleIfNotExists("FORWARD -i " + Config.hotspotInterface + " -o " + internetInterface + " -j ACCEPT");

    // Start hostapd if not already started
    if (!await getHostapdStatus())
        await startHostapd();
}
