const { spawn } = require("child_process");

/**
 * @param {String} command 
 * @returns {Promise<String>} 
 */
const exec = (command) => new Promise((resolve, reject) => {
    const proc = spawn(command.split(" ")[0], command.split(" ").slice(1));
    let output = "";
    proc.stdout.on("data", (data) => output += data.toString());
    proc.on("close", (code) => {
        if (code !== 0) reject(code);
        else resolve(output);
    });
});

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
    getHostapdStatus,
    startHostapd,
    stopHostapd,
    addRuleIfNotExists,
    deleteRuleIfExists
}
