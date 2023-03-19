const { getConfig } = require("raraph84-lib");
const { initGpio, setGpio, getProcTemp } = require("./utils");
const Config = getConfig(__dirname + "/..");

module.exports.start = async () => {

    if (Config.fanGpioPin < 0) return;

    await initGpio(Config.fanGpioPin, "out");
    await setGpio(Config.fanGpioPin, 0);

    let enabled = false;

    setInterval(async () => {

        const temp = await getProcTemp();

        if (!enabled && temp >= Config.fanEnableTemp) {
            enabled = true;
            await setGpio(Config.fanGpioPin, 1);
        } else if (enabled && temp <= Config.fanDisableTemp) {
            enabled = false;
            await setGpio(Config.fanGpioPin, 0);
        }

    }, 1000);
}
