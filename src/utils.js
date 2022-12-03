const { spawn } = require("child_process");
const { totalmem, freemem, uptime } = require("os");

/**
 * @param {String} command 
 * @returns {Promise<String>} 
 */
const exec = (command) => new Promise((resolve, reject) => {
    const proc = spawn("bash", ["-c", command]);
    let output = "";
    proc.stdout.on("data", (data) => output += data.toString());
    proc.on("close", (code) => {
        if (code !== 0) reject(code);
        else resolve(output);
    });
});

/**
 * @param {String} rule 
 */
const addRuleIfNotExists = async (rule) => {
    try {
        await exec("iptables -C " + rule);
    } catch (error) {
        await exec("iptables -A " + rule);
    }
}

/**
 * @param {String} rule 
 */
const deleteRuleIfExists = async (rule) => {
    try {
        await exec("iptables -C " + rule);
    } catch (error) {
        return;
    }
    await exec("iptables -D " + rule);
}

const getSystemStats = async () => {

    const infos = {};

    const nproc = parseInt(await exec("nproc --all"));
    const loadavg = parseFloat(await exec("awk '{print $1}' /proc/loadavg"));
    infos.cpuUsage = Math.round(loadavg * 100 / nproc * 100) / 100;

    const temp = parseInt(await exec("cat /sys/class/thermal/thermal_zone0/temp"));
    infos.cpuTemp = Math.round(temp / 1000 * 100) / 100;

    infos.totalMem = Math.round(totalmem() / 1024 / 1024 / 1024 * 100) / 100;
    infos.usedMem = Math.round((totalmem() - freemem()) / 1024 / 1024 / 1024 * 100) / 100;

    infos.uptime = uptime() * 1000;

    return infos;
}

const poweroff = async () => {
    await exec("poweroff");
}

const getHostapdStatus = async () => {
    try {
        await exec("pidof hostapd");
    } catch (error) {
        return false;
    }
    return true;
}

const startHostapd = async () => {
    await exec("service hostapd start");
}

const stopHostapd = async () => {
    await exec("service hostapd stop");
}

const getClients = async () => {

    const clients = [];
    const rawClients = (await exec("iw dev wlan0 station dump")).split("Station").slice(1);

    for (const rawClient of rawClients) {

        const lines = rawClient.trim().split("\n");
        const header = lines[0].trim();
        const infos = lines.slice(1).map((line) => line.split(":").map((part) => part.trim()));

        clients.push({
            mac: header.split(" ")[0],
            rxBytes: parseInt(infos.find((info) => info[0] === "rx bytes")[1]),
            txBytes: parseInt(infos.find((info) => info[0] === "tx bytes")[1]),
            connectedDuration: parseInt(infos.find((info) => info[0] === "connected time")[1]) * 1000
        });
    }

    return clients;
}

const getClient = async (mac) => {

    const rawClient = await exec("iw dev wlan0 station get " + mac);
    const lines = rawClient.trim().split("\n");
    const header = lines[0].trim();
    const infos = lines.slice(1).map((line) => line.split(":").map((part) => part.trim()));

    return {
        mac: header.split(" ")[0],
        rxBytes: parseInt(infos.find((info) => info[0] === "rx bytes")[1]),
        txBytes: parseInt(infos.find((info) => info[0] === "tx bytes")[1]),
        connectedDuration: parseInt(infos.find((info) => info[0] === "connected time")[1]) * 1000
    };
}

const getDhcpLeases = async () => {

    const leases = [];
    const rawLeases = (await exec("cat /var/lib/misc/dnsmasq.leases")).trim().split("\n");

    for (const rawLease of rawLeases) {

        const infos = rawLease.split(" ");

        leases.push({
            mac: infos[1],
            ip: infos[2],
            hostname: infos[3] === "*" ? null : infos[3],
            expirationDate: parseInt(infos[0]) * 1000
        });
    }

    return leases;
}

const getDhcpLease = async (mac) => {

    const rawLease = await exec("cat /var/lib/misc/dnsmasq.leases | grep " + mac);
    const infos = rawLease.split(" ");

    return {
        mac: infos[1],
        ip: infos[2],
        hostname: infos[3] === "*" ? null : infos[3],
        expirationDate: parseInt(infos[0]) * 1000
    };
}

const getBandwidthUsage = async (interface) => {
    const stats = JSON.parse(await exec("vnstat -i " + interface + " --json"));
    return stats.interfaces[0].traffic;
}

module.exports = {
    exec,
    addRuleIfNotExists,
    deleteRuleIfExists,
    poweroff,
    getSystemStats,
    getHostapdStatus,
    startHostapd,
    stopHostapd,
    getClients,
    getClient,
    getDhcpLeases,
    getDhcpLease,
    getBandwidthUsage
}
