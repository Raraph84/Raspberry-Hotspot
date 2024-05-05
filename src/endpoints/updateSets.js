const { updateSet: updateCaptivePortalSet } = require("../initCaptivePortal");
const { updateSet: updateBanSet } = require("../initBans");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql2/promise").Pool} database 
 */
module.exports.run = async (request, database) => {

    if (request.ip !== "127.0.0.1") {
        request.end(403, "Invalid IP");
        return;
    }

    await updateCaptivePortalSet(database);
    await updateBanSet(database);

    request.end(204);
}

module.exports.infos = {
    path: "/updatesets",
    method: "POST",
    requireLogin: false
}
