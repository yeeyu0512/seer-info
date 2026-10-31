export const COMPETITIVE_SERVERS = Object.freeze({ tw: "台服", cn: "陸服" });

export function normalizeCompetitiveServer(server) {
    return Object.hasOwn(COMPETITIVE_SERVERS, server) ? server : "tw";
}

export function competitiveServerLabel(server) {
    return COMPETITIVE_SERVERS[normalizeCompetitiveServer(server)];
}

export function requireCompetitiveServer(server) {
    if (!Object.hasOwn(COMPETITIVE_SERVERS, server)) throw new Error("請選擇有效的伺服器。");
    return server;
}
