import {trainingDescription as description, trainingSource} from "./training/model.js";
import { fillLearningEffort } from "./training/learning-effort.js";
import {initTrainingSearchPickers} from "./training/search-picker.js";
import {trainingTemplate, teamLimits} from "./training/template.js";
import {createTrainingMintmarkPicker} from "./training/mintmark-picker.js";
import {createTrainingResultView} from "./training/result-view.js";
import {createTrainingExportData} from "./training/export-data.js";
import { TRAINING_STATS as STATS } from "./seer-training-core.js";
import { initTrainingSelectors, skinImageId } from "./seer-training-selectors.js";
import { initTrainingExportPreview } from "./training/export-preview.js";
import { initTrainingPetPicker } from "./training/pet-picker.js";
import { createTrainingImages } from "./training/images.js";
import { initEquipmentPresets } from "./training/equipment-presets.js";
import { createSuitEyeDetector } from "./training/suit-equipment.js";

const API = "https://api.seerapi.com/v1/";

export function initSeerTraining(root, { fetchSeerJson, convertToTraditionalChinese: traditional, convertToSimplifiedChinese: simplified }) {
    const selected = new Map(), cache = new Map();
    let natures = [], naturePending, advancedStats = null, petVersion = 0, resultMode = "PVP", selectedSkin = null;
    root.innerHTML = trainingTemplate();
    const query = selector => root.querySelector(selector);
    const vector = element => Object.fromEntries([...element.querySelectorAll("[data-stat]")].map(input => [input.dataset.stat, input.value === "" ? NaN : Number(input.value)]));
    const name = record => traditional(record.name);
    const source = (record, kind) => trainingSource(record, kind, name);
    const images = createTrainingImages({fetchCached, simplified});
    const suitHasEye = createSuitEyeDetector(fetchCached);
    let eyeState = "free", suitEyeVersion = 0;
    async function updateSuitEye(suit) {
        const request = ++suitEyeVersion; eyeState = "pending";
        equipmentPickers.setAvailability("eye",false,"正在檢查套裝是否含有目鏡…");
        recalculate();
        try {
            const included = await suitHasEye(suit);
            if (request !== suitEyeVersion || selected.get("suit") !== suit) return;
            eyeState = included ? "included" : "free";
            if (included) {selected.delete("eye"); query('[data-effect="eye"]').textContent = ""; equipmentPickers.sync("eye");}
            equipmentPickers.setAvailability("eye",!included,included ? "套裝已包含目鏡，無法另外裝備目鏡。" : "");
        } catch {
            if (request !== suitEyeVersion || selected.get("suit") !== suit) return;
            eyeState = "unknown"; equipmentPickers.setAvailability("eye",false,"無法確認套裝部件，請重新檢查。",() => updateSuitEye(suit));
        }
        recalculate();
    }
    function updateAppearance() {
        const pet = selected.get("pet"); if (!pet) return;
        const imageId = selectedSkin ? skinImageId(selectedSkin) : pet.resource_id || pet.id;
        const art = query("[data-training-art]"); art.hidden = false; art.alt = selectedSkin ? name(selectedSkin) : name(pet);
        images.set(art,{id:imageId,skin:selectedSkin,kind:"body",onUnavailable:() => { art.hidden = true; query("[data-art-placeholder]").hidden = false; query("[data-art-placeholder] p").textContent = "立繪暫時無法取得"; }});
        query("[data-art-placeholder]").hidden = true;
        query("[data-appearance-name]").textContent = selectedSkin ? name(selectedSkin) : "原始外觀";
        images.set(query(".training-pet img"),{id:imageId,skin:selectedSkin});
    }
    async function fetchCached(url) {
        if (!cache.has(url)) cache.set(url, fetchSeerJson(url, {signal: AbortSignal.timeout(20000)}).catch(error => { cache.delete(url); throw error; }));
        return cache.get(url);
    }
    
    
    function activeRace() {
        return query("[data-race-mode]").value === "advance" && advancedStats ? advancedStats : selected.get("pet")?.base_stats;
    }
    function renderRace() {
        const pet = selected.get("pet"), race = activeRace();
        query(".training-race-stats").replaceChildren();
        for (const [key,label] of STATS) {
            const item = document.createElement("span"), value = document.createElement("strong");
            item.dataset.raceStat = key; item.append(document.createTextNode(label));
            value.textContent = race?.[key] ?? "—"; item.append(value); query(".training-race-stats").append(item);
        }
        const toggle = query("[data-race-picker]");
        toggle.hidden = !advancedStats;
        toggle.textContent = query("[data-race-mode]").value === "advance" ? "切換為覺醒前" : "切換為覺醒後";
        if (!pet) return;
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
            query("[data-race-mode]").value = "advance";
            query("[data-race-picker]").hidden = false;
            query("[data-race-status]").textContent = "";
            renderRace(); recalculate();
        } catch(error) {
            if (version !== petVersion || selected.get("pet") !== pet) return;
            query("[data-race-status]").textContent = "神諭覺醒資料暫時無法取得，目前以覺醒前計算。";
            query("[data-race-retry]").hidden = false;
        }
    }
    const {recalculate} = createTrainingResultView({query, vector, selected, name, source, description, activeRace, getNatures:() => natures, getAdvancedStats:() => advancedStats, getResultMode:() => resultMode,getEyeState:() => eyeState});
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
            renderMintSlot(Number(id.slice(4)));
        } else { query(`[data-effect="${id}"]`).textContent = traditional(description(record, id)); if (id === "suit") { query("[data-suit-select]").textContent = `${name(record)} · #${record.id} ›`; query("[data-suit-remove]").hidden = false; updateSuitEye(record); } else equipmentPickers.sync(id); }
        recalculate();
    }
    const petDialog = document.createElement("dialog");
    petDialog.className = "training-mint-dialog training-pet-dialog";
    petDialog.setAttribute("aria-labelledby","training-pet-dialog-title");
    petDialog.innerHTML = `<div class="training-dialog-heading"><div><h3 id="training-pet-dialog-title">選擇精靈</h3><p>搜尋名稱或 ID，選擇要培養的精靈。</p></div><button type="button" class="seer-pet-info-close" data-pet-dialog-close aria-label="關閉精靈選擇">×</button></div><div data-training-pet-picker></div>`;
    root.append(petDialog);
    let petInvoker;
    const openPet = event => { petInvoker = event.currentTarget; petDialog.showModal(); petPicker.open(); petDialog.querySelector("input[type=search]").focus(); };
    query("[data-art-placeholder]").addEventListener("click",openPet);
    query("[data-pet-select]").addEventListener("click",openPet);
    query("[data-pet-dialog-close]").addEventListener("click",() => petDialog.close());
    petDialog.addEventListener("close",() => { const target = petInvoker?.hidden ? query("[data-pet-select]") : petInvoker; target?.focus({preventScroll:true}); });
    const choiceWindows = initTrainingSelectors(root,{fetchJson:fetchCached,traditional,simplified,getPet:() => selected.get("pet"),onSuit:record => choose("suit",record),onSkin:skin => { selectedSkin = skin; updateAppearance(); },images});
    query("[data-suit-select]").addEventListener("click",event => choiceWindows.open("suit",event.currentTarget));
    query("[data-skin-select]").addEventListener("click",event => choiceWindows.open("skin",event.currentTarget));
    query("[data-suit-remove]").addEventListener("click",() => { selected.delete("suit"); suitEyeVersion++; eyeState = "free"; equipmentPickers.setAvailability("eye",true,""); query("[data-suit-select]").textContent = "選擇套裝 ›"; query("[data-suit-remove]").hidden = true; query('[data-effect="suit"]').textContent = ""; recalculate(); });
    const {renderMintSlot} = createTrainingMintmarkPicker({root, query, selected, name, traditional, simplified, fetchCached, choose, recalculate});
    const clearPet = () => { query("[data-pet-select]").hidden = true; petVersion++; advancedStats = null; selectedSkin = null; query("[data-skin-select]").disabled = true; query("[data-appearance-name]").textContent = "原始外觀"; query(".training-pet").hidden = true; query("[data-race-picker]").hidden = true; query("[data-race-status]").textContent = ""; query("[data-race-retry]").hidden = true; query("[data-race-mode]").value = "normal"; images.clear(query("[data-training-art]")); images.clear(query(".training-pet img")); query("[data-art-placeholder]").hidden = false; query("[data-art-placeholder] p").innerHTML = "選擇一隻精靈<br>開始模擬培養"; renderRace(); };
    query("[data-pet-clear]").addEventListener("click",() => { selected.delete("pet"); clearPet(); recalculate(); });
    const petPicker = initTrainingPetPicker(petDialog,{fetchSeerJson,fetchCached,traditional,simplified,onChoose:record => choose("pet",record)});
    const equipmentPickers = initTrainingSearchPickers({root, query, selected, name, simplified, fetchCached, choose, recalculate, description:(record,id) => traditional(description(record,id))});
    initEquipmentPresets(root,{fetchCached,apply:async (records,active) => {
        const suit = records.find(([id]) => id === "suit")?.[1];
        const included = suit ? await suitHasEye(suit) : false;
        if (!active()) return;
        for (const [id,record] of records) if (id !== "eye" || !included) choose(id,record);
    }});
    query("[data-ev-clear]").addEventListener("click", () => { query("[data-ev]").querySelectorAll("input").forEach(input => input.value = 0); recalculate(); });
    query("[data-team-fill-all]").addEventListener("click", () => {
        const inputs = [...query("[data-extra]").querySelectorAll("input[data-stat]")];
        const full = inputs.every(input => input.value !== "" && Number(input.value) === teamLimits[input.dataset.stat]);
        for (const input of inputs) input.value = full ? 0 : teamLimits[input.dataset.stat];
        recalculate();
    });
    for (const button of root.querySelectorAll("[data-team-fill]")) button.addEventListener("click", () => {
        const key = button.dataset.teamFill;
        query(`[data-extra] input[data-stat="${key}"]`).value = teamLimits[key];
        recalculate();
    });
    for (const button of root.querySelectorAll("[data-ev-fill]")) button.addEventListener("click", () => {
        const key = button.dataset.evFill;
        query(`[data-ev] input[data-stat="${key}"]`).value = fillLearningEffort(vector(query("[data-ev]")), key);
        recalculate();
    });
    query("[data-race-picker]").addEventListener("click", () => {
        if (!advancedStats) return;
        query("[data-race-mode]").value = query("[data-race-mode]").value === "advance" ? "normal" : "advance";
        renderRace(); recalculate();
    });
    query("[data-race-mode]").addEventListener("change", () => { renderRace(); recalculate(); });
    query("[data-race-retry]").addEventListener("click", () => { const pet = selected.get("pet"); if (pet?.advance) loadAdvance(pet); });
    root.addEventListener("input", event => {
        const input = event.target;
        if (!input.matches('input[type="number"]')) return;
        if (input.closest("[data-ev]") && input.value !== "") input.value = Math.max(0,Math.min(255,Math.trunc(Number(input.value))));
        if (input.closest("[data-extra]") && input.value !== "") input.value = Math.max(0,Math.min(teamLimits[input.dataset.stat],Math.trunc(Number(input.value))));
        if (input.matches("[data-hp-training]") && input.value !== "") input.value = Math.max(0,Math.min(20,Math.trunc(Number(input.value))));
        recalculate();
    });
    const exportPreview = initTrainingExportPreview(root);
    query("[data-export-image]").addEventListener("click", () => {
        const feedback = query("[data-export-status]");
        recalculate();
        const pet=selected.get("pet");
        if (!pet || STATS.some(([key])=>query(`[data-result="${key}"]`).textContent === "—")) {
            feedback.hidden=false; feedback.textContent="請先選擇精靈並完成有效的培養設定。"; return;
        }
        feedback.hidden=true;
        const data=createTrainingExportData({pet, selected, query, name, resultMode, selectedSkin, advancedStats, vector, natureAttributes:natures.find(item => String(item.id) === query("[data-nature]").value)?.attributes || {}});
        exportPreview.open(data);
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
        query(".training-nature-note").textContent = nature ? traditional(nature.des2 || nature.des) : "請先選擇個性；個性不影響體力。";
        recalculate();
    });
    renderRace();
    return { async load() {
        if (!naturePending) naturePending = fetchCached(`${API}nature?limit=200&expand=true`).then(data => {
            natures = data.results || []; const select = query("[data-nature]");
            if (!natures.some(item => Number(item.id) === 1)) throw new Error("固執個性資料缺失");
            const current = select.value;
            select.replaceChildren(...natures.map(item => new Option(`${name(item)} · ${traditional(item.des)}`,item.id)));
            select.value = current || "1";
            select.dispatchEvent(new Event("change"));
        }).catch(() => { naturePending = null; query(".training-nature-note").textContent = "個性載入失敗，重新進入頁籤可重試。"; });
        await naturePending;
    } };
}
