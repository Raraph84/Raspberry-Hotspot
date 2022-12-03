/**
 * @param {import("raraph84-lib/src/Request")} request 
 * @param {import("mysql").Pool} database 
 * @param {String} internetInterface 
 */
module.exports.run = async (request, database, internetInterface) => {

    //TODO
}

module.exports.infos = {
    path: "/bans",
    method: "GET",
    requireLogin: true
}
