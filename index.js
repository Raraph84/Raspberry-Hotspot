const { readdirSync } = require("fs");
const { createPool } = require("mysql2/promise");
const { getConfig, StartTasksManager, HttpServer, filterEndpointsByPath, WebSocketServer } = require("raraph84-lib");
const config = getConfig(__dirname);

if (process.platform !== "linux" || process.getuid() !== 0) {
    console.log("This script must be run on linux as root !");
    process.exit(1);
}

const tasks = new StartTasksManager();

tasks.addTask((resolve, reject) => {
    console.log("Lancement du ventilateur...");
    require("./src/initFan").start().then(() => {
        console.log("Ventilateur lancé !");
        resolve();
    }).catch((error) => {
        console.log("Impossible de lancer le ventilateur - " + error);
        reject();
    });
}, (resolve) => resolve());

let internetInterface = null;
tasks.addTask((resolve) => {
    console.log("Recherche de la connexion internet...");
    require("./src/findInternet").start(internetInterface).then((interface) => {
        console.log("Connexion internet trouvée sur l'interface " + interface + " !");
        internetInterface = interface;
        resolve();
    }).catch(() => reject());
}, (resolve) => resolve());

const database = createPool({ charset: "utf8mb4_general_ci", ...config.database });
tasks.addTask(async (resolve, reject) => {
    console.log("Connexion à la base de données...");
    try {
        await database.query("SELECT 1");
    } catch (error) {
        console.log("Impossible de se connecter à la base de données - " + error);
        reject(error);
        return;
    }
    console.log("Connecté à la base de données !");
    resolve();
}, (resolve) => database.end().then(() => resolve()));

const api = new HttpServer();
api.on("request", async (/** @type {import("raraph84-lib/src/Request")} */ request) => {

    const endpoints = filterEndpointsByPath(readdirSync(__dirname + "/src/endpoints")
        .map((endpointFile) => require(__dirname + "/src/endpoints/" + endpointFile)), request);

    request.setHeader("Access-Control-Allow-Origin", "*");

    if (!endpoints[0]) {
        request.end(404, "Not found");
        return;
    }

    if (request.method === "OPTIONS") {
        request.setHeader("Access-Control-Allow-Methods", endpoints.map((endpoint) => endpoint.infos.method).join(","));
        if (request.headers["access-control-request-headers"])
            request.setHeader("Access-Control-Allow-Headers", request.headers["access-control-request-headers"]);
        request.setHeader("Vary", "Access-Control-Request-Headers");
        request.end(204);
        return;
    }

    const endpoint = endpoints.find((endpoint) => endpoint.infos.method === request.method);
    if (!endpoint) {
        request.end(405, "Method not allowed");
        return;
    }

    request.urlParams = endpoint.params;

    if (endpoint.infos.requireLogin) {

        if (!request.headers.authorization) {
            request.end(401, "Missing authorization");
            return;
        }

        let token;
        try {
            [token] = await database.query("SELECT * FROM Tokens WHERE Token=?", [request.headers.authorization]);
            token = token[0];
        } catch (error) {
            request.end(500, "Internal server error");
            console.log(`SQL Error - ${__filename} - ${error}`);
            return;
        }

        if (!token || token.Token !== request.headers.authorization) {
            request.end(401, "Invalid token");
            return;
        }

        if (Date.now() >= (token.Date + config.sessionExpire * 1000)) {

            try {
                await database.query("DELETE FROM Tokens WHERE Date<=?", [Date.now() - config.sessionExpire * 1000]);
            } catch (error) {
                request.end(500, "Internal server error");
                console.log(`SQL Error - ${__filename} - ${error}`);
                return;
            }

            request.end(401, "Invalid token");
            return;
        }

        if (Date.now() > token.Date) {
            database.query("UPDATE Tokens SET Date=? WHERE Token=?", [Date.now(), token.Token])
                .catch((error) => console.log(`SQL Error - ${__filename} - ${error}`));
        }
    }

    endpoint.run(request, database, internetInterface);
});
tasks.addTask((resolve, reject) => {
    console.log("Lancement du serveur HTTP...");
    api.listen(config.apiPort).then(() => {
        console.log("Serveur HTTP lancé sur le port " + config.apiPort + " !");
        resolve();
    }).catch((error) => {
        console.log("Impossible de lancer le serveur HTTP sur le port " + config.apiPort + " - " + error);
        reject();
    });
}, (resolve) => api.close().then(() => resolve()));

const gateway = new WebSocketServer();
gateway.on("connection", (/** @type {import("raraph84-lib/src/WebSocketClient")} */ client) => {
    setTimeout(() => {
        if (!client.infos.logged)
            client.close("Please login");
    }, 10 * 1000);
});
gateway.on("command", async (commandName, /** @type {import("raraph84-lib/src/WebSocketClient")} */ client, message) => {

    if (commandName === "LOGIN") {

        if (typeof message.token === "undefined") {
            client.close("Missing token");
            return;
        }

        if (typeof message.token !== "string") {
            client.close("Token must be a string");
            return;
        }

        let token;
        try {
            [token] = await database.query("SELECT * FROM Tokens WHERE Token=?", [message.token]);
            token = token[0];
        } catch (error) {
            client.close("Internal server error");
            console.log(`SQL Error - ${__filename} - ${error}`);
            return;
        }

        if (!token || token.Token !== message.token) {
            client.close("Invalid token");
            return;
        }

        if (Date.now() >= (token.Date + config.sessionExpire * 1000)) {

            try {
                await database.query("DELETE FROM Tokens WHERE Date<=?", [Date.now() - config.sessionExpire * 1000]);
            } catch (error) {
                client.close("Internal server error");
                return;
            }

            client.close("Invalid token");
            return;
        }

        if (Date.now() > token.Date) {
            database.query("UPDATE Tokens SET Date=? WHERE Token=?", [Date.now(), token.Token])
                .catch((error) => console.log(`SQL Error - ${__filename} - ${error}`));
        }

        client.infos.logged = true;
        client.emitEvent("LOGGED");

        require("./src/initDnsmasqLogs").lastQueries.forEach((dnsQuery) => client.emitEvent("DNS_QUERY", dnsQuery));

    } else if (commandName === "HEARTBEAT") {

        if (!client.infos.logged) {
            client.close("Please login");
            return;
        }

        if (!client.infos.waitingHeartbeat) {
            client.close("Useless heartbeat");
            return;
        }

        client.infos.waitingHeartbeat = false;

    } else
        client.close("Command " + commandName + " does not exist");
});
tasks.addTask((resolve, reject) => {
    console.log("Lancement du serveur WebSocket...");
    gateway.listen(config.gatewayPort).then(() => {
        console.log("Serveur WebSocket lancé sur le port " + config.gatewayPort + " !");
        resolve();
    }).catch(() => reject());
}, (resolve) => gateway.close().then(() => resolve()));

let gatewayHeartbeatInterval;
tasks.addTask((resolve) => {
    gatewayHeartbeatInterval = setInterval(() => {

        gateway.clients.filter((client) => client.infos.logged).forEach((client) => {
            client.infos.waitingHeartbeat = true;
            client.emitEvent("HEARTBEAT");
        });

        setTimeout(() => {
            gateway.clients.filter((client) => client.infos.waitingHeartbeat).forEach((client) => {
                client.close("Please respond to heartbeat");
            });
        }, 10 * 1000);

    }, 30 * 1000);
    resolve();
}, (resolve) => { clearInterval(gatewayHeartbeatInterval); resolve(); });

tasks.addTask((resolve) => {
    require("./src/initDnsmasqLogs").start(database, gateway);
    resolve();
}, (resolve) => resolve());

tasks.addTask((resolve, reject) => {
    console.log("Lancement du hotspot sur l'interface " + config.hotspotInterface + "...");
    require("./src/initHotspot").start(internetInterface).then(() => {
        console.log("Hotspot lancé sur l'interface " + config.hotspotInterface + " !");
        resolve();
    }).catch(() => reject());
}, (resolve) => resolve());

tasks.addTask(async (resolve, reject) => {
    console.log("Chargement des bannissements...");
    require("./src/initBans").start(database, internetInterface).then(() => {
        console.log("Bannissements chargés !");
        resolve();
    }).catch((error) => {
        console.log("Impossible de charger les bannissements - " + error);
        reject();
    });
}, (resolve) => resolve());

tasks.addTask(async (resolve, reject) => {
    if (!config.captivePortal) {
        resolve();
        return;
    }
    console.log("Lancement du portail captif...");
    require("./src/initCaptivePortal").start(database, internetInterface).then(() => {
        console.log("Portail captif lancé !");
        resolve();
    }).catch((error) => {
        console.log("Impossible de lancer le portail captif - " + error);
        reject();
    });
}, (resolve) => resolve());

tasks.run();
