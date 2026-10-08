import { initHomeCarousel } from "./home-carousel.js";

// Home only routes to the existing tools; lookup remains owned by seer-lookup.
export function initHome({ seerLookup, activateTab }) {
    const home = document.getElementById("home-section");
    initHomeCarousel(home);
    loadOfficialNews(home);
    document.querySelector(".site-header .logo").addEventListener("click", (event) => {
        event.preventDefault();
        activateTab("home-section");
    });
    home.querySelectorAll("[data-home-target]").forEach((button) => {
        button.addEventListener("click", () => {
            if (button.dataset.homeMode) seerLookup.setMode(button.dataset.homeMode);
            activateTab(button.dataset.homeTarget);
            document.querySelector(`[data-main-target][aria-selected="true"]`).focus({ preventScroll: true });
            window.scrollTo({ top: 0 });
        });
    });
    home.querySelectorAll("[data-home-pet-id]").forEach((button) => {
        button.addEventListener("click", () => seerLookup.openPetInfo(button.dataset.homePetId));
    });
    // Follow the existing header's session visibility without duplicating permissions.
    const header = document.querySelector(".site-header");
    const syncVisibility = () => {
        home.querySelectorAll("[data-home-visibility]").forEach((entry) => {
            const key = entry.dataset.homeVisibility;
            const source = key === "voting"
                ? header.querySelector('[data-main-target="voting"]')
                : document.getElementById(key);
            entry.hidden = !source || source.hidden;
        });
    };
    syncVisibility();
    new MutationObserver(syncVisibility).observe(header, {
        attributes: true, attributeFilter: ["hidden"], subtree: true
    });
}

async function loadOfficialNews(home) {
    const list = home.querySelector("#home-news-list");
    try {
        const response = await fetch(new URL("../../data/official-news.json", import.meta.url));
        if (!response.ok) throw new Error("News unavailable");
        const data = await response.json();
        const entries = data.items.filter(item => {
            try { const url = new URL(item.url); return url.origin === "https://www.61.com.tw" && url.pathname.startsWith("/seer_df/news/page/"); } catch { return false; }
        }).slice(0, 3);
        if (!entries.length) throw new Error("No news");
        list.replaceChildren(...entries.map(item => {
            const row = document.createElement("li"), date = document.createElement("time"), link = document.createElement("a");
            date.textContent = item.date.replace("/", " / ");
            link.textContent = item.title;
            link.href = item.url; link.target = "_blank"; link.rel = "noopener noreferrer";
            row.append(date, link); return row;
        }));
    } catch {
        list.textContent = "目前無法載入公告，請查看官網。";
    }
}
