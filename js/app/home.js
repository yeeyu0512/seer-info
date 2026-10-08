import { initHomeCarousel } from "./home-carousel.js";

// Home only routes to the existing tools; lookup remains owned by seer-lookup.
export function initHome({ seerLookup, activateTab }) {
    const home = document.getElementById("home-section");
    initHomeCarousel(home);
    loadOfficialNews(home);
    loadChangelog(home);
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

async function loadChangelog(home) {
    const previewList = home.querySelector(".home-update-log");
    const fullList = document.getElementById("changelog-full-list");
    const dialog = document.getElementById("changelog-dialog");
    const openButton = document.getElementById("open-changelog-button");
    const closeButton = document.getElementById("close-changelog-button");

    if (!previewList || !fullList || !dialog || !openButton || !closeButton) {
        console.warn("Changelog elements not found");
        return;
    }

    // 開啟與關閉完整更新紀錄
    openButton.addEventListener("click", () => dialog.showModal());
    closeButton.addEventListener("click", () => dialog.close());

    // 建立單筆更新紀錄
    function createEntry(entry, showDetails = false) {
        const li = document.createElement("li");
        const time = document.createElement("time");
        const content = document.createElement("div");
        const title = document.createElement("h3");

        time.dateTime = entry.date;
        time.textContent = entry.date.slice(5).replace("-", " / ");

        title.textContent = entry.title;
        content.append(title);

        if (showDetails && Array.isArray(entry.details)) {
            const details = document.createElement("ul");
            details.className = "changelog-details";

            entry.details
                .filter(detail => typeof detail === "string" && detail.trim())
                .forEach(detail => {
                    const item = document.createElement("li");
                    item.textContent = detail;
                    details.append(item);
                });

            if (details.childElementCount > 0) {
                content.append(details);
            }
        }

        li.append(time, content);
        return li;
    }

    try {
        const response = await fetch(
            new URL("../../data/changelog.json", import.meta.url)
        );

        if (!response.ok) {
            throw new Error(`Changelog request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.entries)) {
            throw new Error("Invalid changelog data");
        }

        const entries = data.entries
            .filter(entry =>
                entry &&
                typeof entry.date === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
                typeof entry.title === "string" &&
                entry.title.trim()
            )
            .sort((a, b) => b.date.localeCompare(a.date));

        if (!entries.length) {
            throw new Error("No changelog entries");
        }

        // 首頁：最新三筆，只顯示日期及標題
        previewList.replaceChildren(
            ...entries.slice(0, 3).map(entry => createEntry(entry))
        );

        // 完整紀錄：所有更新，包含詳細內容
        fullList.replaceChildren(
            ...entries.map(entry => createEntry(entry, true))
        );

    } catch (error) {
        console.warn("Changelog loading failed:", error);

        const previewError = document.createElement("li");
        previewError.textContent = "目前無法載入更新紀錄。";
        previewList.replaceChildren(previewError);

        const fullError = document.createElement("li");
        fullError.textContent = "目前無法載入完整更新紀錄。";
        fullList.replaceChildren(fullError);
    }
}