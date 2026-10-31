import { competitiveServerLabel, normalizeCompetitiveServer } from "./servers.js";

export function renderCompetitivePoolTitle(element, server, title) {
    const badge = document.createElement("span");
    badge.className = "competitive-server-badge";
    badge.dataset.server = normalizeCompetitiveServer(server);
    badge.textContent = competitiveServerLabel(server);

    const text = document.createElement("span");
    text.className = "competitive-pool-title-text";
    text.textContent = title;

    element.classList.add("competitive-pool-title");
    element.replaceChildren(badge, text);
}
