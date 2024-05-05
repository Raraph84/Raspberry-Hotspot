const { getConfig } = require("raraph84-lib");
const { initGpio, setGpio, getProcTemp } = require("./utils");
const config = getConfig(__dirname + "/..");

module.exports.start = async () => {

    if (config.fanGpioPin < 0) return;

    await initGpio(config.fanGpioPin, "out");
    await setGpio(config.fanGpioPin, 0);

    let enabled = false;

    setInterval(async () => {

        const temp = await getProcTemp();

        if (!enabled && temp >= config.fanEnableTemp) {
            enabled = true;
            await setGpio(config.fanGpioPin, 1);
        } else if (enabled && temp < config.fanEnableTemp) {
            enabled = false;
            await setGpio(config.fanGpioPin, 0);
        }

    }, 1000);
}
