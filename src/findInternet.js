const { getConfig } = require("raraph84-lib");
const { exec } = require("./utils");
const Config = getConfig(__dirname + "/..");

module.exports.start = () => new Promise(async (resolve) => {

    const findInternet = async () => {

        for (const interface of Config.internetInterfaces) {

            try {
                await exec("ping -W 1 -c 1 -I " + interface + " 1.1.1.1");
            } catch (error) {
                continue;
            }

            resolve(interface);
            return;
        }

        setTimeout(() => findInternet(), 1000);
    }

    findInternet();
});
