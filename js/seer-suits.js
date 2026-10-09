import { ASSETS } from "./shared/assets.js";
import { suitBattleModes, selectSuits, fetchSuitCatalog } from "./data/suit-catalog.js";
export { suitBattleModes, selectSuits, fetchSuitCatalog } from "./data/suit-catalog.js";
import { createSuitImageService, SUIT_PARTS } from "./seer-suit-images.js";

const STATS = [["atk", "攻擊"], ["sp_atk", "特攻"], ["def", "防禦"], ["sp_def", "特防"], ["spd", "速度"], ["hp", "體力"]];
const PAGE_SIZE = 6;
const BASE_URL = ASSETS.seerBase;







export function initSeerSuits(root, { fetchSeerJson, convertToTraditionalChinese: traditional = value => value }) {
    const content = root.querySelector("#suit-encyclopedia-content");
    content.innerHTML = `<div class="suit-browser"><div class="suit-selection">
        <div class="suit-toolbar">
            <label><span class="suit-search-label">名稱或 ID</span><input type="search" placeholder="搜尋套裝名稱或 ID…" autocomplete="off"></label>
            <label>類型<select data-suit-effect><option value="all">全部套裝</option><option value="common">常用套裝</option><option value="bonus">能力套裝</option><option value="appearance">炫酷套裝</option></select></label>
            <label>對戰<select data-suit-battle><option value="all">全部對戰</option><option value="PVE">PVE 有效</option><option value="PVP">PVP 有效</option></select></label>
            <label>排序<select data-suit-sort><option value="newest">ID 由大到小</option><option value="oldest">ID 由小到大</option></select></label>
        </div>
        <div class="seal-status-row"><p class="suit-status" role="status" aria-live="polite"></p><button data-suit-retry type="button" hidden>重新載入</button></div>
        <div class="suit-grid" role="group" aria-label="選擇套裝"></div>
        <nav class="seal-pagination" aria-label="套裝分頁" hidden><button type="button" data-suit-prev>上一頁</button><span></span><button type="button" data-suit-next>下一頁</button></nav>
    </div><section class="suit-preview" aria-label="套裝預覽">
        <div class="suit-preview-header"><div><h3 data-suit-title>選擇一套套裝</h3><span class="suit-mode-tags" data-suit-modes></span><p class="seal-meta" data-suit-meta>從清單選擇套裝，查看外觀與效果。</p></div><button type="button" data-suit-clear hidden>清除選擇</button></div>
        <div class="suit-preview-body"><div class="suit-preview-art">
            <div class="suit-image suit-image-large"><img class="is-base" src="${BASE_URL}" alt="未穿戴的小賽爾"></div>
            <div class="suit-load-progress" hidden><div class="suit-progress-track"><progress aria-label="套裝圖片載入進度" max="1"></progress><span class="suit-progress-percent">0%</span></div><p class="suit-image-status" role="status" aria-live="polite"></p></div>
        </div><div class="suit-detail-info" hidden></div></div>
    </section></div>`;
    const input = content.querySelector("input"), effect = content.querySelector("[data-suit-effect]"), sort = content.querySelector("[data-suit-sort]");
    const battle = content.querySelector("[data-suit-battle]");
    const grid = content.querySelector(".suit-grid"), status = content.querySelector(".suit-status"), retry = content.querySelector("[data-suit-retry]");
    const pagination = content.querySelector("nav"), previous = content.querySelector("[data-suit-prev]"), next = content.querySelector("[data-suit-next]");
    const preview = content.querySelector(".suit-preview"), previewImage = preview.querySelector("img"), info = content.querySelector(".suit-detail-info");
    const title = preview.querySelector("[data-suit-title]"), meta = preview.querySelector("[data-suit-meta]"), imageStatus = preview.querySelector(".suit-image-status"), clear = preview.querySelector("[data-suit-clear]");
    const progressArea = preview.querySelector(".suit-load-progress"), progress = progressArea.querySelector("progress");
    const progressPercent = progressArea.querySelector(".suit-progress-percent");
    const modes = preview.querySelector("[data-suit-modes]");
    const images = createSuitImageService(fetchSeerJson);
    let records = [], page = 1, loaded = false, pending, selectionVersion = 0, selectedId = null;
    function resetPreview() {
        selectionVersion++; selectedId = null;
        preview.classList.remove("has-selection");
        modes.replaceChildren();
        title.textContent = "選擇一套套裝"; meta.textContent = "從清單選擇套裝，查看外觀與效果。";
        previewImage.src = BASE_URL; previewImage.alt = "未穿戴的小賽爾"; previewImage.classList.add("is-base");
        imageStatus.textContent = ""; clear.hidden = true; info.hidden = true; info.replaceChildren();
        progressArea.hidden = true;
        updateSelection();
    }
    clear.onclick = resetPreview;
    function updateSelection() {
        grid.querySelectorAll("[data-suit-id]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.suitId) === selectedId)));
    }
    function choose(record) {
        const version = ++selectionVersion; selectedId = record.id; updateSelection();
        preview.classList.add("has-selection");
        title.textContent = record.name; meta.textContent = `#${record.id} · ${record.equips?.length || 0} 個部件`;
        modes.replaceChildren();
        suitBattleModes(record).forEach(label => {
            const description = label === "PVE" ? "BOSS 對戰" : "玩家對戰";
            const badge = document.createElement("span"); badge.className = `suit-mode-tag suit-mode-${label.toLowerCase()}`; badge.textContent = label; badge.title = description; modes.append(badge);
        });
        clear.hidden = false; info.hidden = false; info.replaceChildren();
        const effectInfo = document.createElement("section"), partInfo = document.createElement("section");
        info.append(effectInfo, partInfo);
        previewImage.src = BASE_URL; previewImage.alt = "未穿戴的小賽爾（套裝圖片載入中）"; previewImage.classList.add("is-base");
        imageStatus.textContent = "正在載入套裝圖片，首次組裝請稍候…";
        progressArea.hidden = false; progress.hidden = false; progress.removeAttribute("value");
        progressPercent.textContent = "0%"; progressPercent.hidden = false;
        const active = () => selectionVersion === version && selectedId === record.id && !root.hidden;
        function paragraph(heading, text) {
            const h = document.createElement("h4"); h.textContent = heading;
            const p = document.createElement("p"); p.textContent = text; effectInfo.append(h, p);
        }
        paragraph("套裝效果", traditional(record.bonus?.desc || (record.bonus ? "SeerAPI 未提供效果說明。" : "沒有套裝效果。")));
        const attr = record.bonus?.attribute;
        if (attr && STATS.some(([key]) => attr[key])) {
            const stats = document.createElement("dl"); stats.className = "seal-stats suit-bonus-stats";
            STATS.forEach(([key, label]) => {
                const pair = document.createElement("div"), term = document.createElement("dt"), value = document.createElement("dd");
                term.textContent = label; value.textContent = `+${attr[key] || 0}${attr.percent ? "%" : ""}`; pair.append(term, value); stats.append(pair);
            });
            info.insertBefore(stats, partInfo);
        }
        if (record.transform) paragraph("變形", record.tran_speed ? `可變形 · 移動速度 ${record.tran_speed}` : "可變形");
        if (record.bonus?.effective_pets?.length) paragraph("適用精靈", record.bonus.effective_pets.map(pet => traditional(pet.name || `#${pet.id}`)).join("、"));
        function disclosure(label) {
            const details = document.createElement("details"), summary = document.createElement("summary"), heading = document.createElement("h4");
            details.className = "suit-disclosure"; heading.textContent = label; summary.append(heading); details.append(summary); partInfo.append(details);
            return details;
        }
        const parts = document.createElement("ul"); parts.className = "suit-part-list";
        (record.equips || []).forEach(part => { const item = document.createElement("li"); item.textContent = `#${part.id}`; parts.append(item); });
        if (record.suit_desc) {
            const text = document.createElement("p");
            text.textContent = traditional(record.suit_desc); disclosure("套裝介紹").append(text);
        }
        disclosure("套裝部件").append(parts);
        images.image(record, active, state => {
            if (selectionVersion !== version) return;
            imageStatus.textContent = state.label;
            if (state.total) { progress.max = state.total; progress.value = state.completed; progressPercent.textContent = `${Math.floor(state.completed / state.total * 100)}%`; }
            else progress.removeAttribute("value");
        }).then(source => {
            if (selectionVersion !== version) return;
            progress.hidden = true;
            progressPercent.hidden = true;
            progressArea.hidden = Boolean(source);
            if (source) { previewImage.src = source; previewImage.alt = `${record.name}組裝預覽`; previewImage.classList.remove("is-base"); imageStatus.textContent = ""; }
            else { previewImage.alt = "未穿戴的小賽爾"; imageStatus.textContent = source === null ? "此套裝暫無預覽圖片，仍可查看下方資料。" : "圖片載入已暫停，\n重新選擇套裝即可繼續。"; }
        });
        images.equips(record).then(equips => {
            if (selectionVersion !== version) return;
            parts.replaceChildren();
            equips.forEach(part => {
                const item = document.createElement("li"), name = document.createElement("span"), type = document.createElement("small");
                name.textContent = traditional(part.name || `#${part.id}`);
                type.textContent = SUIT_PARTS[part.part_type?.id]?.name || (part.part_type?.id === 6 ? "坐騎" : "部件");
                item.append(name, type); parts.append(item);
            });
        }).catch(() => { if (selectionVersion === version) parts.title = "部件名稱載入失敗，暫以 ID 顯示。"; });
    }
    function render() {
        const matches = selectSuits(records, { query: input.value, effect: effect.value, battleMode: battle.value, sort: sort.value });
        const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE)); page = Math.min(page, pages);
        grid.replaceChildren();
        matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).forEach(record => {
            const card = document.createElement("button"); card.type = "button"; card.className = "suit-card"; card.dataset.suitId = record.id;
            const identity = document.createElement("span"); identity.className = "suit-card-identity";
            const name = document.createElement("strong"); name.textContent = record.name; name.title = record.name;
            const meta = document.createElement("small"); meta.textContent = `#${record.id} · ${record.equips?.length || 0} 個部件`;
            const arrow = document.createElement("span"); arrow.textContent = "›"; arrow.setAttribute("aria-hidden", "true"); arrow.className = "suit-card-arrow";
            identity.append(name, meta); card.append(identity, arrow); card.onclick = () => choose(record); grid.append(card);
        });
        updateSelection();
        status.textContent = matches.length ? `${matches.length} 套套裝` : "找不到符合條件的套裝。";
        pagination.hidden = pages <= 1; pagination.querySelector("span").textContent = `${page} / ${pages}`; previous.disabled = page === 1; next.disabled = page === pages;
    }
    [input, effect, battle, sort].forEach(control => control.addEventListener(control === input ? "input" : "change", () => { page = 1; if (loaded) render(); }));
    function changePage(delta) { page += delta; render(); grid.scrollTop = 0; }
    previous.onclick = () => changePage(-1); next.onclick = () => changePage(1);
    async function load() {
        if (loaded || pending) return pending;
        retry.hidden = true; content.setAttribute("aria-busy", "true"); status.textContent = "正在載入套裝資料…";
        pending = (async () => {
            try {
                const catalog = await fetchSuitCatalog(fetchSeerJson, (count, total) => { status.textContent = `正在載入套裝… ${count} / ${total}`; });
                records = catalog.map(record => ({ ...record, searchName: record.name, name: traditional(record.name) })); loaded = true; render();
            } catch (error) { console.error("Suit catalog error", error); status.textContent = "套裝資料載入失敗，請稍後重試。"; retry.hidden = false; }
            finally { pending = null; content.removeAttribute("aria-busy"); }
        })();
        return pending;
    }
    retry.onclick = load;
    let routeRequest = 0;
    async function searchById(value) {
        const id = String(value || '').trim();
        if (!/^[1-9][0-9]{0,9}$/.test(id)) return;
        const request = ++routeRequest;
        await load();
        if (!loaded || request !== routeRequest || root.hidden) return;
        input.value = id; effect.value = 'all'; battle.value = 'all'; sort.value = 'newest'; page = 1;
        resetPreview(); render();
        const record = records.find(item => String(item.id) === id);
        if (record) choose(record);
        else status.textContent = `找不到套裝 #${id}。`;
    }
    return { load, searchById };
}
