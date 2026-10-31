export const SEARCH_CATEGORIES = [
    { key: "pet", endpoint: "pet", label: "精靈" },
    { key: "skin", endpoint: "pet_skin", label: "皮膚" },
    { key: "mintmark", endpoint: "mintmark", label: "刻印" },
    { key: "suit", endpoint: "suit", label: "套裝" }
];

const TOOLS = [
    { name: "競技池", words: "禁池 禁止 限制 巔峰", selector: '[data-main-target="competitive"]' },
    { name: "屬性克制", words: "屬性 相剋 倍率 克制", selector: '[data-main-target="type-chart"]' },
    { name: "模擬培養", words: "培養 學習力 個體值 能力值", selector: '[data-main-target="training"]' },
    { name: "傷害計算", words: "傷害 承傷 計算器 PVE BOSS", selector: '[data-main-target="damage"]' },
    { name: "玩家查詢", words: "玩家 米米號 戰績 段位", selector: '[data-open-player-lookup]' }
];

export function findHomeTools(query, simplified = value => value) {
    const needle = simplified(query.normalize("NFKC").trim()).toLowerCase();
    return needle ? TOOLS.filter(tool => simplified(`${tool.name} ${tool.words}`).toLowerCase().includes(needle)) : [];
}

export async function searchHomeCategory(category, query, { signal, simplified = value => value, fetchImpl = fetch } = {}) {
    const term = simplified(query.normalize("NFKC").trim());
    const numeric = /^[1-9][0-9]{0,9}$/.test(term);
    const params = new URLSearchParams({ name: term, limit: "4", offset: "0", expand: "true" });
    const url = `https://api.seerapi.com/v1/${category.endpoint}${numeric ? `/${term}` : `?${params}`}`;
    const response = await fetchImpl(url, { signal, headers: { Accept: "application/json" } });
    if (numeric && response.status === 404) return { records: [], more: false };
    if (!response.ok) throw new Error(`搜尋失敗（${response.status}）`);
    const data = await response.json();
    if (!numeric && !Array.isArray(data.results)) throw new Error("搜尋資料格式無效");
    const records = (numeric ? [data] : data.results).filter(record => Number.isSafeInteger(record.id)
        && record.id > 0 && typeof record.name === "string" && !record.is_hidden);
    records.sort((a, b) => Number(simplified(b.name) === term) - Number(simplified(a.name) === term));
    return { records, more: !numeric && Boolean(data.next) };
}

export function initHomeSearch({ simplified, traditional }) {
    const form = document.getElementById("home-search-form");
    const input = document.getElementById("home-search-input");
    const scope = document.getElementById("home-search-scope");
    const status = document.getElementById("home-search-status");
    const results = document.getElementById("home-search-results");
    const clear = document.getElementById("home-search-clear");
    const dialog = document.getElementById("home-search-dialog");
    const opener = document.getElementById("home-search-open");
    let controller;
    let generation = 0;

    opener.addEventListener("click", () => {
        dialog.showModal();
        input.focus();
    });
    document.getElementById("home-search-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        dialog.close();
    });
    dialog.addEventListener("close", () => {
        generation++;
        controller?.abort();
        results.setAttribute("aria-busy", "false");
        if (status.textContent === "正在搜尋圖鑑…") status.textContent = "搜尋已停止，可重新搜尋。";
        opener.focus({ preventScroll: true });
    });
    dialog.addEventListener("click", event => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });

    function reset() {
        generation++;
        controller?.abort();
        results.replaceChildren();
        results.hidden = true;
        results.setAttribute("aria-busy", "false");
        status.textContent = "支援名稱、ID 與繁簡中文；圖鑑資料包含陸服進度。";
    }
    function group(label) {
        const section = document.createElement("section");
        const heading = document.createElement("h3");
        const list = document.createElement("ul");
        heading.textContent = label;
        section.append(heading, list);
        results.append(section);
        return { section, list };
    }
    input.addEventListener("input", () => {
        reset();
        clear.hidden = !input.value;
    });
    scope.addEventListener("change", reset);
    clear.addEventListener("click", () => {
        input.value = "";
        clear.hidden = true;
        reset();
        input.focus();
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        reset();
        const query = input.value.normalize("NFKC").trim();
        if (!query) { input.focus(); return; }
        const request = generation;
        controller = new AbortController();
        const activeController = controller;
        const timer = setTimeout(() => activeController.abort(), 12000);
        results.hidden = false;
        results.setAttribute("aria-busy", "true");
        const tools = scope.value === "all" || scope.value === "tools" ? findHomeTools(query, simplified) : [];
        if (tools.length) {
            const { list } = group("工具");
            tools.forEach(tool => {
                const li = document.createElement("li"), button = document.createElement("button");
                button.type = "button";
                button.textContent = tool.name;
                button.addEventListener("click", () => {
                    dialog.close();
                    document.querySelector(`.site-header ${tool.selector}`).click();
                });
                li.append(button); list.append(li);
            });
        }
        const categories = SEARCH_CATEGORIES.filter(category => scope.value === "all" || scope.value === category.key);
        status.textContent = categories.length ? "正在搜尋圖鑑…" : tools.length ? `找到 ${tools.length} 個工具。` : "找不到符合的工具，請試試其他名稱。";
        const settled = await Promise.allSettled(categories.map(category => searchHomeCategory(category, query, {
            simplified, signal: activeController.signal
        })));
        clearTimeout(timer);
        if (request !== generation) return;
        let count = tools.length;
        const failed = [];
        let more = false;
        settled.forEach((result, index) => {
            const category = categories[index];
            if (result.status === "rejected") { failed.push(category.label); return; }
            const { records, more: hasMore } = result.value;
            more ||= hasMore;
            if (!records.length && !hasMore) return;
            const { section, list } = group(category.label);
            records.forEach(record => {
                const li = document.createElement("li"), link = document.createElement("a");
                const name = document.createElement("span"), id = document.createElement("small");
                link.href = `?tab=${category.key}&id=${record.id}`;
                name.textContent = traditional(record.name);
                id.textContent = `#${record.id}`;
                link.append(name, id); li.append(link); list.append(li);
            });
            count += records.length;
            if (hasMore) {
                const hint = document.createElement("p");
                hint.textContent = "還有其他結果，請輸入更完整的名稱縮小範圍。";
                section.append(hint);
            }
        });
        results.setAttribute("aria-busy", "false");
        status.textContent = `${count ? `顯示 ${count} 筆結果${more ? "（各圖鑑最多 4 筆）" : ""}。` : failed.length ? "目前無法取得完整搜尋結果。" : "找不到符合的結果，請確認名稱或 ID。"}${failed.length ? ` ${failed.join("、")}暫時無法查詢，請重新搜尋。` : ""}`;
    });
}
