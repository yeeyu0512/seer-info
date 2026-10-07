import { typeIconUrl, skinCategoryIconUrl } from "./shared/assets.js";
import { getSeerServerSettings } from "./seer-server-settings.js";
import { SEER_TYPE_DATA } from "./seer-type-data.js";
import { getRelatedTypeOptions } from "./shared/type-options.js";
import { createLookupRepository } from "./lookup/repository.js";
import { createPetInfoView } from "./lookup/pet-info-view.js";
import { createSoulmarkImageResolver } from "./lookup/wiki.js";

let lookupInstance;
export function initSeerLookup(dependencies) {
    if (lookupInstance) return lookupInstance;

    const openTypeLookup = dependencies.openTypeLookup || null;

    const seerLookupForm = document.getElementById("seer-lookup-form");
    const seerLookupIdInput = document.getElementById("seer-lookup-id");
    const seerTaiwanProgressOnly = document.getElementById("seer-taiwan-progress-only");
    const seerLookupTitle = document.getElementById("seer-lookup-title");
    const seerLookupDescription = document.getElementById("seer-lookup-description");
    const seerLookupInputLabel = document.getElementById("seer-lookup-input-label");
    const seerSkinSearchTabs = document.getElementById("seer-skin-search-tabs");
    const seerSkinSearchModeTabs = Array.from(document.querySelectorAll(".seer-skin-search-tab"));
    const seerSkinCategoryFilter = document.getElementById("seer-skin-category-filter");
    const seerSkinCategoryOptions = document.getElementById("seer-skin-category-options");
    const seerPetSearchMethodTabs = document.getElementById("seer-pet-search-method-tabs");
    const seerPetSearchMethodButtons = Array.from(document.querySelectorAll("[data-pet-search-method]"));
    const seerPetTypeFilter = document.getElementById("seer-pet-type-filter");
    const seerPetTypeCategoryButtons = Array.from(document.querySelectorAll("[data-pet-type-category]"));
    const seerPetTypeOptions = document.getElementById("seer-pet-type-options");
    const seerPetTypeBases = document.getElementById("seer-pet-type-bases");
    const seerPetTypeSearch = document.getElementById("seer-pet-type-search");
    const seerPetTypeOptionsTitle = document.getElementById("seer-pet-type-options-title");
    let seerPetPickerBase = null;
    let seerPetPickerQuery = "";
    const seerPetTypeModal = document.getElementById("seer-pet-type-modal");
    const seerPetTypeClose = document.getElementById("seer-pet-type-close");
    const seerPetTypeOpenModalButton = document.getElementById("seer-pet-type-open-modal");
    const seerPetTypeTriggerCard = document.querySelector(".seer-pet-type-trigger-card");
    const seerPetTypeCurrentIcon = document.getElementById("seer-pet-type-current-icon");
    const seerPetTypeCurrentName = document.getElementById("seer-pet-type-current-name");
    const seerLookupMessage = document.getElementById("seer-lookup-message");
    const seerLookupResults = document.getElementById("seer-lookup-results");
    const seerLookupPreview = document.getElementById("seer-lookup-preview");
    const seerLookupAvatar = document.getElementById("seer-lookup-avatar");
    const seerLookupName = document.getElementById("seer-lookup-name");
    const seerLookupIdResult = document.getElementById("seer-lookup-id-result");
    const seerLookupRelatedPet = document.getElementById("seer-lookup-related-pet");
    const seerLookupTypeIcon = document.getElementById("seer-lookup-type-icon");
    const seerLookupTypeName = document.getElementById("seer-lookup-type-name");
    const seerLookupSkinCategoryIcon = document.getElementById("seer-lookup-skin-category-icon");
    const seerLookupIllustrationImage = document.getElementById("seer-lookup-illustration-image");
    const seerLookupIllustrationCategoryIcon = document.getElementById("seer-lookup-illustration-category-icon");
    const seerLookupIllustrationTitle = document.getElementById("seer-lookup-illustration-title");
    const seerLookupIllustrationDescription = document.getElementById("seer-lookup-illustration-description");
    const seerLookupMoreInfoButton = document.getElementById("seer-lookup-more-info");
    const seerLookupSkinMoreInfoButton = document.getElementById("seer-lookup-skin-more-info");
    const seerLookupPetSkinsButton = document.getElementById("seer-lookup-pet-skins");
    const seerPetInfoToggle = document.getElementById("seer-pet-info-toggle");
    const seerPetInfoPanel = document.getElementById("seer-pet-info");
    const seerPetInfoModal = document.getElementById("seer-pet-info-modal");
    const seerPetInfoTitle = document.getElementById("seer-pet-info-title");
    const seerPetInfoAvatar = document.getElementById("seer-pet-info-avatar");
    const seerPetInfoMeta = document.getElementById("seer-pet-info-meta");
    const seerPetInfoSkinsButton = document.getElementById("seer-pet-info-skins");
    const seerPetInfoClose = document.getElementById("seer-pet-info-close");
    const seerPetInfoRetry = document.getElementById("seer-pet-info-retry");
    const seerRelatedSkinsModal = document.getElementById("seer-related-skins-modal");
    const seerRelatedSkinsClose = document.getElementById("seer-related-skins-close");
    const seerRelatedSkinsMessage = document.getElementById("seer-related-skins-message");
    const seerRelatedSkinsResults = document.getElementById("seer-related-skins-results");
    const seerExternalLinkModal = document.getElementById("seer-external-link-modal");
    const seerExternalLinkCancel = document.getElementById("seer-external-link-cancel");
    const seerExternalLinkOpen = document.getElementById("seer-external-link-open");

    let seerLookupDebounceTimer = null;
    let seerLookupRequestId = 0;
    let seerBrowseState = null;
    let seerBrowseSentinel = null;
    let isSeerLookupComposing = false;
    let seerLookupMode = "pet";
    let seerSkinSearchMode = "skin";
    let seerPetSearchMethod = "query";
    let seerPetTypeCategory = "single";
    let selectedSeerPetTypeId = null;
    let selectedSeerSkinCategoryId = null;
    let seerTaiwanOnlyEnabled = false;
    let seerTaiwanSettingsPromise = null;
    let currentSeerPetId = null;
    let currentSeerPetData = null;
    let seerPetInfoRequestId = 0;
    let seerPetInfoOpener = null;
    let seerPetInfoPointerStartedOnBackdrop = false;
    let seerRelatedSkinsRequestId = 0;
    let seerRelatedSkinsOpener = null;
    let seerRelatedSkinsPointerStartedOnBackdrop = false;
    let currentSeerInfoUrl = null;
    let currentSeerSkinImageFallback = null;
    let externalLinkOpener = null;
    let externalLinkPointerStartedOnBackdrop = false;
    let seerPetTypeModalOpener = null;
    let seerPetTypePointerStartedOnBackdrop = false;
    const seerSkinThumbnailFallbackCache = new Map();
    let seerSkinCategoriesPromise = null;
    let seerPetTypeFilterState = null;
    const SEER_BROWSE_PAGE_SIZE = 20;

    const seerBrowseObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && seerBrowseState) {
                void loadMoreSeerBrowseResults(seerBrowseState.requestId);
            }
        });
    }, { root: seerLookupResults, rootMargin: "100px" });

    const { activateTab, convertToTraditionalChinese, convertToSimplifiedChinese, fetchSeerJson } = dependencies;

    const { fetchSeerElementTypeCombinations, fetchSeerPetCatalog, fetchSeerSkinCatalog, fetchSeerPetDetails, fetchSeerPetsByName, fetchSeerElementTypeDetails, fetchSeerPetInfo, fetchSeerPetRelatedRecords, getElementTypeCombinations, getCachedElementTypeDetails } = createLookupRepository(dependencies);
    const resolveSeerWikiSoulmarkImage = createSoulmarkImageResolver(fetchSeerJson);
    const { renderSeerPetInfo, renderSeerPetInfoIdentity } = createPetInfoView({ seerPetInfoPanel, seerPetInfoTitle, seerPetInfoAvatar, seerPetInfoMeta, convertToTraditionalChinese, openTypeLookup, closeSeerPetInfoModal, resolveSeerWikiSoulmarkImage });

    function setSeerLookupMode(mode) {
        if (mode !== "pet" && mode !== "skin") return;
        if (seerLookupMode === mode) return;
        seerLookupMode = mode;
        seerPetSearchMethod = "query";
        seerLookupIdInput.value = "";
        invalidateSeerPetLookup();
        updateSeerPetSearchMethodUi();
        const isSkinMode = mode === "skin";
        seerSkinSearchTabs.hidden = !isSkinMode;
        seerSkinCategoryFilter.hidden = !isSkinMode || seerSkinSearchMode !== "skin";
        if (isSkinMode) {
            updateSeerSkinSearchModeUi();
            void loadSeerSkinCategoryOptions();
        } else {
            seerSkinSearchMode = "skin";
            seerLookupInputLabel.hidden = false;
            seerLookupIdInput.hidden = false;
            seerLookupIdInput.required = true;
            seerSkinCategoryFilter.hidden = true;
        }
        seerLookupTitle.textContent = isSkinMode ? "皮膚圖鑑" : "精靈圖鑑";
        if (!isSkinMode) {
            seerLookupDescription.textContent = "輸入精靈 ID 或中文名稱，即可瀏覽相關結果。";
            seerLookupInputLabel.textContent = "精靈 ID／名稱";
            seerLookupIdInput.placeholder = "例如：5000 或 聖靈譜尼";
        }
        seerLookupResults.setAttribute("aria-label", isSkinMode ? "皮膚搜尋結果" : "精靈搜尋結果");
        seerLookupIllustrationTitle.textContent = isSkinMode ? "皮膚立繪預覽" : "立繪預覽";
        seerLookupIllustrationDescription.textContent = isSkinMode
            ? "先搜尋並選擇皮膚，即可在此查看立繪。"
            : "先搜尋並選擇精靈，即可在此查看立繪。";
    }

    function updateSeerPetSearchMethodUi() {
        const isPetTypeFilter = seerLookupMode === "pet" && seerPetSearchMethod === "type";
        seerPetSearchMethodTabs.hidden = seerLookupMode !== "pet";
        seerLookupForm.hidden = isPetTypeFilter;
        seerPetTypeFilter.hidden = !isPetTypeFilter;
        if (seerLookupMode === "pet") {
            seerLookupDescription.textContent = isPetTypeFilter
                ? "依屬性分類篩選精靈。"
                : "輸入精靈 ID 或中文名稱，即可瀏覽相關結果。";
        }
        updateSeerPetTypeCurrentDisplay();
        seerPetSearchMethodButtons.forEach((button) => {
            const isActive = button.dataset.petSearchMethod === seerPetSearchMethod;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
        });
        seerPetTypeCategoryButtons.forEach((button) => {
            const isActive = selectedSeerPetTypeId === null && button.dataset.petTypeCategory === seerPetTypeCategory;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function setSeerPetSearchMethod(method) {
        if (!["query", "type"].includes(method) || seerPetSearchMethod === method) return;
        seerPetSearchMethod = method;
        seerLookupIdInput.value = "";
        invalidateSeerPetLookup();
        updateSeerPetSearchMethodUi();
        if (method === "type") {
            void startSeerPetTypeFilter(++seerLookupRequestId);
        } else {
            void startLatestSeerBrowse(++seerLookupRequestId);
        }
    }

    function setSeerPetTypeCategory(category) {
        if (!["single", "double"].includes(category) || (seerPetTypeCategory === category && selectedSeerPetTypeId === null)) return;
        seerPetTypeCategory = category;
        selectedSeerPetTypeId = null;
        updateSeerPetSearchMethodUi();
        renderSeerPetTypeOptions();
        updateSeerPetTypeCurrentDisplay();
        if (seerPetSearchMethod === "type") {
            void startSeerPetTypeFilter(++seerLookupRequestId);
        }
    }

    function setSeerSkinSearchMode(mode) {
        if (!["skin", "pet", "category"].includes(mode) || seerSkinSearchMode === mode) return;
        seerSkinSearchMode = mode;
        seerLookupIdInput.value = "";
        invalidateSeerPetLookup();
        updateSeerSkinSearchModeUi();
    }

    function updateSeerSkinSearchModeUi() {
        const isPetMode = seerSkinSearchMode === "pet";
        const isCategoryMode = seerSkinSearchMode === "category";
        seerSkinSearchModeTabs.forEach((tab) => {
            const isActive = tab.dataset.skinSearchMode === seerSkinSearchMode;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", String(isActive));
        });
        if (seerLookupMode !== "skin") return;
        seerLookupInputLabel.hidden = isCategoryMode;
        seerLookupIdInput.hidden = isCategoryMode;
        seerLookupIdInput.required = !isCategoryMode;
        seerSkinCategoryFilter.hidden = !isCategoryMode;
        seerLookupInputLabel.textContent = isPetMode ? "綁定精靈 ID／名稱" : "皮膚 ID／名稱";
        seerLookupIdInput.placeholder = isPetMode ? "例如：3506 或 波塞冬" : "例如：241 或 火焰萌王";
        seerLookupDescription.textContent = isPetMode
            ? "輸入綁定精靈 ID 或名稱，即可瀏覽遊戲中綁定該精靈的皮膚。"
            : isCategoryMode
                ? "選擇皮膚種類圖示，即可瀏覽該種類的皮膚。"
                : "輸入皮膚 ID 或名稱，即可瀏覽相關結果。";
    }

    async function loadSeerSkinCategoryOptions() {
        if (!seerSkinCategoriesPromise) {
            seerSkinCategoriesPromise = fetchSeerJson(
                "https://api.seerapi.com/v1/pet_skin_category?offset=0&limit=100"
            ).then((page) => {
                if (!Array.isArray(page.results)) throw new Error("SeerAPI 回傳的皮膚種類格式無效。");
                return [...new Set(page.results
                    .map((category) => Number(category && category.id))
                    .filter((id) => Number.isSafeInteger(id) && id >= 0))]
                    .sort((first, second) => first - second);
            }).catch((error) => {
                seerSkinCategoriesPromise = null;
                throw error;
            });
        }

        try {
            const categoryIds = await seerSkinCategoriesPromise;
            renderSeerSkinCategoryOptions(categoryIds);
        } catch (error) {
            console.error("Load Seer skin categories error:", error);
            seerLookupMessage.textContent = `載入皮膚種類失敗：${error.message}`;
        }
    }

    function renderSeerSkinCategoryOptions(categoryIds) {
        seerSkinCategoryOptions.replaceChildren();
        const options = [{ id: "all", label: "全部" }, ...categoryIds.map((id) => ({
            id: String(id),
            label: `種類 ${id}`
        }))];
        options.forEach((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "seer-skin-category-option";
            button.dataset.skinCategoryId = option.id;
            button.setAttribute("aria-label", option.label);
            button.setAttribute("aria-pressed", String(option.id === (selectedSeerSkinCategoryId === null ? "all" : String(selectedSeerSkinCategoryId))));
            button.title = option.label;
            if (option.id === "all") {
                button.textContent = option.label;
            } else {
                const icon = document.createElement("img");
                icon.src = skinCategoryIconUrl(option.id);
                icon.alt = "";
                icon.loading = "lazy";
                icon.addEventListener("error", () => {
                    icon.hidden = true;
                    button.textContent = option.label;
                }, { once: true });
                button.append(icon);
            }
            const selected = option.id === (selectedSeerSkinCategoryId === null ? "all" : String(selectedSeerSkinCategoryId));
            button.classList.toggle("is-active", selected);
            seerSkinCategoryOptions.append(button);
        });
    }

    function scheduleSeerPetLookup() {
        const query = seerLookupIdInput.value.trim();
        invalidateSeerPetLookup();
        if (!query) {
            void startLatestSeerBrowse(seerLookupRequestId);
            return;
        }
        seerLookupMessage.textContent = "輸入完成後自動搜尋…";
        seerLookupDebounceTimer = window.setTimeout(() => {
            seerLookupDebounceTimer = null;
            startSeerPetLookup(query);
        }, 400);
    }

    async function getTaiwanProgressSettings() {
        if (!seerTaiwanOnlyEnabled) return null;
        if (!seerTaiwanSettingsPromise) {
            seerTaiwanSettingsPromise = getSeerServerSettings().then((settings) => {
                if (
                    !Number.isSafeInteger(settings.latestPetId) || settings.latestPetId < 1
                    || !Number.isSafeInteger(settings.latestSkinId) || settings.latestSkinId < 1
                ) {
                    throw new Error("管理後台尚未設定台服最新精靈與皮膚編號。");
                }
                return settings;
            }).catch((error) => {
                seerTaiwanSettingsPromise = null;
                throw error;
            });
        }
        return seerTaiwanSettingsPromise;
    }

    function matchesTaiwanPetProgress(pet, settings) {
        if (!settings) return true;
        const petId = Number(pet && pet.id);
        return petId === 5000 || (Number.isSafeInteger(petId) && petId > 0 && petId <= settings.latestPetId);
    }

    function matchesTaiwanSkinProgress(skin, pet, settings) {
        if (!settings) return true;
        const skinId = Number(skin && skin.id);
        return Number.isSafeInteger(skinId)
            && skinId > 0
            && skinId <= settings.latestSkinId
            && matchesTaiwanPetProgress(pet || (skin && skin.pet), settings);
    }

    function refreshCurrentSeerLookup() {
        if (seerLookupMode === "pet" && seerPetSearchMethod === "type") {
            void startSeerPetTypeFilter(++seerLookupRequestId);
            return;
        }
        if (seerSkinSearchMode === "category" || !seerLookupIdInput.value.trim()) {
            void startLatestSeerBrowse(++seerLookupRequestId);
            return;
        }
        startSeerPetLookup(seerLookupIdInput.value.trim());
    }

    function invalidateSeerPetLookup() {
        if (seerLookupDebounceTimer !== null) {
            window.clearTimeout(seerLookupDebounceTimer);
            seerLookupDebounceTimer = null;
        }
        seerLookupRequestId += 1;
        seerBrowseState = null;
        seerPetTypeFilterState = null;
        clearSeerBrowseSentinel();
        clearSeerLookupResult();
    }

    function startSeerPetLookup(query, openInfoWhenLoaded = false, infoModalOpener = null) {
        if (!query) {
            scheduleSeerPetLookup();
            return;
        }
        if (seerLookupDebounceTimer !== null) {
            window.clearTimeout(seerLookupDebounceTimer);
            seerLookupDebounceTimer = null;
        }
        seerBrowseState = null;
        seerPetTypeFilterState = null;
        clearSeerBrowseSentinel();
        resetSeerPetInfo();
        const requestId = ++seerLookupRequestId;
        void lookupSeerPet(query, requestId).then(() => {
            if (openInfoWhenLoaded && requestId === seerLookupRequestId && currentSeerPetData) {
                openSeerPetInfoModal(infoModalOpener);
            }
        });
    }

    async function startLatestSeerBrowse(requestId) {
        if (requestId !== seerLookupRequestId || seerLookupIdInput.value.trim()) return;
        resetSeerPetInfo();
        const isSkinResource = seerLookupMode === "skin" && ["skin", "category"].includes(seerSkinSearchMode);
        const resource = isSkinResource ? "pet_skin" : "pet";
        if (seerLookupMode === "skin" && seerSkinSearchMode === "pet") {
            seerBrowseState = null;
            clearSeerBrowseSentinel();
            seerLookupMessage.textContent = "輸入精靈 ID 或名稱以查詢綁定皮膚。";
            seerLookupResults.replaceChildren();
            seerLookupResults.hidden = true;
            return;
        }

        seerBrowseState = {
            requestId,
            resource,
            nextOffset: 0,
            hasMore: false,
            loading: true,
            seenIds: new Set(),
            browseStartOffset: 0,
            taiwanSettings: null,
            categoryId: isSkinResource && seerSkinSearchMode === "category"
                ? selectedSeerSkinCategoryId
                : null
        };
        seerLookupPreview.hidden = true;
        seerLookupResults.replaceChildren();
        seerLookupResults.scrollTop = 0;
        seerLookupResults.hidden = false;
        seerLookupMessage.textContent = "正在載入最新編號資料…";
        try {
            const state = seerBrowseState;
            state.taiwanSettings = await getTaiwanProgressSettings();
            if (requestId !== seerLookupRequestId) return;
            const firstPage = await fetchSeerJson(
                `https://api.seerapi.com/v1/${resource}?offset=0&limit=1&expand=true`
            );
            if (requestId !== seerLookupRequestId || !Array.isArray(firstPage.results)) return;
            const count = Number(firstPage.count);
            if (!Number.isSafeInteger(count) || count < 0) throw new Error("SeerAPI 回傳的資料筆數無效。");
            if (count === 0) {
                seerBrowseState = null;
                seerLookupResults.hidden = true;
                seerLookupMessage.textContent = "目前沒有可顯示的資料。";
                return;
            }
            const offset = Math.max(0, count - SEER_BROWSE_PAGE_SIZE);
            state.browseStartOffset = offset;
            await loadSeerBrowsePage(state, offset);
            if (requestId !== seerLookupRequestId) return;
            const loadedCount = state.seenIds.size;
            seerLookupMessage.textContent = `顯示最新 ${loadedCount} 筆${state.hasMore ? "；繼續向下捲動載入更早編號" : ""}。`;
        } catch (error) {
            if (requestId !== seerLookupRequestId) return;
            console.error("Load latest Seer browse results error:", error);
            seerBrowseState = null;
            seerLookupResults.hidden = true;
            seerLookupMessage.textContent = `載入最新資料失敗：${error.message}`;
        }
    }

    async function startSeerPetTypeFilter(requestId) {
        if (requestId !== seerLookupRequestId || seerLookupMode !== "pet" || seerPetSearchMethod !== "type") return;
        resetSeerPetInfo();
        seerBrowseState = null;
        clearSeerBrowseSentinel();
        seerLookupPreview.hidden = true;
        seerLookupResults.replaceChildren();
        seerLookupResults.scrollTop = 0;
        seerLookupResults.hidden = false;
        seerLookupMessage.textContent = "正在載入屬性資料…";
        const state = { requestId, pets: [], nextIndex: 0, loading: true, typeDetailsById: new Map() };
        seerPetTypeFilterState = state;

        try {
            const combinations = await fetchSeerElementTypeCombinations();
            if (requestId !== seerLookupRequestId) return;
            combinations.forEach((combination) => {
                state.typeDetailsById.set(String(combination.id), {
                    id: combination.id,
                    name: convertToTraditionalChinese(combination.name)
                });
            });
            renderSeerPetTypeOptions(combinations);

            const settings = await getTaiwanProgressSettings();
            if (requestId !== seerLookupRequestId) return;
            const catalog = await fetchSeerPetCatalog((loaded, total) => {
                if (requestId === seerLookupRequestId) {
                    seerLookupMessage.textContent = `正在載入精靈資料… ${loaded}／${total}`;
                }
            });
            if (requestId !== seerLookupRequestId) return;

            const matchingTypeIds = new Set(combinations
                .filter((combination) => combination.isDouble === (seerPetTypeCategory === "double"))
                .filter((combination) => selectedSeerPetTypeId === null || combination.id === selectedSeerPetTypeId)
                .map((combination) => String(combination.id)));
            state.pets = catalog.filter((pet) =>
                pet.typeId !== null
                && matchingTypeIds.has(String(pet.typeId))
                && matchesTaiwanPetProgress(pet, settings)
            );
            state.loading = false;
            if (state.pets.length === 0) {
                seerLookupResults.hidden = true;
                seerLookupMessage.textContent = seerTaiwanOnlyEnabled
                    ? "目前篩選條件沒有符合台服進度的精靈。"
                    : "目前沒有符合篩選條件的精靈。";
                return;
            }
            loadMoreSeerPetTypeFilterResults(state);
            const selectedType = selectedSeerPetTypeId === null
                ? ""
                : `「${state.typeDetailsById.get(String(selectedSeerPetTypeId))?.name || "所選屬性"}」`;
            seerLookupMessage.textContent = `找到 ${state.pets.length} 隻${selectedType}精靈，已顯示 ${Math.min(state.pets.length, SEER_BROWSE_PAGE_SIZE)} 隻。`;
        } catch (error) {
            if (requestId !== seerLookupRequestId) return;
            console.error("Load Seer pets by type error:", error);
            seerPetTypeFilterState = null;
            seerLookupResults.hidden = true;
            seerLookupMessage.textContent = `載入屬性篩選失敗：${error.message}`;
        }
    }

    function loadMoreSeerPetTypeFilterResults(state) {
        if (
            state !== seerPetTypeFilterState
            || state.requestId !== seerLookupRequestId
            || state.loading
            || state.nextIndex >= state.pets.length
        ) return;
        const nextPets = state.pets.slice(state.nextIndex, state.nextIndex + SEER_BROWSE_PAGE_SIZE);
        state.nextIndex += nextPets.length;
        renderSeerPetSearchResults(nextPets, state.typeDetailsById, state.nextIndex > nextPets.length);
        clearSeerBrowseSentinel();
        if (state.nextIndex < state.pets.length) {
            const sentinel = document.createElement("button");
            sentinel.type = "button";
            sentinel.className = "seer-lookup-browse-sentinel";
            sentinel.textContent = `點擊載入更多精靈（${state.nextIndex}／${state.pets.length}）`;
            sentinel.addEventListener("click", () => loadMoreSeerPetTypeFilterResults(state));
            seerBrowseSentinel = sentinel;
            seerLookupResults.append(sentinel);
        }
    }

    function renderSeerPetTypeOptions(combinations = null) {
        const availableCombinations = combinations || getElementTypeCombinations();
        const catalog = availableCombinations.map(type => ({
            ...type,
            name: convertToTraditionalChinese(type.name),
            types: SEER_TYPE_DATA.combinations.find(local => local.id === type.id)?.types
                || [convertToTraditionalChinese(type.name)],
        }));
        if (!seerPetTypeBases.children.length && catalog.length) {
            for (const type of catalog.filter(type => !type.isDouble)) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "seer-pet-type-option";
                button.dataset.baseType = type.name;
                const label = document.createElement("span");
                label.className = "type-vs-inline-type";
                const icon = document.createElement("img");
                icon.src = typeIconUrl(type.id);
                icon.alt = "";
                label.append(icon, type.name);
                button.append(label);
                button.addEventListener("click", () => {
                    seerPetPickerBase = type.name;
                    seerPetPickerQuery = "";
                    seerPetTypeSearch.value = "";
                    renderSeerPetTypeOptions();
                    seerPetTypeOptions.scrollTop = 0;
                });
                seerPetTypeBases.append(button);
            }
        }
        const filteredCombinations = getRelatedTypeOptions(seerPetPickerBase, seerPetPickerQuery, catalog);
        seerPetTypeOptions.replaceChildren();
        for (const button of seerPetTypeBases.querySelectorAll("[data-base-type]")) {
            const active = button.dataset.baseType === seerPetPickerBase && !seerPetPickerQuery.trim();
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        }
        seerPetTypeOptionsTitle.textContent = seerPetPickerQuery.trim() ? `搜尋結果（${filteredCombinations.length}）`
            : seerPetPickerBase ? `${seerPetPickerBase}系相關屬性（${filteredCombinations.length}）` : "相關屬性";
        seerPetTypeOptions.classList.toggle("is-empty", !filteredCombinations.length);
        if (!filteredCombinations.length) {
            const hint = document.createElement("p");
            hint.className = "type-calc-picker-hint";
            hint.textContent = seerPetPickerQuery.trim() ? "找不到符合的屬性" : "選擇一個單屬性";
            const detail = document.createElement("span");
            detail.textContent = seerPetPickerQuery.trim() ? "試試其他名稱或縮短關鍵字" : "相關雙屬性會顯示在這裡";
            hint.append(detail);
            seerPetTypeOptions.append(hint);
        }
        const options = filteredCombinations;
        options.forEach((combination) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "seer-pet-type-option";
            const isSelected = combination.id === selectedSeerPetTypeId;
            button.classList.toggle("is-active", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
            button.dataset.petTypeId = combination.id === null ? "all" : String(combination.id);
            if (combination.id !== null) {
                const icon = document.createElement("img");
                icon.src = typeIconUrl(combination.id);
                icon.alt = "";
                icon.loading = "lazy";
                icon.addEventListener("error", () => { icon.hidden = true; }, { once: true });
                button.append(icon);
            }
            const label = document.createElement("span");
            label.textContent = combination.name;
            button.append(label);
            seerPetTypeOptions.append(button);
        });
        updateSeerPetTypeCurrentDisplay();
    }







    async function loadMoreSeerBrowseResults(requestId) {
        const state = seerBrowseState;
        if (!state || state.requestId !== requestId || state.loading || !state.hasMore) return;
        state.loading = true;
        const offset = state.nextOffset;
        updateSeerBrowseLoadingProgress(state, offset);
        try {
            await loadSeerBrowsePage(state, offset);
            if (seerBrowseState !== state || requestId !== seerLookupRequestId) return;
            seerLookupMessage.textContent = `已載入 ${state.seenIds.size} 筆${state.hasMore ? "；繼續向下捲動載入更早編號" : "，已到最早編號"}。`;
        } catch (error) {
            if (seerBrowseState !== state || requestId !== seerLookupRequestId) return;
            console.error("Load more Seer browse results error:", error);
            if (seerBrowseSentinel) {
                seerBrowseSentinel.textContent = "載入失敗，點此重試";
                seerBrowseSentinel.disabled = false;
            }
            seerLookupMessage.textContent = `載入更多資料失敗：${error.message}`;
        } finally {
            if (seerBrowseState === state) {
                state.loading = false;
                updateSeerBrowseSentinel(state);
            }
        }
    }

    function updateSeerBrowseLoadingProgress(state, offset) {
        if (!seerBrowseSentinel) return;
        const progress = state.browseStartOffset > 0
            ? Math.min(100, Math.max(1, Math.ceil(
                ((state.browseStartOffset - offset) / state.browseStartOffset) * 100
            )))
            : 100;
        const label = document.createElement("span");
        label.textContent = "正在載入更早編號";
        const progressBar = document.createElement("progress");
        progressBar.className = "seer-lookup-browse-progress";
        progressBar.max = 100;
        progressBar.value = progress;
        progressBar.setAttribute("aria-label", "已搜尋較早編號範圍");
        progressBar.setAttribute("aria-valuetext", `${progress}%`);
        const percentage = document.createElement("span");
        percentage.className = "seer-lookup-browse-progress-value";
        percentage.textContent = `${progress}%`;
        seerBrowseSentinel.classList.add("is-loading");
        seerBrowseSentinel.replaceChildren(label, progressBar, percentage);
        seerBrowseSentinel.disabled = true;
    }

    async function loadSeerBrowsePage(state, offset) {
        const page = await fetchSeerJson(
            `https://api.seerapi.com/v1/${state.resource}?offset=${offset}&limit=${SEER_BROWSE_PAGE_SIZE}&expand=true`
        );
        if (state.requestId !== seerLookupRequestId) return;
        if (!Array.isArray(page.results)) throw new Error("SeerAPI 回傳的分頁資料格式無效。");

        let orderedResults = page.results.slice().sort((first, second) => Number(second.id) - Number(first.id));
        if (state.resource === "pet_skin") {
            const matchingSkins = orderedResults.filter((skin) => matchesSelectedSkinCategory(skin, state.categoryId));
            const pending = matchingSkins.slice();
            const entries = [];
            const workers = Array.from({ length: Math.min(4, pending.length) }, async () => {
                while (pending.length > 0) {
                    const skin = pending.shift();
                    entries.push(await loadSeerSkinEntry(skin));
                }
            });
            await Promise.all(workers);
            if (state.requestId !== seerLookupRequestId) return;
            const uniqueEntries = entries
                .filter(({ skin, pet }) =>
                    !state.seenIds.has(String(skin.id))
                    && matchesTaiwanSkinProgress(skin, pet, state.taiwanSettings)
                )
                .sort((first, second) => Number(second.skin.id) - Number(first.skin.id));
            uniqueEntries.forEach(({ skin }) => state.seenIds.add(String(skin.id)));
            renderSeerSkinSearchResults(uniqueEntries, true);
        } else {
            orderedResults = orderedResults.filter((pet) =>
                !state.seenIds.has(String(pet.id))
                && matchesTaiwanPetProgress(pet, state.taiwanSettings)
            );
            orderedResults.forEach((pet) => state.seenIds.add(String(pet.id)));
            const typeDetailsById = await loadSeerPetSearchTypeDetails(orderedResults);
            if (state.requestId !== seerLookupRequestId) return;
            renderSeerPetSearchResults(orderedResults, typeDetailsById, true);
        }

        state.nextOffset = Math.max(0, offset - SEER_BROWSE_PAGE_SIZE);
        state.hasMore = offset > 0 && page.results.length > 0;
        state.loading = false;
        updateSeerBrowseSentinel(state);
    }

    function updateSeerBrowseSentinel(state) {
        clearSeerBrowseSentinel();
        if (!state.hasMore || state.requestId !== seerLookupRequestId) return;
        const sentinel = document.createElement("button");
        sentinel.type = "button";
        sentinel.className = "seer-lookup-browse-sentinel";
        sentinel.textContent = state.loading ? "正在載入更早編號…" : "向下捲動或點此載入更早編號";
        sentinel.disabled = state.loading;
        sentinel.classList.toggle("is-loading", state.loading);
        sentinel.addEventListener("click", () => void loadMoreSeerBrowseResults(state.requestId));
        seerBrowseSentinel = sentinel;
        seerLookupResults.append(sentinel);
        seerBrowseObserver.observe(sentinel);
    }

    function clearSeerBrowseSentinel() {
        if (!seerBrowseSentinel) return;
        seerBrowseObserver.unobserve(seerBrowseSentinel);
        seerBrowseSentinel.remove();
        seerBrowseSentinel = null;
    }

    async function lookupSeerPet(query, requestId) {
        if (requestId !== seerLookupRequestId) return;
        if (seerLookupMode === "skin") {
            await lookupSeerSkin(query, requestId);
            return;
        }
        seerLookupMessage.textContent = /^\d+$/.test(query)
            ? "正在查詢精靈資料…"
            : "正在搜尋精靈名稱…";
        seerLookupPreview.hidden = true;
        seerLookupResults.hidden = true;
        try {
            if (/^\d+$/.test(query)) {
                const petId = Number(query);
                if (!Number.isSafeInteger(petId) || petId < 1) {
                    throw new Error("請輸入有效的精靈 ID。");
                }
                const pet = await fetchSeerJson(`https://api.seerapi.com/v1/pet/${encodeURIComponent(query)}`);
                if (requestId !== seerLookupRequestId) return;
                const settings = await getTaiwanProgressSettings();
                if (requestId !== seerLookupRequestId) return;
                if (!matchesTaiwanPetProgress(pet, settings)) {
                    seerLookupMessage.textContent = "此精靈超出台服目前進度，已依篩選設定隱藏。";
                    return;
                }
                await renderSeerPetPreview(pet, requestId);
                if (requestId === seerLookupRequestId) seerLookupMessage.textContent = "";
            } else {
                await searchSeerPetsByName(query, requestId);
            }
        } catch (error) {
            if (requestId !== seerLookupRequestId) return;
            console.error("Seer pet lookup error:", error);
            seerLookupMessage.textContent = `查詢失敗：${error.message}`;
        }
    }

    function resetSeerPetInfo() {
        seerPetInfoRequestId += 1;
        currentSeerPetData = null;
        seerPetInfoTitle.textContent = "精靈資訊";
        seerPetInfoAvatar.hidden = true;
        seerPetInfoAvatar.removeAttribute("src");
        seerPetInfoMeta.replaceChildren();
        seerPetInfoPanel.replaceChildren();
        if (!seerPetInfoModal.hidden) closeSeerPetInfoModal();
        seerPetInfoToggle.hidden = true;
        seerPetInfoToggle.disabled = false;
        seerPetInfoToggle.textContent = "精靈資訊";
        seerPetInfoRetry.hidden = true;
    }

    async function lookupSeerSkin(query, requestId) {
        if (seerSkinSearchMode === "pet") {
            await searchSeerSkinsForPet(query, requestId);
            return;
        }
        seerLookupMessage.textContent = /^\d+$/.test(query)
            ? "正在查詢皮膚資料…"
            : "正在搜尋皮膚名稱…";
        seerLookupPreview.hidden = true;
        seerLookupResults.hidden = true;
        try {
            if (/^\d+$/.test(query)) {
                const skinId = Number(query);
                if (!Number.isSafeInteger(skinId) || skinId < 1) {
                    throw new Error("請輸入有效的皮膚 ID。");
                }
                const skin = await fetchSeerJson(`https://api.seerapi.com/v1/pet_skin/${encodeURIComponent(query)}`);
                const entry = await loadSeerSkinEntry(skin);
                if (requestId !== seerLookupRequestId) return;
                const settings = await getTaiwanProgressSettings();
                if (requestId !== seerLookupRequestId) return;
                if (!matchesTaiwanSkinProgress(entry.skin, entry.pet, settings)) {
                    seerLookupMessage.textContent = "此皮膚或所屬精靈超出台服目前進度，已依篩選設定隱藏。";
                    return;
                }
                await renderSeerSkinPreview(entry, requestId);
                if (requestId === seerLookupRequestId) seerLookupMessage.textContent = "";
            } else {
                await searchSeerSkinsByName(query, requestId);
            }
        } catch (error) {
            if (requestId !== seerLookupRequestId) return;
            console.error("Seer skin lookup error:", error);
            seerLookupMessage.textContent = `查詢失敗：${error.message}`;
        }
    }

    async function searchSeerSkinsForPet(query, requestId) {
        seerLookupPreview.hidden = true;
        seerLookupResults.hidden = true;
        if (!/^\d+$/.test(query)) {
            await searchSeerSkinsForPetName(query, requestId);
            return;
        }
        const petId = Number(query);
        if (!Number.isSafeInteger(petId) || petId < 1) {
            seerLookupMessage.textContent = "請輸入有效的綁定精靈 ID 或名稱。";
            return;
        }
        seerLookupMessage.textContent = "正在依綁定精靈搜尋皮膚…";
        try {
            const pet = await fetchSeerPetDetails(petId);
            if (requestId !== seerLookupRequestId) return;
            const settings = await getTaiwanProgressSettings();
            if (requestId !== seerLookupRequestId) return;
            if (!matchesTaiwanPetProgress(pet, settings)) {
                seerLookupMessage.textContent = "此精靈超出台服目前進度，已依篩選設定隱藏。";
                return;
            }
            const skins = await fetchSeerSkinCatalog();
            if (requestId !== seerLookupRequestId) return;
            const matchingSkins = skins.filter((skin) =>
                String(skin && skin.pet && skin.pet.id) === String(petId)
                    && matchesTaiwanSkinProgress(skin, pet, settings)
            );
            if (matchingSkins.length === 0) {
                seerLookupMessage.textContent = `找不到綁定精靈「${convertToTraditionalChinese(pet.name || `#${petId}`)}」的皮膚。`;
                return;
            }
            const entries = await Promise.all(matchingSkins.map((skin) => loadSeerSkinEntry(skin)));
            if (requestId !== seerLookupRequestId) return;
            renderSeerSkinSearchResults(entries);
            seerLookupResults.hidden = false;
            seerLookupMessage.textContent = `找到 ${entries.length} 款綁定精靈「${convertToTraditionalChinese(pet.name || `#${petId}`)}」的皮膚。`;
        } catch (error) {
            if (requestId !== seerLookupRequestId) return;
            console.error("Seer skins by pet lookup error:", error);
            seerLookupMessage.textContent = `查詢失敗：${error.message}`;
        }
    }

    async function searchSeerSkinsForPetName(query, requestId) {
        seerLookupMessage.textContent = "正在搜尋綁定精靈名稱…";
        try {
            const { pets, responses } = await fetchSeerPetsByName(query);
            if (requestId !== seerLookupRequestId) return;
            const settings = await getTaiwanProgressSettings();
            if (requestId !== seerLookupRequestId) return;
            const visiblePets = pets.filter((pet) => matchesTaiwanPetProgress(pet, settings));
            if (visiblePets.length === 0) {
                seerLookupMessage.textContent = seerTaiwanOnlyEnabled && pets.length > 0
                    ? "符合名稱的精靈皆超出台服目前進度。"
                    : "找不到符合的精靈，請確認名稱或改用精靈 ID。";
                return;
            }
            const skins = await fetchSeerSkinCatalog();
            if (requestId !== seerLookupRequestId) return;
            const petsById = new Map(visiblePets.map((pet) => [String(pet.id), pet]));
            const matchingSkins = skins.filter((skin) =>
                petsById.has(String(skin && skin.pet && skin.pet.id))
                    && matchesTaiwanSkinProgress(skin, petsById.get(String(skin.pet.id)), settings)
            );
            if (matchingSkins.length === 0) {
                seerLookupMessage.textContent = `找到 ${visiblePets.length} 隻精靈，但沒有找到台服進度內的綁定皮膚。`;
                return;
            }
            const entries = matchingSkins.map((skin) => ({
                skin,
                pet: petsById.get(String(skin.pet.id))
            }));
            renderSeerSkinSearchResults(entries);
            seerLookupResults.hidden = false;
            const hasMorePets = responses.some((response) =>
                Number(response.count) > (Array.isArray(response.results) ? response.results.length : 0)
            );
            const petNames = [...new Set(entries.map((entry) =>
                convertToTraditionalChinese(entry.pet.name || "未命名精靈")
            ))];
            const matchMessage = `找到 ${entries.length} 款綁定精靈「${petNames.join("、")}」的皮膚。`;
            seerLookupMessage.textContent = hasMorePets
                ? `${matchMessage} 精靈搜尋結果較多，請輸入更完整的名稱。`
                : matchMessage;
        } catch (error) {
            if (requestId !== seerLookupRequestId) return;
            console.error("Seer skins by pet name lookup error:", error);
            seerLookupMessage.textContent = `查詢失敗：${error.message}`;
        }
    }



    async function searchSeerSkinsByName(query, requestId) {
        const searchTerms = [...new Set([query, convertToSimplifiedChinese(query)].filter(Boolean))];
        const responses = await Promise.all(searchTerms.map((term) => {
            const params = new URLSearchParams({ name: term, offset: "0", limit: "10", expand: "true" });
            return fetchSeerJson(`https://api.seerapi.com/v1/pet_skin?${params}`);
        }));
        if (requestId !== seerLookupRequestId) return;
        const skinsById = new Map();
        responses.forEach((response) => {
            (response.results || []).forEach((skin) => {
                if (skin && skin.id !== undefined && !skinsById.has(String(skin.id))) {
                    skinsById.set(String(skin.id), skin);
                }
            });
        });

        const skins = Array.from(skinsById.values());
        if (skins.length === 0) {
            seerLookupMessage.textContent = "找不到符合的皮膚，請確認名稱或改用皮膚 ID。";
            return;
        }
        const pendingSkinIndexes = skins.map((skin, index) => index);
        const entries = new Array(skins.length);
        const workers = Array.from({ length: Math.min(4, pendingSkinIndexes.length) }, async () => {
            while (pendingSkinIndexes.length > 0) {
                const index = pendingSkinIndexes.shift();
                entries[index] = await loadSeerSkinEntry(skins[index]);
            }
        });
        await Promise.all(workers);
        if (requestId !== seerLookupRequestId) return;
        const settings = await getTaiwanProgressSettings();
        if (requestId !== seerLookupRequestId) return;
        const visibleEntries = entries.filter(({ skin, pet }) => matchesTaiwanSkinProgress(skin, pet, settings));
        if (visibleEntries.length === 0) {
            seerLookupMessage.textContent = seerTaiwanOnlyEnabled
                ? "符合搜尋條件的皮膚皆超出台服目前進度。"
                : "找不到符合的皮膚，請確認名稱或改用皮膚 ID。";
            return;
        }
        renderSeerSkinSearchResults(visibleEntries);
        seerLookupResults.hidden = false;
        const hasMoreMatches = responses.some((response) =>
            Number(response.count) > (Array.isArray(response.results) ? response.results.length : 0)
        );
        const resultCountMessage = visibleEntries.length === 1
            ? "找到 1 款皮膚，點選結果查看預覽。"
            : `找到 ${visibleEntries.length} 款皮膚，請選擇。`;
        seerLookupMessage.textContent = hasMoreMatches
            ? `${resultCountMessage} 結果較多，請輸入更完整的名稱以縮小範圍。`
            : resultCountMessage;
    }

    function matchesSelectedSkinCategory(skin, categoryId) {
        return categoryId === null
            || Number(skin && skin.category && skin.category.id) === categoryId;
    }

    function getSeerSkinResourceId(skin) {
        const resourceId = Number(skin && skin.resource_id);
        if (Number.isSafeInteger(resourceId) && resourceId > 0) return String(resourceId);
        const skinId = Number(skin && skin.id);
        return Number.isSafeInteger(skinId) && skinId > 0 ? `1400${skinId}` : "";
    }

    function getSeerSkinImageResourceId(skin) {
        return Number(skin && skin.id) === 840 ? "1400812" : getSeerSkinResourceId(skin);
    }

    async function loadSeerSkinEntry(skin) {
        const skinId = skin && skin.id;
        const petId = skin && skin.pet && skin.pet.id;
        if (!Number.isSafeInteger(Number(skinId)) || Number(skinId) < 1) {
            throw new Error("SeerAPI 回傳未包含有效的皮膚 ID。");
        }
        if (!Number.isSafeInteger(Number(petId)) || Number(petId) < 1) {
            throw new Error(`SeerAPI 回傳的皮膚 ${skinId} 未包含所屬精靈 ID。`);
        }
        return { skin, pet: await fetchSeerPetDetails(petId) };
    }



    async function searchSeerPetsByName(query, requestId) {
        const { pets, responses } = await fetchSeerPetsByName(query);
        if (requestId !== seerLookupRequestId) return;
        const settings = await getTaiwanProgressSettings();
        if (requestId !== seerLookupRequestId) return;
        const visiblePets = pets.filter((pet) => matchesTaiwanPetProgress(pet, settings));

        if (visiblePets.length === 0) {
            seerLookupMessage.textContent = seerTaiwanOnlyEnabled && pets.length > 0
                ? "符合名稱的精靈皆超出台服目前進度。"
                : "找不到符合的精靈，請確認名稱或改用精靈 ID。";
            return;
        }
        const typeDetailsById = await loadSeerPetSearchTypeDetails(visiblePets);
        if (requestId !== seerLookupRequestId) return;
        renderSeerPetSearchResults(visiblePets, typeDetailsById);
        seerLookupResults.hidden = false;
        const hasMoreMatches = responses.some((response) =>
            Number(response.count) > (Array.isArray(response.results) ? response.results.length : 0)
        );
        const resultCountMessage = visiblePets.length === 1 ? "找到 1 隻精靈，點選結果查看預覽。" : `找到 ${visiblePets.length} 隻精靈，請選擇。`;
        seerLookupMessage.textContent = hasMoreMatches
            ? `${resultCountMessage} 結果較多，請輸入更完整的名稱以縮小範圍。`
            : resultCountMessage;
    }



    async function loadSeerPetSearchTypeDetails(pets) {
        const typeIds = [...new Set(pets
            .map((pet) => pet && pet.type && pet.type.id)
            .filter(Boolean)
            .map(String))];
        const pendingTypeIds = [...typeIds];
        const typeDetailsById = new Map();
        const workerCount = Math.min(4, pendingTypeIds.length);
        const workers = Array.from({ length: workerCount }, async () => {
            while (pendingTypeIds.length > 0) {
                const typeId = pendingTypeIds.shift();
                try {
                    typeDetailsById.set(typeId, await fetchSeerElementTypeDetails(typeId));
                } catch (error) {
                    console.warn(`Load Seer element type ${typeId} error:`, error);
                }
            }
        });
        await Promise.all(workers);
        return typeDetailsById;
    }



    function renderSeerPetSearchResults(pets, typeDetailsById, append = false) {
        if (!append) seerLookupResults.replaceChildren();
        pets.forEach((pet) => {
            const button = document.createElement("button");
            button.className = "seer-lookup-result";
            button.type = "button";
            const content = document.createElement("span");
            content.className = "seer-lookup-result-content";
            const visual = document.createElement("span");
            visual.className = "seer-lookup-result-thumbnail";
            const thumbnail = document.createElement("img");
            thumbnail.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(pet.id)}.png`;
            thumbnail.alt = `${convertToTraditionalChinese(pet.name || "精靈")}頭像`;
            thumbnail.loading = "lazy";
            thumbnail.addEventListener("error", () => {
                thumbnail.hidden = true;
            });
            visual.append(thumbnail);
            const typeId = pet && pet.type && pet.type.id || pet && pet.typeId;
            const typeDetails = typeId && typeDetailsById.get(String(typeId));
            const type = document.createElement("span");
            type.className = "seer-lookup-result-type";
            if (typeDetails) {
                const typeIcon = document.createElement("img");
                typeIcon.src = typeIconUrl(typeDetails.id);
                typeIcon.alt = typeDetails.name || "屬性";
                type.append(typeIcon);
            } else {
                type.textContent = "-";
            }
            const name = document.createElement("strong");
            name.className = "seer-lookup-result-name";
            name.textContent = convertToTraditionalChinese(pet.name || "未命名精靈");
            content.append(visual, type, name);
            const id = document.createElement("span");
            id.className = "seer-lookup-result-id";
            id.textContent = `#${pet.id}`;
            button.append(content, id);
            button.addEventListener("click", async () => {
                const isBrowsing = seerBrowseState
                    && seerBrowseState.requestId === seerLookupRequestId
                    && !seerLookupIdInput.value.trim();
                if (!isBrowsing) {
                    seerBrowseState = null;
                    seerPetTypeFilterState = null;
                    clearSeerBrowseSentinel();
                }
                const requestId = isBrowsing ? seerLookupRequestId : ++seerLookupRequestId;
                const resultButtons = seerLookupResults.querySelectorAll(".seer-lookup-result");
                resultButtons.forEach((result) => {
                    result.disabled = true;
                    result.classList.toggle("is-selected", result === button);
                });
                resetSeerPetInfo();
                seerLookupPreview.hidden = true;
                seerLookupMessage.textContent = "正在載入精靈屬性…";
                try {
                    await renderSeerPetPreview(pet, requestId);
                    if (requestId === seerLookupRequestId) seerLookupMessage.textContent = "";
                } catch (error) {
                    if (requestId !== seerLookupRequestId) return;
                    console.error("Load searched Seer pet error:", error);
                    seerLookupMessage.textContent = `載入失敗：${error.message}`;
                }
                if (requestId === seerLookupRequestId) {
                    resultButtons.forEach((result) => {
                        result.disabled = false;
                    });
                }
            });
            seerLookupResults.append(button);
        });
    }

    function renderSeerSkinSearchResults(entries, append = false) {
        if (!append) seerLookupResults.replaceChildren();
        entries.forEach((entry) => {
            const { skin, pet } = entry;
            const button = document.createElement("button");
            button.className = "seer-lookup-result";
            button.type = "button";
            const content = document.createElement("span");
            content.className = "seer-lookup-result-content";
            const visual = document.createElement("span");
            visual.className = "seer-lookup-result-thumbnail";
            const thumbnail = document.createElement("img");
            const resourceId = getSeerSkinImageResourceId(skin);
            thumbnail.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(resourceId)}.png`;
            thumbnail.alt = `${convertToTraditionalChinese(skin.name || "皮膚")}縮圖`;
            thumbnail.loading = "lazy";
            thumbnail.addEventListener("error", async () => {
                if (thumbnail.dataset.fallbackAttempted === "true") {
                    thumbnail.hidden = true;
                    return;
                }
                thumbnail.dataset.fallbackAttempted = "true";
                try {
                    const fallbackPet = await findSeerPetForSkinThumbnailFallback(skin, pet);
                    if (!thumbnail.isConnected) return;
                    if (!fallbackPet) {
                        thumbnail.hidden = true;
                        return;
                    }
                    thumbnail.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(fallbackPet.id)}.png`;
                    thumbnail.alt = `${convertToTraditionalChinese(fallbackPet.name || "精靈")}頭像`;
                } catch (error) {
                    console.error(`Load fallback thumbnail for Seer skin ${skin.id} error:`, error);
                    thumbnail.hidden = true;
                }
            });
            visual.append(thumbnail);
            const details = document.createElement("span");
            details.className = "seer-lookup-result-details";
            const name = document.createElement("strong");
            name.className = "seer-lookup-result-name";
            name.textContent = convertToTraditionalChinese(skin.name || "未命名皮膚");
            const petName = document.createElement("span");
            petName.className = "seer-lookup-result-pet";
            petName.textContent = `綁定精靈：${convertToTraditionalChinese(pet.name || "未命名精靈")}`;
            details.append(name, petName);
            content.append(visual, details);
            const id = document.createElement("span");
            id.className = "seer-lookup-result-id";
            id.textContent = `#${skin.id}`;
            button.append(content, id);
            button.addEventListener("click", async () => {
                const isBrowsing = seerBrowseState
                    && seerBrowseState.requestId === seerLookupRequestId
                    && !seerLookupIdInput.value.trim();
                if (!isBrowsing) {
                    seerBrowseState = null;
                    seerPetTypeFilterState = null;
                    clearSeerBrowseSentinel();
                }
                const requestId = isBrowsing ? seerLookupRequestId : ++seerLookupRequestId;
                const resultButtons = seerLookupResults.querySelectorAll(".seer-lookup-result");
                resultButtons.forEach((result) => {
                    result.disabled = true;
                    result.classList.toggle("is-selected", result === button);
                });
                resetSeerPetInfo();
                seerLookupPreview.hidden = true;
                seerLookupMessage.textContent = "正在載入皮膚資料…";
                try {
                    await renderSeerSkinPreview(entry, requestId);
                    if (requestId === seerLookupRequestId) seerLookupMessage.textContent = "";
                } catch (error) {
                    if (requestId !== seerLookupRequestId) return;
                    console.error("Load searched Seer skin error:", error);
                    seerLookupMessage.textContent = `載入失敗：${error.message}`;
                }
                if (requestId === seerLookupRequestId) {
                    resultButtons.forEach((result) => {
                        result.disabled = false;
                    });
                }
            });
            seerLookupResults.append(button);
        });
    }

    async function renderSeerPetPreview(pet, requestId) {
        const petId = pet && pet.id;
        const typeId = pet && pet.type && pet.type.id || pet && pet.typeId;
        const petName = convertToTraditionalChinese(pet && pet.name ? String(pet.name).trim() : "");
        if (!petId || !petName) throw new Error("SeerAPI 回傳未包含精靈 ID 或名稱。");
        if (!typeId) throw new Error("SeerAPI 回傳未包含精靈屬性資料。");

        const typeCombination = await fetchSeerJson(
            `https://api.seerapi.com/v1/element_type_combination/${encodeURIComponent(typeId)}`
        );
        const resolvedTypeId = Number(typeCombination && typeCombination.id ? typeCombination.id : typeId);
        if (!Number.isSafeInteger(resolvedTypeId) || resolvedTypeId <= 0) {
            throw new Error("SeerAPI 回傳的屬性 ID 無效。");
        }
        const typeName = convertToTraditionalChinese(
            typeCombination && typeCombination.name ? String(typeCombination.name).trim() : ""
        );
        if (requestId !== seerLookupRequestId) return;

        currentSeerSkinImageFallback = null;
        seerLookupAvatar.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(petId)}.png`;
        seerLookupName.textContent = petName;
        seerLookupIdResult.textContent = `#${petId}`;
        seerLookupRelatedPet.hidden = true;
        seerLookupSkinCategoryIcon.hidden = true;
        seerLookupSkinCategoryIcon.removeAttribute("src");
        seerLookupIllustrationCategoryIcon.hidden = true;
        seerLookupIllustrationCategoryIcon.removeAttribute("src");
        seerLookupTypeIcon.src = typeIconUrl(resolvedTypeId);
        seerLookupTypeName.textContent = typeName || "未知";
        seerLookupIllustrationImage.src = `https://newseer.61.com/web/monster//body/${encodeURIComponent(petId)}.png`;
        seerLookupIllustrationImage.alt = `${petName}立繪`;
        seerLookupMoreInfoButton.hidden = false;
        seerLookupSkinMoreInfoButton.hidden = true;
        seerLookupPetSkinsButton.hidden = false;
        seerLookupIllustrationTitle.textContent = "立繪預覽";
        seerLookupIllustrationDescription.textContent = "已選擇精靈，可在此查看立繪。";
        currentSeerInfoUrl = `https://wiki.biligame.com/seer/${encodeURI(`精灵:${petId}`)}`;
        currentSeerPetId = String(petId);
        seerLookupIllustrationImage.hidden = false;
        seerLookupPreview.hidden = false;
        currentSeerPetData = pet;
        seerPetInfoToggle.hidden = false;
        seerPetInfoToggle.disabled = false;
        seerPetInfoTitle.textContent = petName;
        renderSeerPetInfoIdentity(pet, { id: resolvedTypeId, name: typeName });
        seerPetInfoPanel.replaceChildren();
        seerPetInfoRequestId += 1;
    }

    async function loadSeerPetInfo(pet) {
        const requestId = ++seerPetInfoRequestId;
        const petId = String(pet && pet.id || "");
        if (!petId) return;
        seerPetInfoRetry.hidden = true;
        seerPetInfoPanel.replaceChildren();
        const loading = document.createElement("p");
        loading.className = "seer-pet-info-message";
        loading.textContent = "正在載入精靈資料…";
        seerPetInfoPanel.append(loading);

        try {
            const details = await fetchSeerPetInfo(petId);
            if (requestId !== seerPetInfoRequestId || petId !== currentSeerPetId) return;
            const skillRefs = Array.isArray(details.skill) ? details.skill : [];
            const activationItemRefs = skillRefs
                .map((reference) => reference && reference.skill_activation_item)
                .filter((reference) => reference && reference.id !== undefined && reference.id !== null);
            const soulmarkRefs = Array.isArray(details.soulmark) ? details.soulmark : [];
            const [skills, activationItems, soulmarks, typeDetails] = await Promise.all([
                fetchSeerPetRelatedRecords(skillRefs, "skill"),
                fetchSeerPetRelatedRecords(
                    activationItemRefs,
                    "skill_activation_item"
                ).catch((error) => {
                    console.warn(`Load Seer pet skill activation items ${petId} error:`, error);
                    return [];
                }),
                fetchSeerPetRelatedRecords(soulmarkRefs, "soulmark"),
                details.type && details.type.id
                    ? fetchSeerElementTypeDetails(details.type.id).catch((error) => {
                        console.warn(`Load Seer pet type ${petId} error:`, error);
                        return null;
                    })
                    : Promise.resolve(null)
            ]);
            if (requestId !== seerPetInfoRequestId || petId !== currentSeerPetId) return;
            let advanceStats = null;
            let advanceLoadError = null;
            if (details.advance) {
                try {
                    const [advance] = await fetchSeerPetRelatedRecords(
                        [details.advance],
                        "pet_advance"
                    );
                    advanceStats = advance && advance.record && advance.record.base_stats || null;
                } catch (error) {
                    advanceLoadError = error;
                    console.warn(`Load Seer pet advance ${petId} error:`, error);
                }
            }
            if (requestId !== seerPetInfoRequestId || petId !== currentSeerPetId) return;
            const activationItemsById = new Map(activationItems
                .filter(({ record }) => record && record.id !== undefined && record.id !== null)
                .map(({ record }) => [String(record.id), record]));
            renderSeerPetInfo(
                details,
                skills,
                soulmarks,
                advanceStats,
                advanceLoadError,
                typeDetails,
                activationItemsById
            );
        } catch (error) {
            if (requestId !== seerPetInfoRequestId || petId !== currentSeerPetId) return;
            console.error(`Load Seer pet info ${petId} error:`, error);
            seerPetInfoPanel.replaceChildren();
            const message = document.createElement("p");
            message.className = "seer-pet-info-message";
            message.textContent = `精靈資料載入失敗：${error.message}`;
            seerPetInfoPanel.append(message);
            seerPetInfoRetry.hidden = false;
        } finally {
            if (requestId === seerPetInfoRequestId) seerPetInfoToggle.disabled = false;
        }
    }











    async function renderSeerSkinPreview(entry, requestId) {
        const { skin, pet } = entry;
        const skinId = Number(skin && skin.id);
        const petId = pet && pet.id;
        const skinName = convertToTraditionalChinese(skin && skin.name ? String(skin.name).trim() : "");
        const petName = convertToTraditionalChinese(pet && pet.name ? String(pet.name).trim() : "");
        const typeId = pet && pet.type && pet.type.id;
        if (!Number.isSafeInteger(skinId) || skinId < 1 || !petId || !skinName || !petName || !typeId) {
            throw new Error("SeerAPI 回傳未包含完整的皮膚或所屬精靈資料。");
        }
        const typeDetails = await fetchSeerElementTypeDetails(typeId);
        if (requestId !== seerLookupRequestId) return;

        currentSeerSkinImageFallback = {
            requestId,
            skinName: String(skin.name).trim(),
            linkedPetId: String(petId),
            attempted: false
        };
        const imageResourceId = getSeerSkinImageResourceId(skin);
        seerLookupAvatar.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(imageResourceId)}.png`;
        seerLookupName.textContent = skinName;
        seerLookupIdResult.textContent = `#${skinId}`;
        seerLookupRelatedPet.textContent = `綁定精靈：${petName} (#${petId})`;
        seerLookupRelatedPet.hidden = false;
        const categoryId = skin && skin.category && Number(skin.category.id);
        if (Number.isSafeInteger(categoryId) && categoryId >= 0) {
            seerLookupSkinCategoryIcon.src = skinCategoryIconUrl(categoryId);
            seerLookupSkinCategoryIcon.hidden = false;
            seerLookupIllustrationCategoryIcon.src = skinCategoryIconUrl(categoryId);
            seerLookupIllustrationCategoryIcon.hidden = false;
        } else {
            seerLookupSkinCategoryIcon.hidden = true;
            seerLookupSkinCategoryIcon.removeAttribute("src");
            seerLookupIllustrationCategoryIcon.hidden = true;
            seerLookupIllustrationCategoryIcon.removeAttribute("src");
        }
        seerLookupTypeIcon.src = typeIconUrl(typeDetails.id);
        seerLookupTypeName.textContent = typeDetails.name || "未知";
        seerLookupIllustrationImage.src = `https://newseer.61.com/web/monster//body/${encodeURIComponent(imageResourceId)}.png`;
        seerLookupIllustrationImage.alt = `${skinName}立繪`;
        seerLookupMoreInfoButton.hidden = true;
        seerLookupSkinMoreInfoButton.hidden = false;
        seerLookupPetSkinsButton.hidden = true;
        seerLookupIllustrationTitle.textContent = "皮膚立繪預覽";
        seerLookupIllustrationDescription.textContent = `綁定精靈：${petName}`;
        currentSeerInfoUrl = `https://wiki.biligame.com/seer/${encodeURI(`皮肤:${getSeerSkinResourceId(skin)}`)}`;
        currentSeerPetId = null;
        currentSeerPetData = null;
        seerPetInfoTitle.textContent = "精靈資訊";
        seerPetInfoAvatar.hidden = true;
        seerPetInfoAvatar.removeAttribute("src");
        seerPetInfoMeta.replaceChildren();
        seerPetInfoRequestId += 1;
        seerPetInfoPanel.replaceChildren();
        if (!seerPetInfoModal.hidden) closeSeerPetInfoModal();
        seerPetInfoToggle.hidden = true;
        seerPetInfoRetry.hidden = true;
        seerLookupIllustrationImage.hidden = false;
        seerLookupPreview.hidden = false;
    }

    async function findSeerPetForSkinFallback(skinName, linkedPetId) {
        const searchTerms = [...new Set([skinName, convertToSimplifiedChinese(skinName)].filter(Boolean))];
        const responses = await Promise.all(searchTerms.map((term) => {
            const params = new URLSearchParams({ name: term, offset: "0", limit: "10", expand: "true" });
            return fetchSeerJson(`https://api.seerapi.com/v1/pet?${params}`);
        }));
        const petsById = new Map();
        responses.forEach((response) => {
            (response.results || []).forEach((pet) => {
                if (pet && pet.id !== undefined && !petsById.has(String(pet.id))) {
                    petsById.set(String(pet.id), pet);
                }
            });
        });
        const pets = Array.from(petsById.values());
        const exactNameMatches = pets.filter((pet) => String(pet.name || "").trim() === skinName);
        return exactNameMatches.find((pet) => String(pet.id) === linkedPetId)
            || exactNameMatches[0]
            || null;
    }

    function findSeerPetForSkinThumbnailFallback(skin, linkedPet) {
        const skinName = String(skin && skin.name || "").trim();
        if (!skinName) return Promise.resolve(null);
        let fallbackPromise = seerSkinThumbnailFallbackCache.get(skinName);
        if (!fallbackPromise) {
            fallbackPromise = findSeerPetForSkinFallback(
                skinName,
                linkedPet && linkedPet.id ? String(linkedPet.id) : ""
            ).catch((error) => {
                seerSkinThumbnailFallbackCache.delete(skinName);
                throw error;
            });
            seerSkinThumbnailFallbackCache.set(skinName, fallbackPromise);
        }
        return fallbackPromise;
    }

    async function handleSeerLookupImageError(image) {
        const fallback = currentSeerSkinImageFallback;
        if (!fallback || fallback.requestId !== seerLookupRequestId) {
            image.hidden = true;
            return;
        }
        if (fallback.attempted) {
            image.hidden = true;
            return;
        }
        fallback.attempted = true;
        seerLookupMessage.textContent = "皮膚圖片不存在，正在依皮膚名稱搜尋精靈圖片…";
        try {
            const pet = await findSeerPetForSkinFallback(fallback.skinName, fallback.linkedPetId);
            if (fallback !== currentSeerSkinImageFallback || fallback.requestId !== seerLookupRequestId) return;
            if (!pet || !pet.id) {
                image.hidden = true;
                seerLookupMessage.textContent = `找不到名稱與「${convertToTraditionalChinese(fallback.skinName)}」完全相同的精靈。`;
                return;
            }
            const petId = encodeURIComponent(pet.id);
            const petName = convertToTraditionalChinese(pet.name ? String(pet.name).trim() : "");
            seerLookupAvatar.src = `https://newseer.61.com/web/monster/head/${petId}.png`;
            seerLookupAvatar.alt = `${petName || "精靈"}頭像`;
            seerLookupAvatar.hidden = false;
            seerLookupIllustrationImage.src = `https://newseer.61.com/web/monster//body/${petId}.png`;
            seerLookupIllustrationImage.alt = `${petName || "精靈"}立繪`;
            seerLookupIllustrationImage.hidden = false;
            seerLookupMessage.textContent = "";
        } catch (error) {
            if (fallback !== currentSeerSkinImageFallback || fallback.requestId !== seerLookupRequestId) return;
            console.error("Seer skin image fallback lookup error:", error);
            image.hidden = true;
            seerLookupMessage.textContent = `搜尋替代精靈圖片失敗：${error.message}`;
        }
    }

    function clearSeerLookupResult() {
        seerLookupMessage.textContent = "";
        resetSeerPetInfo();
        clearSeerBrowseSentinel();
        seerLookupResults.replaceChildren();
        seerLookupResults.hidden = true;
        seerLookupPreview.hidden = true;
        seerLookupAvatar.removeAttribute("src");
        seerLookupTypeIcon.removeAttribute("src");
        seerLookupSkinCategoryIcon.hidden = true;
        seerLookupSkinCategoryIcon.removeAttribute("src");
        seerLookupIllustrationCategoryIcon.hidden = true;
        seerLookupIllustrationCategoryIcon.removeAttribute("src");
        seerLookupIllustrationImage.hidden = true;
        seerLookupIllustrationImage.removeAttribute("src");
        currentSeerInfoUrl = null;
        currentSeerPetId = null;
        currentSeerSkinImageFallback = null;
        seerLookupName.textContent = "-";
        seerLookupIdResult.textContent = "#-";
        seerLookupRelatedPet.textContent = "";
        seerLookupRelatedPet.hidden = true;
        seerLookupTypeName.textContent = "-";
        seerLookupMoreInfoButton.hidden = true;
        seerLookupSkinMoreInfoButton.hidden = true;
        seerLookupPetSkinsButton.hidden = true;
        seerLookupIllustrationTitle.textContent = seerLookupMode === "skin" ? "皮膚立繪預覽" : "立繪預覽";
        seerLookupIllustrationDescription.textContent = seerLookupMode === "skin"
            ? "先搜尋並選擇皮膚，即可在此查看立繪。"
            : "先搜尋並選擇精靈，即可在此查看立繪。";
    }

    function openSeerSkinSearchForCurrentPet() {
        if (!currentSeerPetId) return;
        const petId = currentSeerPetId;
        setSeerLookupMode("skin");
        setSeerSkinSearchMode("pet");
        seerLookupIdInput.value = petId;
        activateTab("seer-lookup-section");
        seerLookupIdInput.focus();
        startSeerPetLookup(petId);
    }

    function openSeerRelatedSkinsModal() {
        if (!currentSeerPetId) return;
        seerRelatedSkinsOpener = document.activeElement;
        const requestId = ++seerRelatedSkinsRequestId;
        seerRelatedSkinsModal.classList.remove("is-closing");
        seerRelatedSkinsModal.hidden = false;
        seerRelatedSkinsResults.replaceChildren();
        seerRelatedSkinsMessage.textContent = "正在載入關聯皮膚…";
        updateSeerModalScrollLock();
        seerRelatedSkinsClose.focus();
        void loadSeerRelatedSkins(currentSeerPetId, requestId);
    }

    async function loadSeerRelatedSkins(petId, requestId) {
        try {
            const settings = await getTaiwanProgressSettings();
            if (requestId !== seerRelatedSkinsRequestId || seerRelatedSkinsModal.hidden) return;
            const skins = await fetchSeerSkinCatalog();
            if (requestId !== seerRelatedSkinsRequestId || seerRelatedSkinsModal.hidden) return;
            const matchingSkins = skins
                .filter((skin) =>
                    String(skin && skin.pet && skin.pet.id) === String(petId)
                    && matchesTaiwanSkinProgress(skin, currentSeerPetData, settings)
                )
                .sort((first, second) => Number(second.id) - Number(first.id));
            if (!matchingSkins.length) {
                seerRelatedSkinsMessage.textContent = seerTaiwanOnlyEnabled
                    ? "找不到符合台服目前進度的關聯皮膚。"
                    : "找不到這隻精靈的關聯皮膚。";
                return;
            }
            const entries = await Promise.all(matchingSkins.map((skin) => loadSeerSkinEntry(skin)));
            if (requestId !== seerRelatedSkinsRequestId || seerRelatedSkinsModal.hidden) return;
            renderSeerRelatedSkins(entries, requestId);
            seerRelatedSkinsMessage.textContent = `找到 ${entries.length} 款關聯皮膚，點選即可前往查看。`;
        } catch (error) {
            if (requestId !== seerRelatedSkinsRequestId || seerRelatedSkinsModal.hidden) return;
            console.error(`Load related Seer skins for pet ${petId} error:`, error);
            seerRelatedSkinsMessage.textContent = `關聯皮膚載入失敗：${error.message}`;
        }
    }

    function renderSeerRelatedSkins(entries, requestId) {
        seerRelatedSkinsResults.replaceChildren();
        entries.forEach(({ skin, pet }) => {
            const button = document.createElement("button");
            button.className = "seer-related-skin-item";
            button.type = "button";
            const thumbnail = document.createElement("img");
            thumbnail.className = "seer-related-skin-thumbnail";
            thumbnail.src =
                `https://newseer.61.com/web/monster/head/${encodeURIComponent(getSeerSkinImageResourceId(skin))}.png`;
            thumbnail.alt = `${convertToTraditionalChinese(skin.name || "皮膚")}縮圖`;
            thumbnail.loading = "lazy";
            thumbnail.addEventListener("error", async () => {
                if (thumbnail.dataset.fallbackAttempted === "true") {
                    thumbnail.hidden = true;
                    return;
                }
                thumbnail.dataset.fallbackAttempted = "true";
                try {
                    const fallbackPet = await findSeerPetForSkinThumbnailFallback(skin, pet);
                    if (!thumbnail.isConnected || requestId !== seerRelatedSkinsRequestId) return;
                    if (!fallbackPet) {
                        thumbnail.hidden = true;
                        return;
                    }
                    thumbnail.src =
                        `https://newseer.61.com/web/monster/head/${encodeURIComponent(fallbackPet.id)}.png`;
                    thumbnail.alt = `${convertToTraditionalChinese(fallbackPet.name || "精靈")}頭像`;
                } catch (error) {
                    console.error(`Load fallback thumbnail for related Seer skin ${skin.id} error:`, error);
                    thumbnail.hidden = true;
                }
            });
            const categoryId = Number(skin && skin.category && skin.category.id);
            const categoryIcon = document.createElement("img");
            categoryIcon.className = "seer-related-skin-category-icon";
            categoryIcon.alt = "";
            categoryIcon.setAttribute("aria-hidden", "true");
            categoryIcon.loading = "lazy";
            if (Number.isSafeInteger(categoryId) && categoryId >= 0) {
                categoryIcon.src =
                    skinCategoryIconUrl(categoryId);
                categoryIcon.addEventListener("error", () => categoryIcon.remove(), { once: true });
            } else {
                categoryIcon.remove();
            }
            const details = document.createElement("span");
            details.className = "seer-related-skin-details";
            const name = document.createElement("strong");
            name.className = "seer-related-skin-name";
            name.textContent = convertToTraditionalChinese(skin.name || "未命名皮膚");
            details.append(name);
            const id = document.createElement("span");
            id.className = "seer-related-skin-id";
            id.textContent = `#${skin.id}`;
            button.append(thumbnail, categoryIcon, details, id);
            button.addEventListener("click", () => openSeerSkinInSearch(skin.id));
            seerRelatedSkinsResults.append(button);
        });
    }

    function openSeerSkinInSearch(skinId) {
        closeSeerRelatedSkinsModal(false);
        closeSeerPetInfoModal(false);
        setSeerLookupMode("skin");
        setSeerSkinSearchMode("skin");
        seerLookupIdInput.value = String(skinId);
        activateTab("seer-lookup-section");
        seerLookupIdInput.focus();
        startSeerPetLookup(String(skinId));
    }

    function openSeerPetInfoModal(opener = document.activeElement) {
        if (!currentSeerPetData || !currentSeerPetId || !seerPetInfoModal.hidden) return;
        seerPetInfoOpener = opener;
        seerPetInfoModal.classList.remove("is-closing");
        seerPetInfoModal.hidden = false;
        updateSeerModalScrollLock();
        seerPetInfoClose.focus();
        void loadSeerPetInfo(currentSeerPetData);
    }

    function updateSeerModalScrollLock() {
        document.body.classList.toggle(
            "has-admin-confirm-modal",
            !seerPetInfoModal.hidden || !seerExternalLinkModal.hidden || !seerRelatedSkinsModal.hidden || !seerPetTypeModal.hidden
        );
    }

    function closeSeerPetInfoModal(restoreFocus = true) {
        if (seerPetInfoModal.hidden || seerPetInfoModal.classList.contains("is-closing")) return;
        seerPetInfoModal.classList.add("is-closing");
        window.setTimeout(() => {
            if (!seerPetInfoModal.classList.contains("is-closing")) return;
            seerPetInfoModal.hidden = true;
            seerPetInfoModal.classList.remove("is-closing");
            updateSeerModalScrollLock();
            if (restoreFocus && seerPetInfoOpener && seerPetInfoOpener.isConnected && !seerPetInfoOpener.hidden) {
                seerPetInfoOpener.focus();
            }
            seerPetInfoOpener = null;
        }, 180);
    }

    function closeSeerRelatedSkinsModal(restoreFocus = true) {
        if (seerRelatedSkinsModal.hidden || seerRelatedSkinsModal.classList.contains("is-closing")) return;
        seerRelatedSkinsRequestId += 1;
        seerRelatedSkinsModal.classList.add("is-closing");
        window.setTimeout(() => {
            if (!seerRelatedSkinsModal.classList.contains("is-closing")) return;
            seerRelatedSkinsModal.hidden = true;
            seerRelatedSkinsModal.classList.remove("is-closing");
            updateSeerModalScrollLock();
            if (restoreFocus && seerRelatedSkinsOpener && seerRelatedSkinsOpener.isConnected) {
                seerRelatedSkinsOpener.focus();
            }
            seerRelatedSkinsOpener = null;
        }, 180);
    }

    function openSeerPetTypeModal(opener = document.activeElement) {
        if (!seerPetTypeModal.hidden) return;
        seerPetTypeModalOpener = opener;
        seerPetPickerBase = SEER_TYPE_DATA.combinations.find(type => type.id === selectedSeerPetTypeId)?.types[0] || null;
        seerPetPickerQuery = "";
        seerPetTypeSearch.value = "";
        renderSeerPetTypeOptions();
        void fetchSeerElementTypeCombinations().then(() => renderSeerPetTypeOptions()).catch(error => {
            seerPetTypeOptions.textContent = `無法載入屬性：${error.message}`;
        });
        seerPetTypeModal.classList.remove("is-closing");
        seerPetTypeModal.hidden = false;
        updateSeerModalScrollLock();
        seerPetTypeClose.focus();
    }

    function closeSeerPetTypeModal(restoreFocus = true) {
        if (seerPetTypeModal.hidden || seerPetTypeModal.classList.contains("is-closing")) return;
        seerPetTypeModal.classList.add("is-closing");
        window.setTimeout(() => {
            if (!seerPetTypeModal.classList.contains("is-closing")) return;
            seerPetTypeModal.hidden = true;
            seerPetTypeModal.classList.remove("is-closing");
            updateSeerModalScrollLock();
            if (restoreFocus && seerPetTypeModalOpener && seerPetTypeModalOpener.isConnected) {
                seerPetTypeModalOpener.focus();
            }
            seerPetTypeModalOpener = null;
        }, 180);
    }

    function updateSeerPetTypeCurrentDisplay() {
        if (!seerPetTypeCurrentName) return;
        if (selectedSeerPetTypeId === null) {
            if (seerPetTypeCurrentIcon) {
                seerPetTypeCurrentIcon.hidden = true;
                seerPetTypeCurrentIcon.removeAttribute("src");
            }
            seerPetTypeCurrentName.textContent = seerPetTypeCategory === "double" ? "全部雙屬性" : "全部單屬性";
            return;
        }
        if (seerPetTypeCurrentIcon) {
            seerPetTypeCurrentIcon.hidden = false;
            seerPetTypeCurrentIcon.src = typeIconUrl(selectedSeerPetTypeId);
        }
        const match = getElementTypeCombinations().find((item) => item.id === selectedSeerPetTypeId);
        if (match) {
            seerPetTypeCurrentName.textContent = convertToTraditionalChinese(match.name);
        } else {
            const cached = getCachedElementTypeDetails(selectedSeerPetTypeId);
            if (cached && cached.name) {
                seerPetTypeCurrentName.textContent = cached.name;
            } else {
                seerPetTypeCurrentName.textContent = `屬性 ${selectedSeerPetTypeId}`;
            }
        }
    }

    function openSeerExternalLinkModal(url = currentSeerInfoUrl) {
        if (!url) return;
        externalLinkOpener = document.activeElement;
        seerExternalLinkOpen.href = url;
        seerExternalLinkModal.classList.remove("is-closing");
        seerExternalLinkModal.hidden = false;
        updateSeerModalScrollLock();
        seerExternalLinkCancel.focus();
    }

    function closeSeerExternalLinkModal() {
        if (seerExternalLinkModal.hidden || seerExternalLinkModal.classList.contains("is-closing")) return;
        seerExternalLinkModal.classList.add("is-closing");
        window.setTimeout(() => {
            seerExternalLinkModal.hidden = true;
            seerExternalLinkModal.classList.remove("is-closing");
            updateSeerModalScrollLock();
            if (externalLinkOpener && typeof externalLinkOpener.focus === "function") {
                externalLinkOpener.focus();
            }
            externalLinkOpener = null;
        }, 180);
    }

    seerLookupAvatar.addEventListener("error", () => {
        void handleSeerLookupImageError(seerLookupAvatar);
    });

    seerLookupIllustrationImage.addEventListener("error", () => {
        void handleSeerLookupImageError(seerLookupIllustrationImage);
    });




        updateSeerPetSearchMethodUi();

        seerLookupForm.addEventListener("submit", (event) => {
            event.preventDefault();
            if (seerLookupMode === "skin" && seerSkinSearchMode === "category") {
                void startLatestSeerBrowse(++seerLookupRequestId);
                return;
            }
            startSeerPetLookup(seerLookupIdInput.value.trim());
        });
        seerPetSearchMethodButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setSeerPetSearchMethod(button.dataset.petSearchMethod);
            });
        });
        seerPetTypeCategoryButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setSeerPetTypeCategory(button.dataset.petTypeCategory);
                closeSeerPetTypeModal();
            });
        });
        seerPetTypeSearch.addEventListener("input", () => {
            seerPetPickerQuery = seerPetTypeSearch.value;
            renderSeerPetTypeOptions();
        });
        seerPetTypeOptions.addEventListener("click", (event) => {
            const button = event.target.closest("[data-pet-type-id]");
            if (!button || !seerPetTypeOptions.contains(button)) return;
            const nextTypeId = button.dataset.petTypeId === "all"
                ? null
                : Number(button.dataset.petTypeId);
            closeSeerPetTypeModal();
            if (selectedSeerPetTypeId === nextTypeId) return;
            selectedSeerPetTypeId = nextTypeId;
            const selectedType = getElementTypeCombinations().find(type => type.id === nextTypeId);
            if (selectedType) seerPetTypeCategory = selectedType.isDouble ? "double" : "single";
            updateSeerPetSearchMethodUi();
            renderSeerPetTypeOptions();
            updateSeerPetTypeCurrentDisplay();
            if (seerPetSearchMethod === "type") {
                void startSeerPetTypeFilter(++seerLookupRequestId);
            }
        });
        updateSeerPetTypeCurrentDisplay();
        if (seerPetTypeOpenModalButton) {
            seerPetTypeOpenModalButton.addEventListener("click", () => {
                openSeerPetTypeModal(seerPetTypeOpenModalButton);
            });
        }
        if (seerPetTypeTriggerCard) {
            seerPetTypeTriggerCard.addEventListener("click", (event) => {
                if (!event.target.closest("button")) {
                    openSeerPetTypeModal(seerPetTypeOpenModalButton);
                }
            });
            seerPetTypeTriggerCard.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openSeerPetTypeModal(seerPetTypeOpenModalButton);
                }
            });
        }
        if (seerPetTypeClose) {
            seerPetTypeClose.addEventListener("click", () => closeSeerPetTypeModal());
        }
        if (seerPetTypeModal) {
            seerPetTypeModal.addEventListener("pointerdown", (event) => {
                seerPetTypePointerStartedOnBackdrop = event.target === seerPetTypeModal;
            });
            seerPetTypeModal.addEventListener("click", (event) => {
                if (seerPetTypePointerStartedOnBackdrop && event.target === seerPetTypeModal) {
                    closeSeerPetTypeModal();
                }
                seerPetTypePointerStartedOnBackdrop = false;
            });
            seerPetTypeModal.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeSeerPetTypeModal();
                    return;
                }
                if (event.key !== "Tab") return;
                const focusable = seerPetTypeModal.querySelectorAll("button:not([disabled]):not([hidden])");
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            });
        }
        document.querySelectorAll("[data-external-link]").forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                openSeerExternalLinkModal(link.href);
            });
        });
        seerSkinSearchModeTabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                setSeerSkinSearchMode(tab.dataset.skinSearchMode);
                if (seerLookupMode === "skin" && (tab.dataset.skinSearchMode === "category" || !seerLookupIdInput.value.trim())) {
                    void startLatestSeerBrowse(++seerLookupRequestId);
                }
            });
        });
        seerSkinCategoryOptions.addEventListener("click", (event) => {
            const button = event.target.closest("[data-skin-category-id]");
            if (!button || !seerSkinCategoryOptions.contains(button)) return;
            const categoryValue = button.dataset.skinCategoryId;
            selectedSeerSkinCategoryId = categoryValue === "all" ? null : Number(categoryValue);
            seerSkinCategoryOptions.querySelectorAll("[data-skin-category-id]").forEach((option) => {
                const selected = option === button;
                option.classList.toggle("is-active", selected);
                option.setAttribute("aria-pressed", String(selected));
            });
            if (seerLookupMode !== "skin" || !["skin", "category"].includes(seerSkinSearchMode)) return;
            if (seerSkinSearchMode === "skin" && seerLookupIdInput.value.trim()) {
                startSeerPetLookup(seerLookupIdInput.value.trim());
            } else {
                void startLatestSeerBrowse(++seerLookupRequestId);
            }
        });
        seerLookupIdInput.addEventListener("input", () => {
            if (!isSeerLookupComposing) scheduleSeerPetLookup();
        });
        seerLookupIdInput.addEventListener("compositionstart", () => {
            isSeerLookupComposing = true;
            invalidateSeerPetLookup();
        });
        seerLookupIdInput.addEventListener("compositionend", () => {
            isSeerLookupComposing = false;
            scheduleSeerPetLookup();
        });
        seerTaiwanProgressOnly.addEventListener("change", () => {
            seerTaiwanOnlyEnabled = seerTaiwanProgressOnly.checked;
            refreshCurrentSeerLookup();
        });
        seerLookupMoreInfoButton.addEventListener("click", openSeerExternalLinkModal);
        seerLookupSkinMoreInfoButton.addEventListener("click", openSeerExternalLinkModal);
        seerLookupPetSkinsButton.addEventListener("click", openSeerSkinSearchForCurrentPet);
        seerPetInfoSkinsButton.addEventListener("click", openSeerRelatedSkinsModal);
        seerRelatedSkinsClose.addEventListener("click", closeSeerRelatedSkinsModal);
        seerPetInfoToggle.addEventListener("click", () => {
            openSeerPetInfoModal();
        });
        seerPetInfoClose.addEventListener("click", closeSeerPetInfoModal);
        seerPetInfoRetry.addEventListener("click", () => {
            if (currentSeerPetData) void loadSeerPetInfo(currentSeerPetData);
        });
        seerPetInfoModal.addEventListener("pointerdown", (event) => {
            seerPetInfoPointerStartedOnBackdrop = event.target === seerPetInfoModal;
        });
        seerPetInfoModal.addEventListener("click", (event) => {
            if (seerPetInfoPointerStartedOnBackdrop && event.target === seerPetInfoModal) {
                closeSeerPetInfoModal();
            }
            seerPetInfoPointerStartedOnBackdrop = false;
        });
        seerPetInfoModal.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeSeerPetInfoModal();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = seerPetInfoModal.querySelectorAll("button:not([disabled]):not([hidden])");
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
        seerRelatedSkinsModal.addEventListener("pointerdown", (event) => {
            seerRelatedSkinsPointerStartedOnBackdrop = event.target === seerRelatedSkinsModal;
        });
        seerRelatedSkinsModal.addEventListener("click", (event) => {
            if (seerRelatedSkinsPointerStartedOnBackdrop && event.target === seerRelatedSkinsModal) {
                closeSeerRelatedSkinsModal();
            }
            seerRelatedSkinsPointerStartedOnBackdrop = false;
        });
        seerRelatedSkinsModal.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeSeerRelatedSkinsModal();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = seerRelatedSkinsModal.querySelectorAll("button:not([disabled]):not([hidden])");
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
        seerExternalLinkCancel.addEventListener("click", closeSeerExternalLinkModal);
        seerExternalLinkOpen.addEventListener("click", closeSeerExternalLinkModal);
        seerExternalLinkModal.addEventListener("pointerdown", (event) => {
            externalLinkPointerStartedOnBackdrop = event.target === seerExternalLinkModal;
        });
        seerExternalLinkModal.addEventListener("click", (event) => {
            if (externalLinkPointerStartedOnBackdrop && event.target === seerExternalLinkModal) {
                closeSeerExternalLinkModal();
            }
            externalLinkPointerStartedOnBackdrop = false;
        });
        seerExternalLinkModal.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeSeerExternalLinkModal();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = seerExternalLinkModal.querySelectorAll("button:not([disabled]), a[href]");
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });


        lookupInstance = {
            setMode: setSeerLookupMode,
            getMode: () => seerLookupMode,
            openPetInfo: (petId) => {
                const normalizedPetId = String(petId || "").trim();
                if (!normalizedPetId) return;
                const opener = document.activeElement;
                currentSeerPetId = normalizedPetId;
                currentSeerPetData = { id: normalizedPetId };
                currentSeerInfoUrl = `https://wiki.biligame.com/seer/${encodeURI(`精灵:${normalizedPetId}`)}`;
                seerLookupMoreInfoButton.hidden = false;
                renderSeerPetInfoIdentity(currentSeerPetData, null);
                openSeerPetInfoModal(opener);
            },
            openExternalLink: (url) => openSeerExternalLinkModal(url),
            browseLatestIfEmpty: () => {
                if (!seerLookupIdInput.value.trim()) {
                    if (seerLookupMode === "pet" && seerPetSearchMethod === "type") {
                        void startSeerPetTypeFilter(++seerLookupRequestId);
                    } else {
                        void startLatestSeerBrowse(++seerLookupRequestId);
                    }
                }
            }
        };

        return lookupInstance;

}
