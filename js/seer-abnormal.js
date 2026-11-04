import { openDialog, closeDialog } from "./shared/dialog-motion.js";
import { enableDialogBackdropClose } from "./shared/dialog-backdrop.js";

export const ABNORMAL_FILTERS = ["全部", "控制", "弱化", "附屬", "限制", "衍化", "其他"];
export const ABNORMAL_PAGE_SIZE = 12;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function filterAbnormals(abnormals, query = "", category = "全部", normalize = value => value) {
    const needle = normalize(query.normalize("NFKC").trim()).toLowerCase();
    return abnormals.filter(status => (category === "全部" || status.category === category || status.tags.includes(category))
        && normalize([status.name, status.summary, status.description, ...status.effects].join(" ")).toLowerCase().includes(needle))
        .sort((a, b) => b.id - a.id);
}

export function getAbnormalPage(items, requestedPage = 1) {
    const pages = Math.max(1, Math.ceil(items.length / ABNORMAL_PAGE_SIZE));
    const page = Math.min(pages, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1));
    const offset = (page - 1) * ABNORMAL_PAGE_SIZE;
    return { items: items.slice(offset, offset + ABNORMAL_PAGE_SIZE), page, pages, start: items.length ? offset + 1 : 0, end: Math.min(offset + ABNORMAL_PAGE_SIZE, items.length) };
}

export function abnormalUrl(id, href = window.location.href) {
    const url = new URL(href);
    for (const key of ["id", "build", "server"]) url.searchParams.delete(key);
    url.searchParams.set("tab", "abnormal");
    if (id !== null && id !== undefined) url.searchParams.set("abnormal", id);
    else url.searchParams.delete("abnormal");
    return url;
}

export function validateAbnormalCatalog(data) {
    if (!Array.isArray(data?.abnormals) || !data.abnormals.length) throw new Error("異常狀態資料格式不正確");
    const ids = new Set();
    for (const item of data.abnormals) {
        if (!Number.isSafeInteger(item.id) || item.id < 0 || ids.has(item.id)) throw new Error("異常狀態 ID 重複或無效");
        ids.add(item.id);
        if (!["控制", "弱化", "附屬", "其他"].includes(item.category)
            || !["tags", "effects", "removalConditions", "transformations", "relatedStatuses", "sources"].every(key => Array.isArray(item[key]))
            || !["name", "icon", "summary", "description", "verificationStatus"].every(key => typeof item[key] === "string" && item[key])
            || !item.tags.every(tag => ["限制", "衍化", "特殊"].includes(tag))
            || !["verified", "coreVerified", "pending"].includes(item.verificationStatus)) throw new Error("異常狀態欄位不完整");
    }
    for (const item of data.abnormals) {
        if (![...item.relatedStatuses, ...item.transformations.map(edge => edge.targetId)].every(id => ids.has(id))) throw new Error("異常狀態關聯不存在");
    }
    return data;
}

export function initSeerAbnormal(section, { normalize = value => value, fetchImpl = fetch } = {}) {
    const content = section.querySelector("#abnormal-encyclopedia-content");
    const dialog = document.getElementById("abnormal-detail-dialog");
    const detail = dialog.querySelector(".abnormal-detail-content");
    const closeButton = dialog.querySelector(".abnormal-dialog-close");
    let catalog, request, generation = 0, activeId = null, opener = null;
    let query = "", category = "全部", page = 1;

    function identity(item) {
        return `<span class="abnormal-icon"><img src="${escapeHtml(item.icon)}" alt="" width="48" height="48"></span>`;
    }
    function badges(item) {
        return `<span class="abnormal-badge">${escapeHtml(item.category)}</span>${item.tags.map(tag => `<span class="abnormal-badge abnormal-badge-special${tag === "特殊" ? " abnormal-badge-alert" : ""}">${escapeHtml(tag)}</span>`).join("")}`;
    }
    function link(id) {
        const target = catalog.abnormals.find(item => item.id === id);
        return `<a class="abnormal-related-link" href="${escapeHtml(abnormalUrl(id).href)}" data-abnormal-link="${escapeHtml(id)}">${escapeHtml(target.name)}</a>`;
    }
    function listSection(title, values) {
        if (!values?.length) return "";
        return `<section class="abnormal-detail-section"><h3>${title}</h3><ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join("")}</ul></section>`;
    }
    function transformationFlow(item, seen = new Set()) {
        if (seen.has(item.id) || !item.transformations.length) return "";
        const nextSeen = new Set([...seen, item.id]);
        return item.transformations.map(edge => {
            const target = catalog.abnormals.find(value => value.id === edge.targetId);
            return `<li><div class="abnormal-flow-step">${link(item.id)}<span class="abnormal-flow-arrow" aria-hidden="true">→</span>${link(target.id)}</div><p>${escapeHtml(edge.condition)}${edge.duration ? ` · ${escapeHtml(target.name)}持續 ${escapeHtml(edge.duration)}` : ""}${edge.note ? ` · ${escapeHtml(edge.note)}` : ""}</p>${target.transformations.length && !nextSeen.has(target.id) ? `<ul>${transformationFlow(target, nextSeen)}</ul>` : ""}</li>`;
        }).join("");
    }
    function renderDetail(item) {
        detail.innerHTML = `<header class="abnormal-detail-header">${identity(item)}<div><h2 id="abnormal-detail-title" tabindex="-1">${escapeHtml(item.name)}</h2><div class="abnormal-badges">${badges(item)}</div></div></header>
            <p class="abnormal-detail-description">${escapeHtml(item.description)}</p>
            ${item.verificationStatus === "pending" ? '<p class="abnormal-verification">效果待確認</p>' : ""}
            ${listSection("特殊判定", item.effects)}
            ${listSection("解除條件", item.removalConditions)}
            ${item.transformations.length ? `<section class="abnormal-detail-section"><h3>狀態轉化</h3><p>各階段須分別滿足條件，不會立即連續觸發。</p><ul class="abnormal-flow">${transformationFlow(item)}</ul></section>` : ""}
            ${item.relatedStatuses.length ? `<section class="abnormal-detail-section"><h3>相關狀態</h3><div class="abnormal-related">${item.relatedStatuses.map(link).join("")}</div></section>` : ""}`;
    }
    function openAbnormal(id, { updateUrl = true, trigger = null } = {}) {
        const abnormalId = typeof id === "string" && /^(0|[1-9][0-9]*)$/.test(id) ? Number(id) : id;
        const item = catalog.abnormals.find(value => value.id === abnormalId);
        if (!item) return false;
        if (!dialog.open) opener = trigger;
        activeId = id;
        renderDetail(item);
        if (updateUrl) window.history.pushState(null, "", abnormalUrl(id));
        if (!dialog.open) openDialog(dialog);
        dialog.scrollTop = 0;
        detail.querySelector("h2").focus({ preventScroll: true });
        return true;
    }
    function closeSilently() {
        activeId = null;
        if (dialog.open) closeDialog(dialog);
    }
    closeButton.addEventListener("click", () => closeDialog(dialog));
    enableDialogBackdropClose(dialog);
    dialog.addEventListener("close", () => {
        if (activeId === null || dialog.open) return;
        activeId = null;
        const url = new URL(window.location.href);
        if (url.searchParams.get("tab") === "abnormal") {
            url.searchParams.delete("abnormal");
            window.history.pushState(null, "", url);
            (opener?.isConnected ? opener : content.querySelector("input"))?.focus({ preventScroll: true });
        }
    });
    detail.addEventListener("click", event => {
        const target = event.target.closest("[data-abnormal-link]");
        if (!target || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        openAbnormal(target.dataset.abnormalLink);
    });
    function renderCards() {
        const results = filterAbnormals(catalog.abnormals, query, category, normalize);
        const pagination = getAbnormalPage(results, page);
        page = pagination.page;
        content.querySelector(".abnormal-count").textContent = `顯示 ${pagination.start}–${pagination.end} / 符合 ${results.length} 種 · 共 ${catalog.abnormals.length} 種`;
        content.querySelector(".abnormal-grid").innerHTML = pagination.items.map(item => `<button type="button" class="seal-card abnormal-card" data-abnormal-id="${escapeHtml(item.id)}" aria-haspopup="dialog" aria-controls="abnormal-detail-dialog"><span class="seal-card-header">${identity(item)}<span><strong>${escapeHtml(item.name)}</strong><span class="abnormal-badges">${badges(item)}</span></span></span><span class="seal-card-description">${escapeHtml(item.summary)}</span>${item.verificationStatus === "pending" ? '<small class="abnormal-verification">效果待確認</small>' : ""}</button>`).join("");
        content.querySelector(".abnormal-empty").hidden = results.length > 0;
        const navigation = content.querySelector(".abnormal-pagination");
        navigation.hidden = pagination.pages <= 1;
        navigation.querySelector("span").textContent = `${page} / ${pagination.pages}`;
        navigation.querySelector('[data-abnormal-page-step="-1"]').disabled = page === 1;
        navigation.querySelector('[data-abnormal-page-step="1"]').disabled = page === pagination.pages;
    }
    function mount() {
        content.innerHTML = `<div class="abnormal-toolbar"><label for="abnormal-search">搜尋名稱或效果</label><input id="abnormal-search" type="search" placeholder="例如：冰封、真實傷害、無法行動" autocomplete="off"><div class="abnormal-filters" role="group" aria-label="異常狀態分類">${ABNORMAL_FILTERS.map(value => `<button type="button" data-abnormal-filter="${value}" aria-pressed="${value === category}">${value}</button>`).join("")}</div></div><p class="abnormal-count" role="status" aria-live="polite"></p><div class="abnormal-grid"></div><p class="abnormal-empty" hidden>找不到符合條件的狀態，請調整關鍵字或分類。</p><nav class="seal-pagination abnormal-pagination" aria-label="異常狀態分頁" hidden><button type="button" data-abnormal-page-step="-1">上一頁</button><span aria-live="polite"></span><button type="button" data-abnormal-page-step="1">下一頁</button></nav><p class="abnormal-catalog-note">持續回合依技能或來源效果而定。</p>`;
        content.querySelector("input").value = query;
        content.querySelector("input").addEventListener("input", event => { query = event.target.value; page = 1; renderCards(); });
        content.addEventListener("click", event => {
            const filter = event.target.closest("[data-abnormal-filter]");
            if (filter) {
                category = filter.dataset.abnormalFilter;
                page = 1;
                content.querySelectorAll("[data-abnormal-filter]").forEach(button => button.setAttribute("aria-pressed", String(button === filter)));
                renderCards();
            }
            const card = event.target.closest("[data-abnormal-id]");
            if (card) openAbnormal(card.dataset.abnormalId, { trigger: card });
            const pageButton = event.target.closest("[data-abnormal-page-step]");
            if (pageButton && !pageButton.disabled) {
                page += Number(pageButton.dataset.abnormalPageStep);
                renderCards();
                content.querySelector(".abnormal-grid").scrollIntoView({ block: "start" });
            }
        });
        renderCards();
    }
    async function load(id = null) {
        const current = ++generation;
        try {
            if (!catalog) {
                content.textContent = "正在載入異常狀態資料…";
                request ??= fetchImpl(new URL("../data/abnormal.json", import.meta.url)).then(response => {
                    if (!response.ok) throw new Error("載入失敗");
                    return response.json();
                }).then(validateAbnormalCatalog).catch(error => { request = null; throw error; });
                const data = await request;
                if (current !== generation) return;
                catalog = data;
                mount();
            }
            if (current !== generation) return;
            closeSilently();
            content.querySelector(".abnormal-route-message")?.remove();
            if (id !== null && id !== undefined && !openAbnormal(id, { updateUrl: false })) {
                const message = document.createElement("p");
                message.className = "abnormal-route-message";
                message.role = "status";
                message.textContent = "找不到此異常狀態。你仍可從下方圖鑑搜尋。";
                content.prepend(message);
            }
        } catch {
            if (current !== generation) return;
            content.innerHTML = '<p role="alert">異常狀態資料暫時無法載入。</p><button type="button" class="abnormal-retry">重新載入</button>';
            content.querySelector("button").addEventListener("click", () => void load(id), { once: true });
        }
    }
    function deactivate() {
        generation++;
        closeSilently();
    }
    return { load, deactivate };
}
