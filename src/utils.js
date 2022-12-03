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

/**
 * @returns {Promise<Boolean>} 
 */
const getHostapdStatus = async () => {
    try {
        await exec("pidof hostapd");
    } catch (error) {
        return false;
    }
    return true;
}

/**
 * @returns {Promise} 
 */
const startHostapd = async () => {
    await exec("service hostapd start");
}

/**
 * @returns {Promise} 
 */
const stopHostapd = async () => {
    await exec("service hostapd stop");
}

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

module.exports = {
    exec,
    getSystemStats,
    getHostapdStatus,
    startHostapd,
    stopHostapd,
    addRuleIfNotExists,
    deleteRuleIfExists
}
