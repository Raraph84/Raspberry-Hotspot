const { readdirSync } = require("fs");
const { createPool } = require("mysql");
const { getConfig, StartTasksManager, HttpServer, filterEndpointsByPath, query } = require("raraph84-lib");
const Config = getConfig(__dirname);

if (process.platform !== "linux" || process.getuid() !== 0) {
    console.log("This script must be run on linux as root !");
    process.exit(1);
}

const tasks = new StartTasksManager();

let internetInterface = null;
tasks.addTask((resolve) => {
    console.log("Recherche de la connexion internet...");
    require("./src/findInternet").start(internetInterface).then((interface) => {
        console.log("Connexion internet trouvée sur l'interface " + interface + " !");
        internetInterface = interface;
        resolve();
    }).catch(() => reject());
}, (resolve) => resolve());

const database = createPool(Config.database);
tasks.addTask((resolve, reject) => {
    console.log("Connexion à la base de données...");
    database.query("SELECT 0", (error) => {
        if (error) {
            console.log("Impossible de se connecter à la base de données - " + error);
            reject(error);
        } else {
            console.log("Connecté à la base de données !");
            resolve();
        }
    });
}, (resolve) => database.end(() => resolve()));

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
            token = (await query(database, "SELECT * FROM Tokens WHERE Token=?", [request.headers.authorization]))[0];
        } catch (error) {
            request.end(500, "Internal server error");
            console.log(`SQL Error - ${__filename} - ${error}`);
            return;
        }

        if (!token || token.Token !== request.headers.authorization) {
            request.end(401, "Invalid token");
            return;
        }

        if (Date.now() >= (token.Date + Config.sessionExpire * 1000)) {

            try {
                await query(database, "DELETE FROM Tokens WHERE Date<=?", [Date.now() - Config.sessionExpire * 1000]);
            } catch (error) {
                request.end(500, "Internal server error");
                console.log(`SQL Error - ${__filename} - ${error}`);
                return;
            }

            request.end(401, "Invalid token");
            return;
        }

        query(database, "UPDATE Tokens SET Date=? WHERE Token=?", [Date.now(), token.Token])
            .catch((error) => console.log(`SQL Error - ${__filename} - ${error}`));
    }

    endpoint.run(request, database, internetInterface);
});
tasks.addTask((resolve, reject) => {
    console.log("Lancement du serveur HTTP...");
    api.listen(Config.apiPort).then(() => {
        console.log("Serveur HTTP lancé sur le port " + Config.apiPort + " !");
        resolve();
    }).catch((error) => {
        console.log("Impossible de lancer le serveur HTTP sur le port " + Config.apiPort + " - " + error);
        reject();
    });
}, (resolve) => api.close().then(() => resolve()));

tasks.addTask((resolve, reject) => {
    console.log("Lancement du hotspot sur l'interface " + Config.hotspotInterface + "...");
    require("./src/initHotspot").start(internetInterface).then(() => {
        console.log("Hotspot lancé sur l'interface " + Config.hotspotInterface + " !");
        resolve();
    }).catch(() => reject());
}, (resolve) => resolve());

tasks.addTask(async (resolve, reject) => {
    console.log("Chargement des bannissements...");
    require("./src/initBans").start(database).then(() => {
        console.log("Bannissements chargés !");
        resolve();
    }).catch((error) => {
        console.log("Impossible de charger les bannissements - " + error);
        reject();
    });
}, (resolve) => resolve());

tasks.addTask(async (resolve, reject) => {
    if (!Config.captivePortal) {
        resolve();
        return;
    }
    console.log("Lancement du portail captif...");
    require("./src/initCaptivePortal").start(database).then(() => {
        console.log("Portail captif lancé !");
        resolve();
    }).catch((error) => {
        console.log("Impossible de lancer le portail captif - " + error);
        reject();
    });
}, (resolve) => resolve());

tasks.run();
