import {getSharedLookupRepository} from "../lookup/repository.js";
import {createLookupBrowseController} from "../lookup/browse-controller.js";
import {getSeerServerSettings} from "../seer-server-settings.js";
import {getRelatedTypeOptions} from "../shared/type-options.js";
import {typeIconUrl} from "../shared/assets.js";
import {SEER_TYPE_DATA} from "../seer-type-data.js";
import {searchTrainingPets} from "./pet-search.js";
import {createPetResultButton} from "../lookup/pet-result.js";

export function initTrainingPetPicker(dialog,{fetchSeerJson,fetchCached,traditional,simplified,onChoose}) {
    const repository = getSharedLookupRepository({fetchSeerJson,convertToTraditionalChinese:traditional,convertToSimplifiedChinese:simplified});
    const host = dialog.querySelector("[data-training-pet-picker]");
    host.innerHTML = `<div class="seer-pet-search-method-tabs main-tabs view-sub-tabs" role="tablist" aria-label="精靈查詢方式"><button type="button" class="main-tab is-active" data-method="query" role="tab" aria-selected="true">ID／名稱查詢</button><button type="button" class="main-tab" data-method="type" role="tab" aria-selected="false">屬性篩選</button></div><label class="seer-taiwan-progress-filter"><input type="checkbox" data-progress>僅顯示至最新台服進度</label><form class="training-search"><input type="search" aria-label="精靈 ID／名稱" placeholder="例如：5000 或 聖靈譜尼" autocomplete="off"><button type="submit">搜尋</button></form><div data-type-filter hidden><button type="button" class="secondary-button" data-type-open>全部單屬性 · 選擇屬性 ▾</button></div><p class="training-search-status" role="status"></p><div class="training-options seer-lookup-results"></div>`;
    const query = selector => host.querySelector(selector), input = query("input[type=search]"), results = query(".training-options"), status = query("[role=status]"), progress = query("[data-progress]");
    const toolbar = document.createElement("div"); toolbar.className = "training-pet-picker-toolbar";
    toolbar.append(query(".seer-pet-search-method-tabs"),progress.parentElement); host.prepend(toolbar);
    const triggerMarkup = document.querySelector("#seer-pet-type-filter .seer-pet-type-trigger-card").outerHTML;
    query("[data-type-filter]").innerHTML = triggerMarkup.replace(/id="([^"]+)"/g,(_,id) => `id="${id.replace("seer-pet-type-","training-pet-type-")}"`);
    query("#training-pet-type-open-modal").setAttribute("data-type-open","");
    let version = 0, method = "query", category = "single", typeId = null, timer, composing = false, settingsPromise, baseType = "", catalog = [];
    function updateTypeTrigger() {
        const type = catalog.find(item => item.id === typeId);
        query("#training-pet-type-current-name").textContent = type ? traditional(type.name) : category === "single" ? "全部單屬性" : "全部雙屬性";
        const icon = query("#training-pet-type-current-icon"); icon.hidden = !type;
        if (type) icon.src = typeIconUrl(type.id); else icon.removeAttribute("src");
    }
    updateTypeTrigger();
    const preview = document.createElement("div");
    const settings = () => {
        if (!progress.checked) return Promise.resolve(null);
        if (!settingsPromise) settingsPromise = getSeerServerSettings().then(value => {
            if (!Number.isSafeInteger(value.latestPetId) || value.latestPetId < 1) throw new Error("管理後台尚未設定台服最新精靈編號。");
            return value;
        }).catch(error => {settingsPromise = null; throw error;});
        return settingsPromise;
    };
    const matches = (pet,value) => !value || Number(pet.id) === 5000 || Number(pet.id) <= value.latestPetId;
    function render(pets,types,append = false) {
        if (!append) results.replaceChildren();
        for (const pet of pets) {
            const button = createPetResultButton(pet,types,traditional,{showAdvance:true}); results.append(button);
            button.addEventListener("click",async () => {
                const request = ++version; button.disabled = true; status.textContent = "正在載入精靈資料…";
                browse.resetBrowseState(); browse.clearSeerBrowseSentinel();
                try { const record = await repository.fetchSeerPetDetails(pet.id); if (request === version && dialog.open) {onChoose(record); dialog.close();} }
                catch {if (request === version) {status.textContent = "精靈資料載入失敗，請重新選擇。"; button.disabled = false;}}
            });
        }
    }
    const typeDetails = async pets => new Map(SEER_TYPE_DATA.combinations.map(type => [String(type.id),type]));
    const browse = createLookupBrowseController({seerLookupResults:results,seerLookupIdInput:input,resetSeerPetInfo:() => {},seerLookupMessage:status,seerLookupPreview:preview,getTaiwanProgressSettings:settings,fetchSeerJson:fetchCached,getPetSearchMethod:() => method,fetchSeerElementTypeCombinations:repository.fetchSeerElementTypeCombinations,convertToTraditionalChinese:traditional,renderSeerPetTypeOptions:types => {catalog = types; renderTypes();},fetchSeerPetCatalog:repository.fetchSeerPetCatalog,getPetTypeCategory:() => category,matchesTaiwanPetProgress:matches,renderSeerPetSearchResults:render,loadSeerPetSearchTypeDetails:typeDetails,getLookupRequestId:() => version,getLookupMode:() => "pet",getSkinSearchMode:() => "skin",getSelectedPetTypeId:() => typeId,getTaiwanOnlyEnabled:() => progress.checked});

    // Reuse the atlas type-picker markup, with separate IDs and selection state.
    const typeDialog = document.createElement("dialog"); typeDialog.className = "training-mint-dialog training-type-dialog seer-pet-type-dialog type-related-picker";
    const atlas = document.querySelector("#seer-pet-type-modal .seer-pet-type-dialog");
    typeDialog.innerHTML = atlas.innerHTML.replace(/(id|for|aria-labelledby)="([^"]+)"/g,(_,attribute,value) => `${attribute}="${value.replaceAll("seer-pet-type-","training-pet-type-")}"`);
    dialog.append(typeDialog);
    typeDialog.setAttribute("aria-labelledby","training-pet-type-modal-title");
    const typeSearch = typeDialog.querySelector("#training-pet-type-search"), bases = typeDialog.querySelector("#training-pet-type-bases"), options = typeDialog.querySelector("#training-pet-type-options");
    function typeButton(type, action) {
        const button = document.createElement("button"); button.type = "button"; button.className = "seer-pet-type-option";
        const icon = document.createElement("img"); icon.src = typeIconUrl(type.id); icon.alt = ""; icon.loading = "lazy";
        const label = document.createElement("span"); label.textContent = traditional(type.name); button.append(icon,label); button.addEventListener("click",action); return button;
    }
    function renderTypes() {
        const types = catalog.map(type => ({...type,name:traditional(type.name),types:SEER_TYPE_DATA.combinations.find(local => local.id === type.id)?.types || [traditional(type.name)]}));
        bases.replaceChildren(); options.replaceChildren();
        for (const type of types.filter(type => !type.isDouble)) {
            const button = typeButton(type,() => {baseType = type.name; typeSearch.value = ""; renderTypes();});
            const label = document.createElement("span"); label.className = "type-vs-inline-type"; label.append(...button.childNodes); button.append(label);
            button.classList.toggle("is-active",baseType === type.name); bases.append(button);
        }
        for (const type of getRelatedTypeOptions(baseType,traditional(typeSearch.value),types)) {
            const button = typeButton(type,() => {typeId = type.id; category = type.isDouble ? "double" : "single"; updateTypeTrigger(); typeDialog.close(); refresh();});
            button.classList.toggle("is-active",typeId === type.id); options.append(button);
        }
        typeDialog.querySelector("#training-pet-type-options-title").textContent = typeSearch.value ? "搜尋結果" : baseType ? `${baseType}系相關屬性` : "請選擇單屬性";
    }
    const openTypePicker = () => {typeDialog.showModal(); typeSearch.focus();};
    const typeTrigger = query(".seer-pet-type-trigger-card");
    typeTrigger.addEventListener("click",openTypePicker);
    typeTrigger.addEventListener("keydown",event => {if (event.target === typeTrigger && ["Enter"," "].includes(event.key)) {event.preventDefault(); openTypePicker();}});
    typeDialog.querySelector("#training-pet-type-close").addEventListener("click",() => typeDialog.close());
    typeDialog.addEventListener("close",() => {if (dialog.open) query("[data-type-open]").focus();});
    typeSearch.addEventListener("input",renderTypes);
    for (const button of typeDialog.querySelectorAll("[data-pet-type-category]")) button.addEventListener("click",() => {typeId = null; category = button.dataset.petTypeCategory; updateTypeTrigger(); typeDialog.close(); refresh();});
    async function refresh() {
        clearTimeout(timer); browse.resetBrowseState(); browse.clearSeerBrowseSentinel(); const request = ++version;
        if (method === "type") return browse.startSeerPetTypeFilter(request);
        if (!input.value.trim()) return browse.startLatestSeerBrowse(request);
        results.replaceChildren(); status.textContent = "搜尋中…";
        try {
            const data = await searchTrainingPets(input.value,{fetchCached,simplified}), value = await settings();
            if (request !== version || !dialog.open) return;
            const pets = data.records.filter(pet => matches(pet,value)), types = await typeDetails(pets);
            if (request !== version || !dialog.open) return;
            render(pets,types);
            status.textContent = pets.length ? `找到 ${pets.length} 隻精靈，點擊開始培養。${data.count > 100 ? "請輸入更完整名稱縮小結果。" : ""}` : "找不到符合條件的精靈。";
        } catch(error) {if (request === version) status.textContent = /404/.test(error.message) ? "找不到此編號的精靈。" : `搜尋失敗：${error.message}`;}
    }
    for (const button of host.querySelectorAll("[data-method]")) button.addEventListener("click",() => {
        method = button.dataset.method; input.value = "";
        host.querySelector("form").hidden = method !== "query"; query("[data-type-filter]").hidden = method !== "type";
        for (const tab of host.querySelectorAll("[data-method]")) {tab.classList.toggle("is-active",tab === button); tab.setAttribute("aria-selected",String(tab === button));}
        refresh();
    });
    progress.addEventListener("change",refresh);
    input.addEventListener("input",() => {version++; clearTimeout(timer); if (!composing) timer = setTimeout(refresh,400);});
    input.addEventListener("compositionstart",() => {composing = true; version++; clearTimeout(timer);});
    input.addEventListener("compositionend",() => {composing = false; input.dispatchEvent(new Event("input"));});
    host.querySelector("form").addEventListener("submit",event => {event.preventDefault(); if (!composing) refresh();});
    dialog.addEventListener("close",() => {version++; clearTimeout(timer); browse.resetBrowseState(); browse.clearSeerBrowseSentinel(); if (typeDialog.open) typeDialog.close();});
    return {open:refresh};
}
