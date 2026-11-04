import { loadSkinImage, cancelSkinImage, hasSkinImageLoad } from "./lookup/skin-image.js";
import { createPetResultButton } from "./lookup/pet-result.js";
import { createLookupBrowseController } from "./lookup/browse-controller.js";
import { createLookupDialogs } from "./lookup/dialogs.js";
import { typeIconUrl, skinCategoryIconUrl } from "./shared/assets.js";
import { getSeerServerSettings } from "./seer-server-settings.js";
import { bindTaiwanProgressToggle } from "./shared/taiwan-progress-toggle.js";
import { matchesTaiwanPetProgress, matchesTaiwanSkinProgress } from "./shared/taiwan-availability.js";
import { SEER_TYPE_DATA } from "./seer-type-data.js";
import { getRelatedTypeOptions } from "./shared/type-options.js";
import { getSharedLookupRepository } from "./lookup/repository.js";
import { createPetInfoView } from "./lookup/pet-info-view.js";
import { createSoulmarkImageResolver } from "./lookup/wiki.js";
import { hasPetTypeFilter, matchesPetTypeFilter, matchesPetSearchQuery } from "./lookup/pet-filters.js";
import { initSortPicker } from "./lookup/sort-picker.js";

let lookupInstance;
export function initSeerLookup(dependencies) {
    if (lookupInstance) return lookupInstance;

    const openTypeLookup = dependencies.openTypeLookup || null;

    const seerLookupForm = document.getElementById("seer-lookup-form");
    const seerLookupSection = document.getElementById("seer-lookup-section");
    const seerLookupIllustration = document.getElementById("seer-lookup-illustration");
    const seerPetBackToResults = document.getElementById("seer-pet-back-to-results");
    const seerPetBrowseLatest = document.getElementById("seer-pet-browse-latest");
    const seerLookupIdInput = document.getElementById("seer-lookup-id");
    const seerTaiwanProgressOnly = document.getElementById("seer-taiwan-progress-only");
    const seerLookupTitle = document.getElementById("seer-lookup-title");
    const seerLookupDescription = document.getElementById("seer-lookup-description");
    const seerLookupInputLabel = document.getElementById("seer-lookup-input-label");
    const seerSkinSearchTabs = document.getElementById("seer-skin-search-tabs");
    const seerSkinSearchModeTabs = Array.from(document.querySelectorAll(".seer-skin-search-tab"));
    const seerSkinCategoryFilter = document.getElementById("seer-skin-category-filter");
    const seerSkinCategoryOptions = document.getElementById("seer-skin-category-options");
    const seerPetClearType = document.getElementById("seer-pet-clear-type");
    const seerPetResultsControls = document.getElementById("seer-pet-results-controls");
    const seerPetSearchToolbar = document.getElementById("seer-pet-search-toolbar");
    const seerPetSortLabel = document.getElementById("seer-pet-sort-label");
    const seerPetSort = document.getElementById("seer-pet-sort");
    initSortPicker(seerPetSort);
    const seerTaiwanFilterLabel = document.querySelector(".seer-taiwan-progress-filter");
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
    const seerPetTypeCurrentIcon = document.getElementById("seer-pet-type-current-icon");
    const seerPetTypeCurrentName = document.getElementById("seer-pet-type-current-name");
    const seerLookupMessage = document.getElementById("seer-lookup-message");
    const seerLookupResults = document.getElementById("seer-lookup-results");
    const seerLookupPreview = document.getElementById("seer-lookup-preview");
    const seerLookupAvatar = document.getElementById("seer-lookup-avatar");
    const seerLookupName = document.getElementById("seer-lookup-name");
    const seerSkinIdentity = document.createElement("div");
    seerSkinIdentity.className = "seer-skin-identity";
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

    const seerPetInfoRetry = document.getElementById("seer-pet-info-retry");
    const seerRelatedSkinsModal = document.getElementById("seer-related-skins-modal");

    const seerExternalLinkModal = document.getElementById("seer-external-link-modal");

    let seerLookupDebounceTimer = null;
    let seerLookupRequestId = 0;

    let isSeerLookupComposing = false;
    let seerLookupMode = "pet";
    let seerSkinSearchMode = "skin";
    let seerPetTypeCategory = "all";
    let selectedSeerPetTypeId = null;
    let selectedSeerSkinCategoryId = null;
    let seerTaiwanOnlyEnabled = false;
    let seerTaiwanSettingsPromise = null;
    let currentSeerPetId = null;
    let currentSeerPetData = null;
    let seerPetInfoRequestId = 0;
    // Shared dialogs must never overwrite the catalog's selection or search state.
    let dialogPetId = null;
    let dialogPetData = null;
    let dialogInfoUrl = null;
    let petPreviewOpener = null;
    let petListPageScroll = 0;
    let petPreviewRequestId = 0;

    let currentSeerInfoUrl = null;
    let currentSeerSkinImageFallback = null;

    let seerPetTypeModalOpener = null;
    let seerPetTypePointerStartedOnBackdrop = false;
    const seerSkinThumbnailFallbackCache = new Map();
    let seerSkinCategoriesPromise = null;

    const { activateTab, convertToTraditionalChinese, convertToSimplifiedChinese, fetchSeerJson } = dependencies;

    const { fetchSeerElementTypeCombinations, fetchSeerPetCatalog, fetchSeerSkinCatalog, fetchSeerSkinEntries, fetchSeerPetDetails, fetchSeerPetsByName, fetchSeerElementTypeDetails, fetchSeerPetInfo, fetchSeerPetRelatedRecords, getElementTypeCombinations, getCachedElementTypeDetails } = getSharedLookupRepository(dependencies);
    const resolveSeerWikiSoulmarkImage = createSoulmarkImageResolver(fetchSeerJson);
    const { startLatestSeerBrowse, startSeerPetTypeFilter, sortSeerPetResults, loadMoreSeerPetTypeFilterResults, loadMoreSeerBrowseResults, updateSeerBrowseLoadingProgress, loadSeerBrowsePage, updateSeerBrowseSentinel, clearSeerBrowseSentinel, getBrowseState, resetBrowseState } = createLookupBrowseController({
        seerLookupResults,
        seerLookupIdInput,
        resetSeerPetInfo: (...args) => resetSeerPetInfo(...args),
        seerLookupMessage,
        seerLookupPreview,
        getTaiwanProgressSettings: (...args) => getTaiwanProgressSettings(...args),
        fetchSeerJson: (...args) => fetchSeerJson(...args),
        getPetSearchMethod: () => "type",
        getPetSearchQuery: () => seerLookupIdInput.value,
        getPetSortOrder: () => seerPetSort.value,
        fetchSeerElementTypeCombinations: (...args) => fetchSeerElementTypeCombinations(...args),
        convertToTraditionalChinese: (...args) => convertToTraditionalChinese(...args),
        convertToSimplifiedChinese: (...args) => convertToSimplifiedChinese(...args),
        renderSeerPetTypeOptions: (...args) => renderSeerPetTypeOptions(...args),
        fetchSeerPetCatalog: (...args) => fetchSeerPetCatalog(...args),
        fetchSeerSkinEntries: (...args) => fetchSeerSkinEntries(...args),
        getPetTypeCategory: () => seerPetTypeCategory,
        matchesTaiwanPetProgress: (...args) => matchesTaiwanPetProgress(...args),
        renderSeerPetSearchResults: (...args) => renderSeerPetSearchResults(...args),
        matchesSelectedSkinCategory: (...args) => matchesSelectedSkinCategory(...args),
        loadSeerSkinEntry: (...args) => loadSeerSkinEntry(...args),
        matchesTaiwanSkinProgress: (...args) => matchesTaiwanSkinProgress(...args),
        renderSeerSkinSearchResults: (...args) => renderSeerSkinSearchResults(...args),
        loadSeerPetSearchTypeDetails: (...args) => loadSeerPetSearchTypeDetails(...args),
        getLookupRequestId: () => seerLookupRequestId,
        getLookupMode: () => seerLookupMode,
        getSkinSearchMode: () => seerSkinSearchMode,
        getSelectedPetTypeId: () => selectedSeerPetTypeId,
        getSelectedSkinCategoryId: () => selectedSeerSkinCategoryId,
        getTaiwanOnlyEnabled: () => seerTaiwanOnlyEnabled
    });

    const { openSeerRelatedSkinsModal, loadSeerRelatedSkins, renderSeerRelatedSkins, openSeerPetInfoModal, closeSeerPetInfoModal, closeSeerRelatedSkinsModal, openSeerExternalLinkModal, closeSeerExternalLinkModal } = createLookupDialogs({
        seerRelatedSkinsModal,
        updateSeerModalScrollLock: (...args) => updateSeerModalScrollLock(...args),
        getTaiwanProgressSettings: (...args) => getTaiwanProgressSettings(...args),
        fetchSeerSkinCatalog: (...args) => fetchSeerSkinCatalog(...args),
        matchesTaiwanSkinProgress: (...args) => matchesTaiwanSkinProgress(...args),
        loadSeerSkinEntry: (...args) => loadSeerSkinEntry(...args),
        getSeerSkinImageResourceId: (...args) => getSeerSkinImageResourceId(...args),
        convertToTraditionalChinese: (...args) => convertToTraditionalChinese(...args),
        findSeerPetForSkinThumbnailFallback: (...args) => findSeerPetForSkinThumbnailFallback(...args),
        skinCategoryIconUrl: (...args) => skinCategoryIconUrl(...args),
        openSeerSkinInSearch: (...args) => openSeerSkinInSearch(...args),
        seerPetInfoModal,
        loadSeerPetInfo: (...args) => loadSeerPetInfo(...args),
        seerExternalLinkModal,
        seerPetInfoRetry,
        getCurrentPetId: () => dialogPetId,
        getCurrentPetData: () => dialogPetData,
        getCurrentInfoUrl: () => dialogInfoUrl,
        getTaiwanOnlyEnabled: () => seerTaiwanOnlyEnabled
    });

    const { renderSeerPetInfo, renderSeerPetInfoIdentity } = createPetInfoView({ seerPetInfoPanel, seerPetInfoTitle, seerPetInfoAvatar, seerPetInfoMeta, convertToTraditionalChinese, openTypeLookup, closeSeerPetInfoModal: (...args) => closeSeerPetInfoModal(...args), resolveSeerWikiSoulmarkImage });

    function setSeerLookupMode(mode) {
        if (mode !== "pet" && mode !== "skin") return;
        if (seerLookupMode === mode) return;
        seerLookupMode = mode;
        seerLookupIdInput.value = "";
        invalidateSeerPetLookup();
        updateSeerPetFilterUi();
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

    function updateSeerPetFilterUi() {
        const isPetMode = seerLookupMode === "pet";
        seerLookupSection.dataset.lookupMode = seerLookupMode;
        seerLookupSection.classList.add("panel");
        seerPetBackToResults.hidden = false;
        seerLookupIllustration.prepend(seerLookupPreview);
        seerLookupPreview.querySelector(".seer-pet-meta").append(seerLookupSkinCategoryIcon);
        const previewContent = seerLookupPreview.querySelector(".seer-pet-preview-content");
        const previewMeta = seerLookupPreview.querySelector(".seer-pet-meta");
        if (isPetMode) {
            previewContent.prepend(seerLookupName);
            previewMeta.prepend(seerLookupIdResult);
            seerSkinIdentity.remove();
        } else {
            previewContent.prepend(seerSkinIdentity);
            seerSkinIdentity.append(seerLookupSkinCategoryIcon, seerLookupName, seerLookupIdResult);
        }
        seerPetSearchToolbar.prepend(seerLookupForm);
        seerPetSearchToolbar.append(seerPetSortLabel);
        seerLookupForm.hidden = false;
        seerPetTypeFilter.hidden = !isPetMode;
        if (isPetMode) seerPetTypeFilter.append(seerTaiwanFilterLabel);
        else seerPetSearchToolbar.append(seerTaiwanFilterLabel);
        seerTaiwanFilterLabel.querySelector(".seer-taiwan-progress-filter-copy > span").textContent = "僅台服進度";
        const emptyArt = seerLookupIllustration.querySelector(".seer-pet-illustration-empty");
        emptyArt.replaceChildren(document.createTextNode(isPetMode ? "從清單選擇精靈" : "從清單選擇皮膚"), document.createElement("br"));
        const emptyHint = document.createElement("span");
        emptyHint.textContent = isPetMode ? "查看立繪與完整精靈資訊" : "查看立繪與綁定精靈資訊";
        emptyArt.append(emptyHint);
        seerPetClearType.hidden = !isPetMode || !petTypeFilterActive();
        updatePetResultsControls();
        if (seerLookupMode === "pet") {
            seerLookupDescription.textContent = "搜尋精靈名稱或編號，也可搭配屬性篩選。";
        }
        updateSeerPetTypeCurrentDisplay();
        seerPetTypeCategoryButtons.forEach((button) => {
            const isActive = selectedSeerPetTypeId === null && button.dataset.petTypeCategory === seerPetTypeCategory;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function petTypeFilterActive() {
        return hasPetTypeFilter({ category: seerPetTypeCategory, typeId: selectedSeerPetTypeId });
    }

    function updatePetResultsControls() {
        seerPetResultsControls.hidden = seerLookupMode !== "pet";
        seerPetSortLabel.hidden = seerLookupMode !== "pet" || seerLookupSection.dataset.petPresentation === "direct";
    }

    function setSeerPetTypeCategory(category) {
        if (!["all", "single", "double"].includes(category) || (seerPetTypeCategory === category && selectedSeerPetTypeId === null)) return;
        seerPetTypeCategory = category;
        selectedSeerPetTypeId = null;
        updateSeerPetFilterUi();
        renderSeerPetTypeOptions();
        updateSeerPetTypeCurrentDisplay();
        refreshCurrentSeerLookup();
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
            if (seerLookupMode === "pet") void startSeerPetTypeFilter(seerLookupRequestId);
            else void startLatestSeerBrowse(seerLookupRequestId);
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

    function refreshCurrentSeerLookup() {
        invalidateSeerPetLookup();
        updateSeerPetFilterUi();
        if (!seerLookupIdInput.value.trim() || (seerLookupMode === "skin" && seerSkinSearchMode === "category")) {
            if (seerLookupMode === "pet") void startSeerPetTypeFilter(seerLookupRequestId);
            else void startLatestSeerBrowse(seerLookupRequestId);
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
        resetBrowseState();
        clearSeerBrowseSentinel();
        clearSeerLookupResult();
    }

    function startSeerPetLookup(query, openInfoWhenLoaded = false, infoModalOpener = null, revealPreview = false) {
        if (!query) {
            scheduleSeerPetLookup();
            return;
        }
        if (seerLookupDebounceTimer !== null) {
            window.clearTimeout(seerLookupDebounceTimer);
            seerLookupDebounceTimer = null;
        }
        resetBrowseState();
        clearSeerBrowseSentinel();
        resetSeerPetInfo();
        const requestId = ++seerLookupRequestId;
        if (seerLookupMode === "pet" && !/^\d+$/.test(query)) {
            void startSeerPetTypeFilter(requestId);
            return;
        }
        void lookupSeerPet(query, requestId).then(() => {
            if (revealPreview && requestId === seerLookupRequestId && currentSeerPetData && seerLookupMode === "pet") revealMobilePetPreview();
            if (openInfoWhenLoaded && requestId === seerLookupRequestId && currentSeerPetData) {
                showSeerPetInfo(currentSeerPetData, infoModalOpener);
            }
        });
    }

    function revealMobilePetPreview() {
        if (!window.matchMedia("(max-width: 900px)").matches) return;
        const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
        const top = seerLookupIllustration.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
        seerPetBackToResults.focus({ preventScroll: true });
        window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
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

    async function lookupSeerPet(query, requestId) {
        if (requestId !== seerLookupRequestId) return;
        if (seerLookupMode === "skin") {
            await lookupSeerSkin(query, requestId);
            return;
        }
        const isDirectLookup = /^\d+$/.test(query);
        seerLookupSection.dataset.petPresentation = isDirectLookup ? "direct" : "browse";
        updatePetResultsControls();
        seerPetBackToResults.textContent = isDirectLookup ? "‹ 瀏覽最新精靈" : "‹ 返回清單";
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
                const combinations = petTypeFilterActive() ? await fetchSeerElementTypeCombinations() : [];
                if (requestId !== seerLookupRequestId) return;
                const typeMatches = matchesPetTypeFilter(pet, { category: seerPetTypeCategory, typeId: selectedSeerPetTypeId }, combinations);
                if (!matchesTaiwanPetProgress(pet, settings) || !typeMatches) {
                    seerLookupMessage.textContent = !typeMatches
                        ? "此編號精靈不符合目前的屬性篩選，可按屬性旁的 × 清除條件。"
                        : "此精靈不符合台服進度或未實裝排除設定，取消勾選「僅台服進度」即可查看。";
                    return;
                }
                await renderSeerPetPreview(pet, requestId);
                if (requestId === seerLookupRequestId) {
                    seerLookupMessage.textContent = "找到 1 隻精靈";
                    seerPetBrowseLatest.hidden = false;
                }
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
        cancelSkinImage(seerLookupAvatar);
        cancelSkinImage(seerLookupIllustrationImage);
        currentSeerSkinImageFallback = null;
        currentSeerPetData = null;
        seerLookupSection.dataset.petView = "list";
        seerLookupSection.dataset.petPresentation = "browse";
        updatePetResultsControls();
        seerPetBrowseLatest.hidden = true;
        seerPetBackToResults.textContent = "‹ 返回清單";
        seerLookupIllustrationImage.hidden = true;
        seerLookupSkinCategoryIcon.hidden = true;
        seerLookupSkinCategoryIcon.removeAttribute("src");
        seerLookupIllustrationCategoryIcon.hidden = true;
        seerLookupIllustrationCategoryIcon.removeAttribute("src");
        seerLookupIllustrationTitle.textContent = seerLookupMode === "pet" ? "立繪預覽" : "皮膚立繪預覽";
        seerLookupIllustrationDescription.textContent = seerLookupMode === "pet"
            ? "從清單選擇精靈，查看立繪與完整資訊。"
            : "先搜尋並選擇皮膚，即可在此查看立繪。";
        seerPetInfoToggle.hidden = true;
        seerPetInfoToggle.disabled = false;
        seerPetInfoToggle.textContent = "精靈資訊";
    }

    function showSeerPetInfo(pet, opener = document.activeElement) {
        const id = String(pet?.id || "");
        if (!/^[1-9][0-9]{0,9}$/.test(id) || !seerPetInfoModal.hidden) return;
        dialogPetId = id;
        dialogPetData = pet;
        dialogInfoUrl = `https://wiki.biligame.com/seer/${encodeURI(`精灵:${id}`)}`;
        seerPetInfoRequestId += 1;
        seerPetInfoRetry.hidden = true;
        seerLookupMoreInfoButton.hidden = false;
        renderSeerPetInfoIdentity(pet, null);
        openSeerPetInfoModal(opener);
    }

    async function lookupSeerSkin(query, requestId) {
        const isDirectLookup = seerSkinSearchMode === "skin" && /^\d+$/.test(query);
        seerLookupSection.dataset.petPresentation = isDirectLookup ? "direct" : "browse";
        seerPetBackToResults.textContent = isDirectLookup ? "‹ 瀏覽最新皮膚" : "‹ 返回清單";
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
                const entry = (await fetchSeerSkinEntries()).find(item => Number(item.skin.id) === skinId);
                if (!entry) throw new Error("找不到此編號的皮膚。");
                if (requestId !== seerLookupRequestId) return;
                const settings = await getTaiwanProgressSettings();
                if (requestId !== seerLookupRequestId) return;
                if (!matchesTaiwanSkinProgress(entry.skin, entry.pet, settings)) {
                    seerLookupMessage.textContent = "此皮膚或所屬精靈不符合台服進度或未實裝排除設定，已依篩選設定隱藏。";
                    return;
                }
                await renderSeerSkinPreview(entry, requestId);
                if (requestId === seerLookupRequestId) {
                    seerLookupMessage.textContent = "找到 1 款皮膚";
                    revealMobilePetPreview();
                }
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
        seerLookupMessage.textContent = "正在查詢綁定皮膚…";
        try {
            const numeric = /^\d+$/.test(query);
            const petId = Number(query);
            if (numeric && (!Number.isSafeInteger(petId) || petId < 1)) {
                throw new Error("請輸入有效的綁定精靈 ID 或名稱。");
            }
            const catalog = await fetchSeerSkinEntries();
            const settings = await getTaiwanProgressSettings();
            if (requestId !== seerLookupRequestId) return;
            const entries = catalog.filter(({ skin, pet }) =>
                (numeric ? Number(pet.id) === petId : matchesPetSearchQuery(pet, query, convertToSimplifiedChinese))
                && matchesTaiwanSkinProgress(skin, pet, settings)
            ).sort((a, b) => Number(b.skin.id) - Number(a.skin.id));
            renderSeerSkinSearchResults(entries);
            seerLookupResults.hidden = !entries.length;
            seerLookupMessage.textContent = entries.length
                ? `找到 ${entries.length} 款綁定皮膚。`
                : "找不到符合查詢與目前進度條件的綁定皮膚。";
        } catch (error) {
            if (requestId !== seerLookupRequestId) return;
            console.error("Seer skins by pet lookup error:", error);
            seerLookupMessage.textContent = `查詢失敗：${error.message}`;
        }
    }

    async function searchSeerSkinsByName(query, requestId) {
        await startLatestSeerBrowse(requestId);
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
        const entry = (await fetchSeerSkinEntries()).find(item => Number(item.skin.id) === Number(skinId));
        if (!entry) throw new Error("找不到此編號的皮膚。");
        return entry;
    }

    async function searchSeerPetsByName(query, requestId) {
        const { pets, responses } = await fetchSeerPetsByName(query);
        if (requestId !== seerLookupRequestId) return;
        const settings = await getTaiwanProgressSettings();
        if (requestId !== seerLookupRequestId) return;
        const visiblePets = pets.filter((pet) => matchesTaiwanPetProgress(pet, settings));

        if (visiblePets.length === 0) {
            seerLookupMessage.textContent = seerTaiwanOnlyEnabled && pets.length > 0
                ? "符合名稱的精靈皆不符合台服進度或未實裝排除設定。"
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
            const button = createPetResultButton(pet, typeDetailsById, convertToTraditionalChinese);
            const selected = String(pet.id) === String(currentSeerPetData?.id);
            button.setAttribute("aria-pressed", String(selected));
            button.classList.toggle("is-selected", selected);
            button.addEventListener("click", async () => {
                const previewRequestId = ++petPreviewRequestId;
                petPreviewOpener = button;
                petListPageScroll = window.scrollY;
                // Selecting a result must not invalidate filtered pagination.
                const requestId = seerLookupRequestId;
                const resultButtons = seerLookupResults.querySelectorAll(".seer-lookup-result");
                resultButtons.forEach((result) => {
                    result.disabled = true;
                    result.classList.toggle("is-selected", result === button);
                    result.setAttribute("aria-pressed", String(result === button));
                });
                resetSeerPetInfo();
                seerLookupPreview.hidden = true;
                try {
                    await renderSeerPetPreview(pet, requestId, previewRequestId);
                    if (requestId === seerLookupRequestId && previewRequestId === petPreviewRequestId) {
                        revealMobilePetPreview();
                    }
                } catch (error) {
                    if (requestId !== seerLookupRequestId || previewRequestId !== petPreviewRequestId) return;
                    console.error("Load searched Seer pet error:", error);
                    seerLookupMessage.textContent = `載入失敗：${error.message}`;
                }
                if (requestId === seerLookupRequestId && previewRequestId === petPreviewRequestId) {
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
            thumbnail.alt = `${convertToTraditionalChinese(skin.name || "皮膚")}縮圖`;
            thumbnail.loading = "lazy";
            loadSkinImage(thumbnail, `https://newseer.61.com/web/monster/head/${encodeURIComponent(resourceId)}.png`, {
                fallback: async () => {
                    const fallbackPet = await findSeerPetForSkinThumbnailFallback(skin, pet);
                    return fallbackPet?.id ? `https://newseer.61.com/web/monster/head/${encodeURIComponent(fallbackPet.id)}.png` : null;
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
            petName.textContent = `綁定精靈：${pet.name ? convertToTraditionalChinese(pet.name) : `#${pet.id}`}`;
            details.append(name, petName);
            content.append(visual, details);
            const id = document.createElement("span");
            id.className = "seer-lookup-result-id";
            id.textContent = `#${skin.id}`;
            button.append(content, id);
            button.addEventListener("click", async () => {
                petPreviewOpener = button;
                petListPageScroll = window.scrollY;
                const isBrowsing = getBrowseState()
                    && getBrowseState().requestId === seerLookupRequestId
                    && (getBrowseState().resource === "pet_skin" || !seerLookupIdInput.value.trim());
                if (!isBrowsing) {
                    resetBrowseState();
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
                    if (requestId === seerLookupRequestId) {
                        petName.textContent = `綁定精靈：${convertToTraditionalChinese(currentSeerPetData.name)}`;
                        seerLookupMessage.textContent = `共 ${resultButtons.length} 款皮膚`;
                        revealMobilePetPreview();
                    }
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

    async function renderSeerPetPreview(pet, requestId, previewRequestId = null) {
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
        if (requestId !== seerLookupRequestId || (previewRequestId !== null && previewRequestId !== petPreviewRequestId)) return;

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
        seerLookupSkinMoreInfoButton.hidden = true;
        seerLookupPetSkinsButton.hidden = false;
        seerLookupIllustrationTitle.textContent = "立繪預覽";
        seerLookupIllustrationDescription.textContent = "已選擇精靈，可在此查看立繪。";
        currentSeerInfoUrl = `https://wiki.biligame.com/seer/${encodeURI(`精灵:${petId}`)}`;
        currentSeerPetId = String(petId);
        seerLookupIllustrationImage.hidden = false;
        seerLookupPreview.hidden = false;
        currentSeerPetData = pet;
        seerLookupSection.dataset.petView = "preview";
        seerPetInfoToggle.hidden = false;
        seerPetInfoToggle.disabled = false;
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
            if (requestId !== seerPetInfoRequestId || petId !== dialogPetId) return;
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
            if (requestId !== seerPetInfoRequestId || petId !== dialogPetId) return;
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
            if (requestId !== seerPetInfoRequestId || petId !== dialogPetId) return;
            const activationItemsById = new Map(activationItems
                .filter(({ record }) => record && record.id !== undefined && record.id !== null)
                .map(({ record }) => [String(record.id), record]));
            dialogPetData = details;
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
            if (requestId !== seerPetInfoRequestId || petId !== dialogPetId) return;
            console.error(`Load Seer pet info ${petId} error:`, error);
            seerPetInfoPanel.replaceChildren();
            const message = document.createElement("p");
            message.className = "seer-pet-info-message";
            message.textContent = `精靈資料載入失敗：${error.message}`;
            seerPetInfoPanel.append(message);
            seerPetInfoRetry.hidden = false;
        }
    }

    async function renderSeerSkinPreview(entry, requestId) {
        const { skin } = entry;
        const pet = entry.pet?.name && entry.pet?.type?.id
            ? entry.pet : await fetchSeerPetDetails(skin.pet.id);
        if (requestId !== seerLookupRequestId) return;
        entry.pet = pet;
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
            linkedPetId: String(petId)
        };
        const imageResourceId = getSeerSkinImageResourceId(skin);
        loadSeerSkinPreviewImage(seerLookupAvatar, "head", imageResourceId);
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
        loadSeerSkinPreviewImage(seerLookupIllustrationImage, "body", imageResourceId);
        seerLookupIllustrationImage.alt = `${skinName}立繪`;
        seerLookupSkinMoreInfoButton.hidden = false;
        seerLookupPetSkinsButton.hidden = true;
        seerLookupIllustrationTitle.textContent = "皮膚立繪預覽";
        seerLookupIllustrationDescription.textContent = `綁定精靈：${petName}`;
        currentSeerInfoUrl = `https://wiki.biligame.com/seer/${encodeURI(`皮肤:${getSeerSkinResourceId(skin)}`)}`;
        currentSeerPetId = String(petId);
        currentSeerPetData = pet;
        seerPetInfoToggle.textContent = "綁定精靈資訊";
        seerPetInfoToggle.hidden = false;
        seerLookupSection.dataset.petView = "preview";
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

    function loadSeerSkinPreviewImage(image, part, resourceId) {
        const context = currentSeerSkinImageFallback;
        loadSkinImage(image, `https://newseer.61.com/web/monster/${part}/${encodeURIComponent(resourceId)}.png`, {
            isCurrent: () => context === currentSeerSkinImageFallback && context.requestId === seerLookupRequestId,
            fallback: async () => {
                const pet = await findSeerPetForSkinThumbnailFallback(
                    { name: context.skinName }, { id: context.linkedPetId }
                );
                return pet?.id ? `https://newseer.61.com/web/monster/${part}/${encodeURIComponent(pet.id)}.png` : null;
            }
        });
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

    function updateSeerModalScrollLock() {
        document.body.classList.toggle(
            "has-admin-confirm-modal",
            !seerPetInfoModal.hidden || !seerExternalLinkModal.hidden || !seerRelatedSkinsModal.hidden || !seerPetTypeModal.hidden
        );
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
            seerPetTypeCurrentName.textContent = seerPetTypeCategory === "all" ? "全部屬性"
                : seerPetTypeCategory === "double" ? "全部雙屬性" : "全部單屬性";
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

    seerLookupAvatar.addEventListener("error", () => {
        if (!hasSkinImageLoad(seerLookupAvatar)) seerLookupAvatar.hidden = true;
    });

    seerLookupIllustrationImage.addEventListener("error", () => {
        if (!hasSkinImageLoad(seerLookupIllustrationImage)) seerLookupIllustrationImage.hidden = true;
    });

    updateSeerPetFilterUi();

    seerLookupForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (seerLookupMode === "skin" && seerSkinSearchMode === "category") {
            void startLatestSeerBrowse(++seerLookupRequestId);
            return;
        }
        startSeerPetLookup(seerLookupIdInput.value.trim(), false, null, true);
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
        updateSeerPetFilterUi();
        renderSeerPetTypeOptions();
        updateSeerPetTypeCurrentDisplay();
        refreshCurrentSeerLookup();
    });
    updateSeerPetTypeCurrentDisplay();
    if (seerPetTypeOpenModalButton) {
        seerPetTypeOpenModalButton.addEventListener("click", () => {
            openSeerPetTypeModal(seerPetTypeOpenModalButton);
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
    bindTaiwanProgressToggle(seerTaiwanProgressOnly, enabled => {
        seerTaiwanOnlyEnabled = enabled;
        refreshCurrentSeerLookup();
    });
    seerPetClearType.addEventListener("click", () => {
        seerPetTypeCategory = "all";
        selectedSeerPetTypeId = null;
        renderSeerPetTypeOptions();
        refreshCurrentSeerLookup();
        seerPetTypeOpenModalButton.focus({ preventScroll: true });
    });
    seerPetSort.addEventListener("change", () => {
        if (!sortSeerPetResults(seerLookupRequestId)) refreshCurrentSeerLookup();
    });
    seerLookupMoreInfoButton.addEventListener("click", () => {
        openSeerExternalLinkModal();
    });
    seerLookupSkinMoreInfoButton.addEventListener("click", () => {
        openSeerExternalLinkModal(currentSeerInfoUrl);
    });
    seerLookupPetSkinsButton.addEventListener("click", openSeerSkinSearchForCurrentPet);
    seerPetInfoSkinsButton.addEventListener("click", openSeerRelatedSkinsModal);

    seerPetInfoToggle.addEventListener("click", () => {
        showSeerPetInfo(currentSeerPetData);
    });

    seerPetBackToResults.addEventListener("click", () => {
        if (seerLookupSection.dataset.petPresentation === "direct") {
            if (seerLookupMode === "skin") {
                seerLookupIdInput.value = "";
                scheduleSeerPetLookup();
                return;
            }
            browseLatestPets();
            return;
        }
        seerLookupSection.dataset.petView = "list";
        if (petPreviewOpener?.isConnected) petPreviewOpener.focus({ preventScroll: true });
        else seerLookupIdInput.focus({ preventScroll: true });
        window.scrollTo({ top: petListPageScroll, behavior: "instant" });
    });

    function browseLatestPets() {
        seerLookupIdInput.value = "";
        scheduleSeerPetLookup();
        seerLookupIdInput.focus({ preventScroll: true });
    }
    seerPetBrowseLatest.addEventListener("click", browseLatestPets);

    lookupInstance = {
        setMode: setSeerLookupMode,
        getMode: () => seerLookupMode,
        searchPetById: (petId) => {
            const id = String(petId || '').trim();
            if (!/^[1-9][0-9]{0,9}$/.test(id)) return;
            setSeerLookupMode('pet');
            seerLookupIdInput.value = id;
            startSeerPetLookup(id);
        },
        searchSkinById: (skinId) => {
            const id = String(skinId || '').trim();
            if (!/^[1-9][0-9]{0,9}$/.test(id)) return;
            setSeerLookupMode('skin');
            setSeerSkinSearchMode('skin');
            seerLookupIdInput.value = id;
            startSeerPetLookup(id);
        },
        openPetInfo: (petId) => {
            const normalizedPetId = String(petId || "").trim();
            showSeerPetInfo({ id: normalizedPetId });
        },
        openExternalLink: (url) => openSeerExternalLinkModal(url),
        browseLatestIfEmpty: () => {
            if (seerLookupResults.childElementCount || !seerLookupPreview.hidden) return;
            if (!seerLookupIdInput.value.trim()) {
                if (seerLookupMode === "pet") {
                    void startSeerPetTypeFilter(++seerLookupRequestId);
                } else {
                    void startLatestSeerBrowse(++seerLookupRequestId);
                }
            }
        }
    };

    return lookupInstance;
}
