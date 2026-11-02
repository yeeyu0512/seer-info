import { fetchCnVotes } from "./votes-api.js";

export function createVotesView({ seerLookup, fetchVotes = fetchCnVotes,
    convertToTraditionalChinese = value => value, convertToSimplifiedChinese = value => value }) {
    const get = id => document.getElementById(`competitive-vote-${id}`);
    const container = document.getElementById("competitive-votes");
    const status = get("status"), policy = get("policy"), period = get("period");
    const results = get("results"), refresh = get("refresh");
    const tabs = [get("restricted"), get("semi")];
    let snapshot = null, selected = 2, active = false, request = null, version = 0, retryAt = 0;
    const date = value => new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "medium" });
    const element = (tag, text, className) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    };

    function render() {
        tabs.forEach((tab, i) => {
            const isSelected = selected === i + 2;
            tab.classList.toggle("is-active", isSelected);
            tab.setAttribute("aria-selected", String(isSelected));
            tab.tabIndex = isSelected ? 0 : -1;
        });
        results.setAttribute("aria-labelledby", tabs[selected - 2].id);
        results.replaceChildren();
        period.textContent = "";
        if (!snapshot) return;
        const pool = snapshot.pools.find(item => item.limit === selected);
        const labels = { upcoming: "尚未開始", active: "進行中", ended: "已結束" };
        period.textContent = `${labels[pool.status]} · ${date(pool.start_at)} 至 ${date(pool.end_at)}（台灣時間）`;
        if (!pool.list.length) {
            results.append(element("p", pool.status === "upcoming" ? "本期票選尚未開始。" : "目前沒有票選排名資料。", "competitive-vote-empty"));
            return;
        }
        const table = element("table", undefined, "competitive-vote-table");
        const caption = element("caption", `${selected === 2 ? "限制池" : "準限制池"}票選排名`);
        caption.className = "sr-only";
        const head = element("thead"), heading = element("tr"), body = element("tbody");
        ["排名", "精靈", "票數"].forEach(label => { const th = element("th", label); th.scope = "col"; heading.append(th); });
        head.append(heading);
        for (const item of [...pool.list].sort((a, b) => a.rank - b.rank)) {
            const row = element("tr"), rank = element("td", String(item.rank).padStart(2, "0"), `competitive-vote-rank${item.rank <= 3 ? " is-top" : ""}`);
            const petCell = element("td"), pet = element("div", undefined, "competitive-vote-pet");
            const image = element("img");
            image.src = `https://newseer.61.com/web/monster/head/${item.pet_id}.png`;
            image.alt = ""; image.loading = "lazy";
            image.addEventListener("error", () => image.classList.add("is-unavailable"), { once: true });
            // The API already applies generic s2t. Normalize it back before applying
            // the site's cn→tw policy, including the 岳杰托里背 name exceptions.
            const petName = typeof item.name === "string" && item.name.trim()
                ? convertToTraditionalChinese(convertToSimplifiedChinese(item.name.trim())) : `精靈 #${item.pet_id}`;
            const details = element("div"), name = element("button", petName);
            name.type = "button";
            name.setAttribute("aria-label", `查看${name.textContent}精靈資訊`);
            name.addEventListener("click", () => seerLookup.openPetInfo(item.pet_id));
            details.append(name, element("span", `#${item.pet_id}`, "competitive-vote-id"));
            pet.append(image, details); petCell.append(pet);
            const votes = element("td", item.votes.toLocaleString("zh-TW"), "competitive-vote-count");
            votes.append(element("small", "票")); row.append(rank, petCell, votes); body.append(row);
        }
        table.append(caption, head, body); results.append(table);
    }

    async function load() {
        if (!active || request) return;
        if (Date.now() < retryAt) {
            status.textContent = `服務冷卻中，請約 ${Math.ceil((retryAt - Date.now()) / 1000)} 秒後重試。`;
            return;
        }
        const id = ++version, controller = new AbortController();
        request = controller;
        refresh.disabled = true;
        status.classList.remove("competitive-vote-error");
        status.textContent = `正在取得陸服票選資料；跨區連線與排隊等候可能較久…${snapshot ? ` 下方資料時間：${date(snapshot.fetched_at)}（台灣時間）。` : ""}`;
        const timeout = setTimeout(() => controller.abort(), 130000);
        try {
            const data = await fetchVotes({ signal: controller.signal });
            if (!active || version !== id) return;
            snapshot = data;
            status.textContent = `${data.realtime ? "即時模式" : data.cached ? "快取資料" : "最新取得"} · 資料時間 ${date(data.fetched_at)}（台灣時間）`;
            policy.textContent = data.realtime ? "週三 23:45～23:59 為即時模式，每次查詢重新取得票數。" : `一般時段共用 ${Math.round(data.cache_seconds / 60)} 分鐘快取；更新資料可能仍會取得同一份快取。`;
            render();
        } catch (error) {
            if (!active || version !== id) return;
            if (error.retryAfter) retryAt = Date.now() + error.retryAfter * 1000;
            status.classList.add("competitive-vote-error");
            const message = controller.signal.aborted ? "查詢等候逾時，請稍後重試。"
                : error instanceof TypeError ? "無法連線至陸服票選服務，請稍後重試。" : error.message || "票選資料載入失敗。";
            status.textContent = `${message}${snapshot ? ` 下方保留上次成功取得的資料（${date(snapshot.fetched_at)}，台灣時間）。` : ""}`;
        } finally {
            clearTimeout(timeout);
            if (version === id) { request = null; refresh.disabled = false; }
        }
    }
    refresh.addEventListener("click", load);
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => { selected = index + 2; render(); });
        tab.addEventListener("keydown", event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
            tabs[next].focus(); tabs[next].click();
        });
    });
    function setActive(value) {
        active = value; container.hidden = !value;
        if (!value) { ++version; request?.abort(); request = null; refresh.disabled = false; }
    }
    return { setActive, load };
}
