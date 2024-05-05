const { getConfig, randomString } = require("raraph84-lib");
const config = getConfig(__dirname + "/../..");

/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql2/promise").Pool} database 
 */
module.exports.run = async (request, database) => {

    let message;
    try {
        message = JSON.parse(request.data);
    } catch (error) {
        request.end(400, "Invalid JSON");
        return;
    }

    if (typeof message.password === "undefined") {
        request.end(400, "Missing password");
        return;
    }

    if (typeof message.password !== "string") {
        request.end(400, "Password must be a string");
        return;
    }

    if (message.password !== Buffer.from(config.base64password, "base64").toString("utf-8")) {
        request.end(401, "Invalid password");
        return;
    }

    const token = randomString(50);

    try {
        await database.query("INSERT INTO Tokens VALUES (?, ?)", [token, Date.now()]);
    } catch (error) {
        request.end(500, "Internal server error");
        console.log(`SQL Error - ${__filename} - ${error}`);
        return;
    }

    request.end(200, { token });
}

module.exports.infos = {
    path: "/login",
    method: "POST",
    requireLogin: false
}
