const API = "https://api.seerapi.com/v1/";
import { COMMON_SUIT_IDS as COMMON_SUITS } from "./data/suit-catalog.js";

export function skinImageId(skin) {
    return Number(skin.id) === 840 ? 1400812 : Number(skin.resource_id) || Number(`1400${skin.id}`);
}

export async function fetchTrainingChoices(resource, fetchJson) {
    if (!["suit","pet_skin"].includes(resource)) throw new Error("選擇資料類型無效");
    const records = new Map(), seen = new Set();
    let next = `${API}${resource}?limit=200&expand=true`;
    while (next) {
        const url = new URL(next);
        if (url.origin !== "https://api.seerapi.com" || url.pathname !== `/v1/${resource}` || seen.has(url.href)) throw new Error("選擇資料分頁無效");
        seen.add(url.href);
        const page = await fetchJson(url.href);
        if (!Array.isArray(page.results)) throw new Error("選擇資料格式無效");
        for (const record of page.results) if (Number.isSafeInteger(record.id) && typeof record.name === "string") records.set(record.id,record);
        if (records.size > 10000 || seen.size > 50) throw new Error("選擇資料超出範圍");
        next = page.next;
    }
    return [...records.values()];
}

export function initTrainingSelectors(root,{fetchJson,traditional,simplified,getPet,onSuit,onSkin,images}) {
    const dialog = document.createElement("dialog"); dialog.className = "training-mint-dialog training-choice-dialog";
    dialog.setAttribute("aria-labelledby","training-choice-title");
    dialog.innerHTML = `<div class="training-dialog-heading"><div><h3 id="training-choice-title"></h3><p data-choice-caption></p></div><button type="button" class="seer-pet-info-close" data-choice-close aria-label="關閉選擇視窗">×</button></div><div class="training-choice-filters"><input type="search" aria-label="搜尋選項" placeholder="名稱或 ID…"><select aria-label="套裝類型"><option value="all">全部套裝</option><option value="common">常用套裝</option><option value="bonus">能力套裝</option><option value="appearance">炫酷套裝</option></select></div><p data-choice-status role="status"></p><button type="button" data-choice-retry hidden>重新載入</button><div class="training-choice-grid"></div><nav class="training-dialog-pagination" aria-label="選擇分頁"><button type="button" data-choice-prev>上一頁</button><span></span><button type="button" data-choice-next>下一頁</button></nav>`;
    root.append(dialog);
    const query = selector => dialog.querySelector(selector), search = query("input"), type = query("select"), grid = query(".training-choice-grid");
    const catalogs = new Map(); let kind, page = 1, invoker, version = 0;
    function render(records) {
        const term = simplified(search.value.trim()).toLocaleLowerCase();
        const pet = getPet();
        const filtered = records.filter(record => kind !== "skin" || Number(record.pet?.id) === pet?.id)
            .filter(record => !term || String(record.id).includes(term) || record.name.toLocaleLowerCase().includes(term))
            .filter(record => kind !== "suit" || type.value === "all" || (type.value === "common" ? COMMON_SUITS.has(record.id) : type.value === "bonus" ? !!record.bonus : !record.bonus))
            .sort((a,b) => b.id-a.id);
        const pages = Math.max(1,Math.ceil(filtered.length/8)); page = Math.min(page,pages);
        query("[data-choice-status]").textContent = `${filtered.length} ${kind === "skin" ? "款關聯皮膚 · 僅切換外觀，培養設定保持不變" : "套套裝 · 按編號由新到舊"}`;
        grid.replaceChildren();
        if (kind === "skin" && page === 1) {
            const original = document.createElement("button"); original.type = "button"; original.className = "training-choice-card training-original-skin"; original.textContent = "原始外觀";
            original.addEventListener("click",() => { onSkin(null); dialog.close(); }); grid.append(original);
        }
        for (const record of filtered.slice((page-1)*8,page*8)) {
            const button = document.createElement("button"); button.type = "button"; button.className = "training-choice-card";
            const info = document.createElement("span"), title = document.createElement("strong"), meta = document.createElement("small"), detail = document.createElement("p");
            title.textContent = traditional(record.name); meta.textContent = `#${record.id}${kind === "suit" ? ` · ${record.bonus ? "能力套裝" : "炫酷套裝"}` : ""}`;
            info.append(title,meta);
            if (kind === "suit") { detail.textContent = traditional(record.bonus?.desc || "無能力加成"); info.append(detail); }
            else { const image = document.createElement("img"); image.width = image.height = 64; image.loading = "lazy"; image.alt = ""; button.append(image); button.append(info); grid.append(button); images.set(image,{id:skinImageId(record),skin:record}); }
            button.append(info); grid.append(button);
            button.addEventListener("click",() => { if (kind === "suit") onSuit(record); else onSkin(record); dialog.close(); });
        }
        query("nav span").textContent = `${page} / ${pages}`;
        query("[data-choice-prev]").disabled = page === 1; query("[data-choice-next]").disabled = page === pages;
    }
    async function load() {
        const request = ++version, resource = kind === "skin" ? "pet_skin" : "suit";
        query("[data-choice-retry]").hidden = true; query("[data-choice-status]").textContent = "正在載入選項…";
        query("[data-choice-prev]").disabled = query("[data-choice-next]").disabled = true;
        if (!catalogs.has(resource)) catalogs.set(resource,fetchTrainingChoices(resource,fetchJson).catch(error => { catalogs.delete(resource); throw error; }));
        try { const records = await catalogs.get(resource); if (request === version && dialog.open) render(records); }
        catch(error) { if (request === version && dialog.open) { query("[data-choice-status]").textContent = "資料載入失敗，請重試。"; query("[data-choice-retry]").hidden = false; } }
    }
    query("[data-choice-close]").addEventListener("click",() => dialog.close());
    dialog.addEventListener("close",() => { version++; grid.replaceChildren(); invoker?.focus({preventScroll:true}); });
    search.addEventListener("input",() => { page = 1; load(); }); type.addEventListener("change",() => { page = 1; load(); });
    query("[data-choice-prev]").addEventListener("click",() => { page--; load(); }); query("[data-choice-next]").addEventListener("click",() => { page++; load(); }); query("[data-choice-retry]").addEventListener("click",load);
    return { open(nextKind,button) {
        if (nextKind === "skin" && !getPet()) return;
        kind = nextKind; invoker = button; page = 1; search.value = ""; type.hidden = kind !== "suit";
        query("#training-choice-title").textContent = kind === "skin" ? `${traditional(getPet().name)} · 關聯皮膚` : "選擇套裝";
        query("[data-choice-caption]").textContent = kind === "skin" ? "替精靈換上喜歡的外觀。" : "選擇套裝，查看效果並套用能力加成。";
        grid.replaceChildren(); dialog.showModal(); search.focus(); load();
    } };
}
