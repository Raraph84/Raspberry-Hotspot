const { getBandwidthUsage } = require("../utils");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql2/promise").Pool} database 
 * @param {string} internetInterface 
 */
module.exports.run = async (request, database, internetInterface) => {

    const date = new Date();
    const stats = await getBandwidthUsage(internetInterface);
    const total = stats.total;
    const month = stats.month.find((month) => month.date.month === date.getMonth() + 1 && month.date.year === date.getFullYear()) || { rx: 0, tx: 0 };
    const day = stats.day.find((day) => day.date.day === date.getDate() && day.date.month === date.getMonth() + 1 && day.date.year === date.getFullYear()) || { rx: 0, tx: 0 };

    request.end(200, {
        total: { rx: total.rx, tx: total.tx },
        month: { rx: month.rx, tx: month.tx },
        day: { rx: day.rx, tx: day.tx }
    });
}

module.exports.infos = {
    path: "/system/bandwidth",
    method: "GET",
    requireLogin: true
}
