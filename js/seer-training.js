import { TRAINING_STATS as STATS, zeroStats, calculateTraining, trainingModes } from "./seer-training-core.js";
import { fetchMintmarkCatalog, fetchMintmarkSeries, mintmarkCornerCount } from "./seer-mintmarks.js";
import { observeMintmarkImage, unobserveMintmarkImages } from "./seer-mintmark-images.js";
import { initTrainingSelectors, skinImageId } from "./seer-training-selectors.js";
import { mintmarkFinalStats } from "./seer-mintmark-stats.js";

const API = "https://api.seerapi.com/v1/";

export function initSeerTraining(root, { fetchSeerJson, convertToTraditionalChinese: traditional, convertToSimplifiedChinese: simplified }) {
    const selected = new Map(), cache = new Map();
    let natures = [], naturePending, advancedStats = null, petVersion = 0, resultMode = "PVP", selectedSkin = null;
    const teamLimits = {atk:15,sp_atk:15,def:15,sp_def:15,spd:10,hp:30};
    const statsInputs = (prefix, max, value = 0) => STATS.map(([key, label]) => `<label>${label}${typeof max === "object" ? '<span class="training-bounded-input">' : ""}<input aria-label="${prefix}${label}" data-stat="${key}" type="number" min="0" max="${typeof max === "object" ? max[key] : max}" step="1" value="${value}"${typeof max === "object" ? ` aria-describedby="training-team-limit-${key}"` : ""}>${typeof max === "object" ? `<span id="training-team-limit-${key}" class="training-input-limit"><span aria-hidden="true">/ </span><span class="sr-only">上限 </span>${max[key]}</span></span>` : ""}</label>`).join("");
    root.innerHTML = `<div class="training-heading"><div><h2>精靈模擬培養 <span class="training-beta">Beta 版</span></h2><p>調整培養與裝備，即時比較 PVE／PVP 能力值。</p></div><span class="training-level">Lv.100</span></div>
        <div class="training-layout"><section class="training-stage training-card" aria-label="精靈立繪與刻印"><div class="training-stagebar"><span data-appearance-name>原始外觀</span><div class="training-stage-actions"><button type="button" data-pet-select hidden>更換精靈</button><button type="button" data-skin-select disabled>關聯皮膚</button></div></div><div class="training-art"><img data-training-art hidden alt=""><button type="button" data-art-placeholder aria-label="選擇精靈"><span>＋</span><p>選擇一隻精靈<br>開始模擬培養</p></button></div><div class="training-mintmarks">${[0,1,2].map(i => `<div class="training-mintmark"><button type="button" class="training-mint-slot" data-mint-slot="${i}" aria-label="選擇刻印 ${i+1}"><span class="training-mint-icon">＋</span><strong>選擇刻印</strong><small>刻印 ${i+1}</small></button><button type="button" data-mint-clear="${i}" hidden>卸下</button></div>`).join("")}</div><p class="training-hint training-mint-hint">刻印數值已包含隱藏加成；點擊刻印槽選擇。</p>${[0,1,2].map(i => `<details class="training-mint-adjust" data-mint-values="${i}" hidden><summary>刻印 ${i+1} · 調整能力值</summary><div class="training-stat-inputs">${statsInputs(`刻印${i+1}`,9999)}</div><button type="button" data-mint-max="${i}">還原最終值</button></details>`).join("")}</section><div class="training-editor">
            <section class="training-card training-profile">
                <div class="training-pet" hidden><img width="58" height="58" alt=""><div><strong></strong><p></p></div><button type="button" data-pet-clear aria-label="清除精靈">×</button></div>
                <div class="training-race" hidden><label data-race-picker hidden>種族值版本<select aria-label="種族值版本" data-race-mode><option value="normal">覺醒前</option><option value="advance">神諭覺醒</option></select></label><p class="training-hint" data-race-status role="status"></p><button type="button" data-race-retry hidden>重試覺醒資料</button><div class="training-race-stats"></div></div>
                <div class="training-basic"><label>個性<select aria-label="個性" data-nature><option value="">平衡個性（無修正）</option></select></label><label>個體值<input aria-label="個體值" data-iv type="number" min="0" max="31" step="1" value="31"></label><label>體力上限培養<input aria-label="體力上限培養" data-hp-training type="number" min="0" max="20" step="1" value="0"></label></div>
                <p class="training-nature-note">個性不影響體力。</p>
                <label class="training-year"><input type="checkbox" data-year-bonus>年費加成 <span>全能力 +10</span></label>
            </section>
            <section class="training-card training-results"><div class="training-section-heading"><h3>能力值</h3><div class="training-mode-tabs" role="tablist" aria-label="能力值模式">${[["base","基礎"],["PVE","PVE"],["PVP","PVP"]].map(([mode,label]) => `<button type="button" role="tab" data-result-mode="${mode}" aria-selected="${mode === "PVP"}" class="${mode === "PVP" ? "is-active" : ""}">${label}</button>`).join("")}</div></div><p class="training-result-error" role="status" data-error></p><div class="training-ability-caption"><span data-result-name>尚未選擇精靈</span><span>能力值 / 學習力</span></div><div class="training-ability-grid" data-ev>${STATS.map(([key,label]) => `<label class="training-ability" data-ability="${key}"><span>${label}</span><output data-result="${key}">—</output><input aria-label="學習力${label}" data-stat="${key}" type="number" min="0" max="255" step="1" value="0"></label>`).join("")}</div><div class="training-section-heading training-ev-footer"><span>學習力 <b data-ev-total>0 / 510</b></span><button type="button" data-ev-clear>清空學習力</button></div><p class="training-hint" data-mode-note>PVP 模式：包含在玩家對戰有效的裝備加成。</p><details class="training-breakdown"><summary>加成來源與計算說明</summary><div data-breakdown></div><p>一般計算順序：基礎能力＋固定加成，再套用套裝百分比並捨去小數。體力上限培養於套裝加成後加入。</p></details></section>
            <section class="training-card"><h3>裝備與稱號</h3><div class="training-equipment"><div><h4>套裝</h4><div class="training-suit-selection"><button type="button" data-suit-select>選擇套裝 <span>›</span></button><button type="button" data-suit-remove hidden>卸下</button></div><p class="training-effect" data-effect="suit"></p></div>${[["eye","目鏡"],["title","稱號"]].map(([id, label]) => `<div><h4>${label}</h4><div data-picker="${id}"></div><p class="training-effect" data-effect="${id}"></p></div>`).join("")}</div></section>
            <details class="training-card training-advanced"><summary>戰隊加成</summary><p class="training-hint">填入戰隊提供的能力加成；年費加成請使用上方勾選框。</p><div class="training-stat-inputs" data-extra>${statsInputs("戰隊加成", teamLimits)}</div></details>
        </div></div><p class="training-limit">Beta 版採一般滿級公式；異能精靈、特殊套裝的例外與戰鬥中條件效果尚未納入。命中、暴擊與減傷不計入六維。</p>
        <dialog class="training-mint-dialog" aria-labelledby="training-mint-title"><div class="training-dialog-heading"><div><h3 id="training-mint-title">選擇刻印</h3><p>採最大能力值＋隱藏數值，選取後可調整。</p></div><button type="button" data-mint-dialog-close aria-label="關閉刻印選擇">×</button></div><div class="training-dialog-filters"><input type="search" aria-label="搜尋刻印" placeholder="刻印名稱或 ID…"><select aria-label="刻印角數"><option value="all">全部角數</option>${[2,3,4,5].map(i => `<option value="${i}">${i} 角</option>`).join("")}</select><select aria-label="刻印系列"><option value="all">全部系列</option></select></div><p data-mint-dialog-status role="status"></p><button type="button" data-mint-dialog-retry hidden>重新載入</button><div class="training-dialog-grid"></div><nav class="training-dialog-pagination" aria-label="刻印選擇分頁"><button type="button" data-mint-prev>上一頁</button><span></span><button type="button" data-mint-next>下一頁</button></nav></dialog>
        <p class="training-credit">資料來源：<a href="https://api.seerapi.com/" target="_blank" rel="noopener noreferrer">SeerAPI</a> · <a href="https://www.bilibili.com/read/cv11168267" target="_blank" rel="noopener noreferrer">能力值公式參考</a></p>`;
    const query = selector => root.querySelector(selector);
    const vector = element => Object.fromEntries([...element.querySelectorAll("[data-stat]")].map(input => [input.dataset.stat, input.value === "" ? NaN : Number(input.value)]));
    const name = record => traditional(record.name);
    function updateAppearance() {
        const pet = selected.get("pet"); if (!pet) return;
        const imageId = selectedSkin ? skinImageId(selectedSkin) : pet.resource_id || pet.id;
        const art = query("[data-training-art]"); art.hidden = false; art.alt = selectedSkin ? name(selectedSkin) : name(pet);
        art.src = `https://newseer.61.com/web/monster/body/${imageId}.png`;
        query("[data-art-placeholder]").hidden = true;
        query("[data-appearance-name]").textContent = selectedSkin ? name(selectedSkin) : "原始外觀";
        query(".training-pet img").src = `https://newseer.61.com/web/monster/head/${imageId}.png`;
    }
    async function fetchCached(url) {
        if (!cache.has(url)) cache.set(url, fetchSeerJson(url, {signal: AbortSignal.timeout(20000)}).catch(error => { cache.delete(url); throw error; }));
        return cache.get(url);
    }
    function description(record, kind) {
        return kind === "title" ? record.ability_desc || "無六維能力加成" : record.bonus?.desc || "無六維能力加成";
    }
    function source(record, kind) {
        const stats = kind === "title" ? record.attr_bonus : record.bonus?.attribute;
        if (!stats || stats.percent) return null;
        return {label:name(record), stats, modes:trainingModes(record, description(record, kind))};
    }
    function activeRace() {
        return query("[data-race-mode]").value === "advance" && advancedStats ? advancedStats : selected.get("pet")?.base_stats;
    }
    function renderRace() {
        const pet = selected.get("pet"), race = activeRace();
        query(".training-race-stats").replaceChildren();
        if (!pet) return;
        for (const [key,label] of STATS) {
            const item = document.createElement("span"); item.textContent = `${label} ${race?.[key] ?? "—"}`; query(".training-race-stats").append(item);
        }
        query(".training-pet p").textContent = `#${pet.id} · 種族值總和 ${race?.total ?? "—"}${advancedStats ? ` · ${query("[data-race-mode]").value === "advance" ? "神諭覺醒" : "覺醒前"}` : ""}`;
    }
    async function loadAdvance(pet) {
        const version = ++petVersion;
        query("[data-race-retry]").hidden = true;
        query("[data-race-status]").textContent = "正在載入神諭覺醒種族值；目前以覺醒前計算。";
        try {
            const advance = await fetchCached(`${API}pet_advance/${encodeURIComponent(pet.advance.id)}`);
            if (version !== petVersion || selected.get("pet") !== pet) return;
            if (!STATS.every(([key]) => Number.isFinite(advance.base_stats?.[key]))) throw new Error("覺醒種族值不完整");
            advancedStats = advance.base_stats;
            query("[data-race-picker]").hidden = false;
            query("[data-race-status]").textContent = "";
            renderRace(); recalculate();
        } catch(error) {
            if (version !== petVersion || selected.get("pet") !== pet) return;
            query("[data-race-status]").textContent = "神諭覺醒資料暫時無法取得，目前以覺醒前計算。";
            query("[data-race-retry]").hidden = false;
        }
    }
    function recalculate() {
        const ev = vector(query("[data-ev]"));
        const total = STATS.reduce((sum,[key]) => sum + (ev[key] || 0), 0);
        query("[data-ev-total]").textContent = `${total} / 510`;
        query("[data-ev-total]").classList.toggle("is-invalid", total > 510);
        const pet = selected.get("pet");
        const sources = [0,1,2].filter(i => selected.has(`mint${i}`)).map(i => ({label:`刻印 ${i+1} · ${name(selected.get(`mint${i}`))}`,stats:vector(query(`[data-mint-values="${i}"]`)),modes:["PVE","PVP"]}));
        for (const kind of ["eye","title"]) { const record = selected.get(kind); if (record) { const added = source(record, kind); if (added) sources.push(added); } }
        sources.push({label:"戰隊加成", stats:vector(query("[data-extra]")),modes:["PVE","PVP"]});
        if (query("[data-year-bonus]").checked) sources.push({label:"年費加成",stats:Object.fromEntries(STATS.map(([key]) => [key,10])),modes:["PVE","PVP"]});
        const suitRecord = selected.get("suit");
        const suitPetIds = suitRecord?.bonus?.effective_pets || [];
        const suitEligible = !suitPetIds.length || suitPetIds.some(item => Number(item.id ?? item) === pet?.id);
        const suit = suitRecord?.bonus?.attribute && suitEligible ? {stats:suitRecord.bonus.attribute,modes:trainingModes(suitRecord,description(suitRecord,"suit"))} : null;
        const breakdown = query("[data-breakdown]"); breakdown.replaceChildren();
        for (const added of sources) {
            if (!STATS.some(([key]) => added.stats[key])) continue;
            const p = document.createElement("p"); p.textContent = `${added.label}：${STATS.filter(([key]) => added.stats[key]).map(([key,label]) => `${label} +${added.stats[key]}`).join("、")}（${added.modes.join("／") || "無有效模式"}）`; breakdown.append(p);
        }
        if (suit) { const p = document.createElement("p"); p.textContent = `${name(suitRecord)}：${STATS.filter(([key]) => suit.stats[key]).map(([key,label]) => `${label} +${suit.stats[key]}${suit.stats.percent ? "%" : ""}`).join("、")}（${suit.modes.join("／")}）`; breakdown.append(p); }
        const hpTraining = query("[data-hp-training]").value === "" ? NaN : Number(query("[data-hp-training]").value);
        if (hpTraining > 0) { const p = document.createElement("p"); p.textContent = `體力上限培養：體力 +${hpTraining}（PVE／PVP；於套裝加成後加入）`; breakdown.append(p); }
        let result;
        query("[data-result-name]").textContent = pet ? `${name(pet)}${advancedStats ? ` · ${query("[data-race-mode]").value === "advance" ? "神諭覺醒" : "覺醒前"}` : ""}` : "尚未選擇精靈";
        query("[data-error]").textContent = "";
        if (pet) {
            try {
                for (const id of ["mint0","mint1","mint2"]) {
                    const record = selected.get(id);
                    if (record?.pet?.length && !record.pet.some(item => Number(item.id ?? item) === pet.id)) throw new Error(`${name(record)}為專屬刻印，所選精靈不符合使用限制。`);
                }
                for (const added of sources) for (const [key] of STATS) if (!Number.isInteger(added.stats[key]) || added.stats[key] < 0 || added.stats[key] > 9999) throw new Error("加成能力值需為 0～9999 的整數。");
                if (selected.get("title")?.attr_bonus?.percent || selected.get("eye")?.bonus?.attribute?.percent) throw new Error("此稱號或目鏡含百分比能力加成，Beta 版尚未支援其結算方式，請改選或清除。");
                result = calculateTraining({race:activeRace(),ev,iv:query("[data-iv]").value === "" ? NaN : Number(query("[data-iv]").value),nature:natures.find(item => String(item.id) === query("[data-nature]").value)?.attributes || {},sources,suit,hpTraining});
            } catch(error) { query("[data-error]").textContent = error.message; }
        }
        for (const [key] of STATS) query(`[data-result="${key}"]`).textContent = result ? result[resultMode][key] : "—";
    }
    function choose(id, record) {
        selected.set(id, record);
        if (id === "pet") {
            petVersion++; advancedStats = null;
            query(".training-race").hidden = false;
            query("[data-race-picker]").hidden = true;
            query("[data-race-mode]").value = "normal";
            query("[data-race-status]").textContent = "";
            query("[data-race-retry]").hidden = true;
            const preview = query(".training-pet"); preview.hidden = false; preview.querySelector("img").src = `https://newseer.61.com/web/monster/head/${record.resource_id || record.id}.png`; preview.querySelector("img").alt = name(record); preview.querySelector("strong").textContent = name(record); preview.querySelector("p").textContent = `#${record.id} · 種族值總和 ${record.base_stats?.total ?? "—"}`;
            selectedSkin = null; query("[data-pet-select]").hidden = false; updateAppearance(); query("[data-skin-select]").disabled = false;
            renderRace();
            if (record.advance?.id != null) loadAdvance(record);
        } else if (id.startsWith("mint")) {
            const section = query(`[data-mint-values="${id.slice(4)}"]`); section.hidden = false;
            section.querySelectorAll("input").forEach(input => input.value = mintmarkFinalStats(record)?.[input.dataset.stat] || 0);
            renderMintSlot(Number(id.slice(4)));
        } else { query(`[data-effect="${id}"]`).textContent = traditional(description(record, id)); if (id === "suit") { query("[data-suit-select]").textContent = `${name(record)} · #${record.id} ›`; query("[data-suit-remove]").hidden = false; } }
        recalculate();
    }
    const petDialog = document.createElement("dialog");
    petDialog.className = "training-mint-dialog training-pet-dialog";
    petDialog.setAttribute("aria-labelledby","training-pet-dialog-title");
    petDialog.innerHTML = `<div class="training-dialog-heading"><div><h3 id="training-pet-dialog-title">選擇精靈</h3><p>搜尋名稱或 ID，選擇要培養的精靈。</p></div><button type="button" data-pet-dialog-close aria-label="關閉精靈選擇">×</button></div><div data-picker="pet"></div>`;
    root.append(petDialog);
    let petInvoker;
    const openPet = event => { petInvoker = event.currentTarget; petDialog.showModal(); petDialog.querySelector("input").focus(); };
    query("[data-art-placeholder]").addEventListener("click",openPet);
    query("[data-pet-select]").addEventListener("click",openPet);
    query("[data-pet-dialog-close]").addEventListener("click",() => petDialog.close());
    petDialog.addEventListener("close",() => { const target = petInvoker?.hidden ? query("[data-pet-select]") : petInvoker; target?.focus({preventScroll:true}); });
    const choiceWindows = initTrainingSelectors(root,{fetchJson:fetchCached,traditional,simplified,getPet:() => selected.get("pet"),onSuit:record => choose("suit",record),onSkin:skin => { selectedSkin = skin; updateAppearance(); }});
    query("[data-suit-select]").addEventListener("click",event => choiceWindows.open("suit",event.currentTarget));
    query("[data-skin-select]").addEventListener("click",event => choiceWindows.open("skin",event.currentTarget));
    query("[data-suit-remove]").addEventListener("click",() => { selected.delete("suit"); query("[data-suit-select]").textContent = "選擇套裝 ›"; query("[data-suit-remove]").hidden = true; query('[data-effect="suit"]').textContent = ""; recalculate(); });
    const mintDialog = query(".training-mint-dialog"), mintGrid = query(".training-dialog-grid");
    let mintCatalog = [], mintPending, mintSlot = 0, mintPage = 1, mintReady = false, slotInvoker;
    const mintSearch = mintDialog.querySelector("input"), mintCorners = mintDialog.querySelector('[aria-label="刻印角數"]'), mintSeries = mintDialog.querySelector('[aria-label="刻印系列"]');
    function renderMintSlot(index) {
        const slot = query(`[data-mint-slot="${index}"]`), record = selected.get(`mint${index}`);
        unobserveMintmarkImages(slot);
        const oldIcon = slot.querySelector(".training-mint-icon"), icon = document.createElement("span"); icon.className = "training-mint-icon"; oldIcon.replaceWith(icon);
        slot.querySelector("strong").textContent = record ? name(record) : "選擇刻印";
        slot.querySelector("small").textContent = record ? `#${record.id}` : `刻印 ${index+1}`;
        slot.classList.toggle("has-mint",Boolean(record));
        query(`[data-mint-clear="${index}"]`).hidden = !record;
        if (record) observeMintmarkImage(icon,record.id); else icon.textContent = "＋";
    }
    function renderMintChoices() {
        if (!mintReady || !mintDialog.open) return;
        const key = simplified(mintSearch.value.trim()).toLocaleLowerCase(), pet = selected.get("pet");
        const filtered = mintCatalog.filter(record => [0,3].includes(Number(record.type?.id)) && !record.is_hidden
            && (!record.pet?.length || (pet && record.pet.some(item => Number(item.id ?? item) === pet.id)))
            && (!key || String(record.id).includes(key) || record.name.toLocaleLowerCase().includes(key))
            && (mintCorners.value === "all" || mintmarkCornerCount(record) === Number(mintCorners.value))
            && (mintSeries.value === "all" || String(record.mintmark_class?.id) === mintSeries.value)).sort((a,b) => b.id-a.id);
        const pages = Math.max(1,Math.ceil(filtered.length/12)); mintPage = Math.min(mintPage,pages);
        unobserveMintmarkImages(mintGrid); mintGrid.replaceChildren();
        query("[data-mint-dialog-status]").textContent = `${filtered.length} 個可選刻印${pet ? " · 已排除其他精靈的專屬刻印" : " · 先選精靈可查看對應專屬刻印"}`;
        for (const record of filtered.slice((mintPage-1)*12,mintPage*12)) {
            const button = document.createElement("button"); button.type = "button"; button.className = "training-dialog-mint";
            const icon = document.createElement("span"); icon.className = "training-mint-icon";
            const info = document.createElement("span"), title = document.createElement("strong"), meta = document.createElement("small"), stats = document.createElement("small");
            title.textContent = name(record); meta.textContent = `#${record.id} · ${Number(record.type?.id) === 3 ? "全能" : "能力"}刻印${mintmarkCornerCount(record) ? ` · ${mintmarkCornerCount(record)}角` : ""}`;
            const finalStats = mintmarkFinalStats(record);
            stats.textContent = STATS.filter(([key]) => finalStats?.[key]).map(([key,label]) => `${label} ${finalStats[key]}`).join(" / ");
            info.append(title,meta,stats); button.append(icon,info); mintGrid.append(button); observeMintmarkImage(icon,record.id);
            button.addEventListener("click",() => { choose(`mint${mintSlot}`,record); mintDialog.close(); });
        }
        query(".training-dialog-pagination span").textContent = `${mintPage} / ${pages}`;
        query("[data-mint-prev]").disabled = mintPage === 1; query("[data-mint-next]").disabled = mintPage === pages;
    }
    async function loadMintChoices() {
        if (mintReady) { renderMintChoices(); return; }
        query("[data-mint-prev]").disabled = true; query("[data-mint-next]").disabled = true;
        query("[data-mint-dialog-retry]").hidden = true;
        if (!mintPending) mintPending = Promise.all([fetchMintmarkCatalog(fetchCached,(count,total) => { if (mintDialog.open) query("[data-mint-dialog-status]").textContent = `載入刻印資料 ${count} / ${total ?? "…"}`; }),fetchMintmarkSeries(fetchCached)]).then(([records,series]) => {
            mintCatalog = records; mintReady = true;
            for (const item of series) mintSeries.append(new Option(traditional(item.name),String(item.id)));
        }).catch(error => { mintPending = null; if (mintDialog.open) { query("[data-mint-dialog-status]").textContent = "刻印資料載入失敗，請重試。"; query("[data-mint-dialog-retry]").hidden = false; } });
        query("[data-mint-dialog-status]").textContent = "正在載入刻印資料…";
        await mintPending; renderMintChoices();
    }
    for (const button of root.querySelectorAll("[data-mint-slot]")) button.addEventListener("click",() => {
        mintSlot = Number(button.dataset.mintSlot); slotInvoker = button; mintPage = 1;
        query("#training-mint-title").textContent = `選擇刻印 ${mintSlot+1}`;
        mintDialog.showModal(); mintSearch.focus(); loadMintChoices();
    });
    for (const button of root.querySelectorAll("[data-mint-clear]")) button.addEventListener("click",() => {
        const index = Number(button.dataset.mintClear); selected.delete(`mint${index}`); query(`[data-mint-values="${index}"]`).hidden = true; renderMintSlot(index); recalculate();
    });
    query("[data-mint-dialog-close]").addEventListener("click",() => mintDialog.close());
    mintDialog.addEventListener("close",() => { unobserveMintmarkImages(mintGrid); mintGrid.replaceChildren(); slotInvoker?.focus({preventScroll:true}); });
    for (const element of [mintSearch,mintCorners,mintSeries]) element.addEventListener(element === mintSearch ? "input" : "change",() => { mintPage = 1; renderMintChoices(); });
    query("[data-mint-prev]").addEventListener("click",() => { mintPage--; renderMintChoices(); });
    query("[data-mint-next]").addEventListener("click",() => { mintPage++; renderMintChoices(); });
    query("[data-mint-dialog-retry]").addEventListener("click",loadMintChoices);
    query("[data-training-art]").addEventListener("error",() => { query("[data-training-art]").hidden = true; query("[data-art-placeholder]").hidden = false; query("[data-art-placeholder] p").textContent = "立繪暫時無法取得"; });
    for (const picker of root.querySelectorAll("[data-picker]")) {
        const id = picker.dataset.picker, resource = id.startsWith("mint") ? "mintmark" : id === "eye" ? "equip" : id;
        const label = id === "pet" ? "精靈" : id.startsWith("mint") ? "刻印" : id === "eye" ? "目鏡" : id === "suit" ? "套裝" : "稱號";
        picker.innerHTML = `<form class="training-search"><input type="search" aria-label="搜尋${label}" placeholder="搜尋${label}名稱或 ID…" autocomplete="off" required><button type="submit">搜尋</button></form><div class="training-selected" hidden><strong></strong><button type="button" aria-label="清除${label}">×</button></div><p class="training-search-status" role="status"></p><div class="training-options"></div>`;
        let version = 0;
        const input = picker.querySelector("input"), status = picker.querySelector(".training-search-status"), options = picker.querySelector(".training-options"), chosen = picker.querySelector(".training-selected");
        const clear = () => {
            version++; selected.delete(id); chosen.hidden = true; status.textContent = ""; options.replaceChildren();
            if (id === "pet") { query("[data-pet-select]").hidden = true; petVersion++; advancedStats = null; selectedSkin = null; query("[data-skin-select]").disabled = true; query("[data-appearance-name]").textContent = "原始外觀"; query(".training-pet").hidden = true; query(".training-race").hidden = true; query("[data-race-mode]").value = "normal"; query("[data-training-art]").hidden = true; query("[data-training-art]").removeAttribute("src"); query("[data-art-placeholder]").hidden = false; query("[data-art-placeholder] p").innerHTML = "選擇一隻精靈<br>開始模擬培養"; }
            else if (id.startsWith("mint")) query(`[data-mint-values="${id.slice(4)}"]`).hidden = true;
            else query(`[data-effect="${id}"]`).textContent = "";
            recalculate();
        };
        chosen.querySelector("button").addEventListener("click", clear);
        if (id === "pet") query("[data-pet-clear]").addEventListener("click",clear);
        input.addEventListener("input", () => { version++; options.replaceChildren(); status.textContent = ""; });
        picker.querySelector("form").addEventListener("submit", async event => {
            event.preventDefault(); const term = input.value.trim(); if (!term) return;
            const request = ++version; options.replaceChildren(); status.textContent = "搜尋中…";
            try {
                const params = new URLSearchParams({name:simplified(term),limit:"20",expand:"true"});
                const data = await fetchCached(/^\d+$/.test(term) ? `${API}${resource}/${encodeURIComponent(term)}` : `${API}${resource}?${params}`);
                if (request !== version) return;
                const records = (data.results || (data.id != null ? [data] : Object.values(data.data || {}))).filter(record => id === "eye" ? Number(record.part_type?.id) === 1 : id.startsWith("mint") ? [0,3].includes(Number(record.type?.id)) && !record.is_hidden : true).sort((a,b) => b.id-a.id);
                status.textContent = records.length ? `找到 ${records.length} 筆，點擊選擇${data.count > 20 ? "；可輸入更完整名稱縮小結果" : ""}。` : `找不到符合的${label}。`;
                for (const record of records) {
                    const button = document.createElement("button"); button.type = "button"; button.textContent = `${name(record)} · #${record.id}`;
                    button.addEventListener("click", () => {
                        version++; chosen.hidden = false; chosen.querySelector("strong").textContent = name(record); options.replaceChildren(); status.textContent = ""; input.value = ""; choose(id,record); if (id === "pet") petDialog.close();
                        if (id.startsWith("mint") && record.pet?.length && !record.pet.some(p => p.id === selected.get("pet")?.id)) status.textContent = "此為專屬刻印，請確認所選精靈可使用。";
                    }); options.append(button);
                }
            } catch(error) { if (request === version) status.textContent = "搜尋失敗，請稍後再試或改用 ID。"; }
        });
    }
    query("[data-ev-clear]").addEventListener("click", () => { query("[data-ev]").querySelectorAll("input").forEach(input => input.value = 0); recalculate(); });
    query("[data-race-mode]").addEventListener("change", () => { renderRace(); recalculate(); });
    query("[data-race-retry]").addEventListener("click", () => { const pet = selected.get("pet"); if (pet?.advance) loadAdvance(pet); });
    for (const button of root.querySelectorAll("[data-mint-max]")) button.addEventListener("click", () => { const id = button.dataset.mintMax; const record = selected.get(`mint${id}`); if (record) choose(`mint${id}`,record); });
    root.addEventListener("input", event => {
        const input = event.target;
        if (!input.matches('input[type="number"]')) return;
        if (input.closest("[data-ev]") && input.value !== "") input.value = Math.max(0,Math.min(255,Math.trunc(Number(input.value))));
        if (input.closest("[data-extra]") && input.value !== "") input.value = Math.max(0,Math.min(teamLimits[input.dataset.stat],Math.trunc(Number(input.value))));
        recalculate();
    });
    query("[data-year-bonus]").addEventListener("change",recalculate);
    for (const tab of root.querySelectorAll("[data-result-mode]")) {
        tab.addEventListener("click",() => {
            resultMode = tab.dataset.resultMode; query(".training-results").dataset.mode = resultMode;
            root.querySelectorAll("[data-result-mode]").forEach(button => { button.classList.toggle("is-active",button === tab); button.setAttribute("aria-selected",String(button === tab)); });
            query("[data-mode-note]").textContent = resultMode === "base" ? "基礎模式：只含種族值、個體、個性與學習力。" : `${resultMode} 模式：包含${resultMode === "PVE" ? " BOSS " : "玩家"}對戰有效的加成與體力上限培養。`;
            recalculate();
        });
        tab.addEventListener("keydown",event => {
            if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
            event.preventDefault(); const tabs = [...root.querySelectorAll("[data-result-mode]")], index = tabs.indexOf(tab);
            const next = tabs[event.key === "Home" ? 0 : event.key === "End" ? 2 : (index+(event.key === "ArrowRight" ? 1 : 2))%3]; next.click(); next.focus();
        });
    }
    query("[data-nature]").addEventListener("change", () => {
        const nature = natures.find(item => String(item.id) === query("[data-nature]").value);
        query(".training-nature-note").textContent = nature ? traditional(nature.des2 || nature.des) : "個性不影響體力。";
        recalculate();
    });
    return { async load() {
        if (!naturePending) naturePending = fetchCached(`${API}nature?limit=200&expand=true`).then(data => {
            natures = data.results || []; const select = query("[data-nature]");
            for (const item of natures) select.append(new Option(`${name(item)} · ${traditional(item.des)}`,item.id));
        }).catch(() => { naturePending = null; query(".training-nature-note").textContent = "個性載入失敗，重新進入頁籤可重試。目前使用無修正個性。"; });
        await naturePending;
    } };
}
