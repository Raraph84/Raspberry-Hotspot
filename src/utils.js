const { spawn } = require("child_process");
const { totalmem, freemem, uptime } = require("os");
const { promises: fs, existsSync } = require("fs");

/**
 * @param {string} command 
 * @returns {Promise<string>} 
 */
const exec = (command) => new Promise((resolve, reject) => {
    const proc = spawn("bash", ["-c", command]);
    let output = "";
    proc.stdout.on("data", (data) => output += data.toString());
    proc.stderr.on("data", (data) => output += data.toString());
    proc.on("close", (code) => {
        if (code !== 0) reject(code + " " + output);
        else resolve(output);
    });
});

/**
 * @param {string} rule 
 */
const addRuleIfNotExists = async (rule, insert = false) => {
    try {
        await exec("iptables -C " + rule);
    } catch (error) {
        await exec("iptables " + (insert ? "-I " : "-A ") + rule);
    }
}

/**
 * @param {string} rule 
 */
const deleteRuleIfExists = async (rule) => {
    try {
        await exec("iptables -C " + rule);
    } catch (error) {
        return;
    }
    await exec("iptables -D " + rule);
}

/**
 * @param {string} name 
 * @param {string} type 
 */
const createIpsetIfNoExists = async (name, type) => {
    try {
        await exec("ipset list " + name);
    } catch (error) {
        await exec("ipset create " + name + " " + type);
    }
}

/**
 * @param {string} name 
 */
const flushIpset = async (name) => {
    await exec("ipset flush " + name);
}

/**
 * @param {string} name 
 */
const listIpset = async (name) => {
    return (await exec("ipset list " + name)).trim().split("\n").slice(8);
}

/**
 * @param {string} name 
 * @param {string} ip 
 */
const addIpToIpset = async (ip, name) => {
    await exec("ipset add " + name + " " + ip);
}

/**
 * @param {string} name 
 * @param {string} ip 
 */
const removeIpFromIpset = async (ip, name) => {
    await exec("ipset del " + name + " " + ip);
}

const getProcTemp = async () => {
    const temp = parseInt(await fs.readFile("/sys/class/thermal/thermal_zone0/temp", "utf-8"));
    return cpuTemp = Math.round(temp / 1000 * 100) / 100;
}

const getSystemStats = async () => {

    const infos = {};

    const nproc = parseInt(await exec("nproc --all"));
    const loadavg = parseFloat(await exec("awk '{print $1}' /proc/loadavg"));
    infos.cpuUsage = Math.round(loadavg * 100 / nproc * 100) / 100;

    infos.cpuTemp = await getProcTemp();

    infos.totalMem = Math.round(totalmem() / 1024 / 1024 / 1024 * 100) / 100;
    infos.usedMem = Math.round((totalmem() - freemem()) / 1024 / 1024 / 1024 * 100) / 100;

    infos.uptime = uptime() * 1000;

    return infos;
}

const poweroff = async () => {
    await exec("poweroff");
}

const reboot = async () => {
    await exec("reboot");
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
        mac: header.split(" ")[1],
        rxBytes: parseInt(infos.find((info) => info[0] === "rx bytes")[1]),
        txBytes: parseInt(infos.find((info) => info[0] === "tx bytes")[1]),
        connectedDuration: parseInt(infos.find((info) => info[0] === "connected time")[1]) * 1000
    };
}

const disconnectClient = async (mac) => {
    await exec("hostapd_cli deauthenticate " + mac);
}

const getDhcpLeases = async () => {

    const leases = [];
    const rawLeases = (await fs.readFile("/var/lib/misc/dnsmasq.leases", "utf-8")).split("\n").map((line) => line.trim()).filter((line) => line !== "");

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

    const rawLeases = (await fs.readFile("/var/lib/misc/dnsmasq.leases", "utf-8")).split("\n").map((line) => line.trim()).filter((line) => line !== "");
    const infos = rawLeases.find((rawLease) => rawLease.includes(mac)).split(" ");

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

/**
 * @param {number} pin 
 * @param {string} direction 
 */
const initGpio = async (pin, direction) => {
    if (!existsSync("/sys/class/gpio/gpio" + pin))
        await exec("echo " + pin + " > /sys/class/gpio/export");
    await exec("echo " + direction + " > /sys/class/gpio/gpio" + pin + "/direction");
}

/**
 * @param {number} pin 
 * @param {number} value 
 */
const setGpio = async (pin, value) => {
    await exec("echo " + value + " > /sys/class/gpio/gpio" + pin + "/value");
}

module.exports = {
    exec,
    addRuleIfNotExists,
    deleteRuleIfExists,
    poweroff,
    reboot,
    createIpsetIfNoExists,
    flushIpset,
    listIpset,
    addIpToIpset,
    removeIpFromIpset,
    getProcTemp,
    getSystemStats,
    getHostapdStatus,
    startHostapd,
    stopHostapd,
    getClients,
    getClient,
    disconnectClient,
    getDhcpLeases,
    getDhcpLease,
    getBandwidthUsage,
    initGpio,
    setGpio
}
