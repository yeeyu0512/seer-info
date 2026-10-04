import { Converter } from "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/esm/full.js";
import { login, logout, getSession, register } from "./auth.js";
import { supabaseClient } from "./supabase.js";
import { getActivePool, getPoolCharacters } from "./pool.js";
import { getMyVote, hasVoted, submitVote } from "./vote.js";
import { getPoolRanking } from "./ranking.js";
import { isAdmin } from "./admin.js";
import { bindGameAccount, getMyGameAccount } from "./game-account.js";
import { getCurrentCompetitivePool } from "./competitive-pool.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");
const authTitle = document.getElementById("auth-title");
const authDescription = document.getElementById("auth-description");
const passwordConfirmGroup = document.getElementById("password-confirm-group");
const passwordConfirmInput = document.getElementById("password-confirm");
const mimiIdGroup = document.getElementById("mimi-id-group");
const mimiIdInput = document.getElementById("mimi-id");
const registerButton = document.getElementById("register-button");
const authModeToggle = document.getElementById("auth-mode-toggle");
const loginModal = document.getElementById("login-modal");
const loginTrigger = document.getElementById("login-trigger");
const loginClose = document.getElementById("login-close");
const publicLoginPrompt = document.getElementById("public-login-prompt");
const publicLoginButton = document.getElementById("public-login-button");
const mimiBindingPrompt = document.getElementById("mimi-binding-prompt");
const mimiBindingButton = document.getElementById("mimi-binding-button");
const voteSection = document.getElementById("vote-section");
const selectionPanel = document.getElementById("selection-panel");
const selectionBar = document.getElementById("selection-bar");
const submitButton = document.getElementById("submit-button");
const voteMessage = document.getElementById("vote-message");
const logoutButton = document.getElementById("logout-button");
const adminLink = document.getElementById("admin-link");
const characterList = document.getElementById("character-list");
const characterPagination = document.getElementById("character-pagination");
const characterPreviousPageButton = document.getElementById("character-previous-page");
const characterNextPageButton = document.getElementById("character-next-page");
const characterPageLabel = document.getElementById("character-page");
const selectionCount = document.getElementById("selection-count");
const selectionMax = document.getElementById("selection-max");
const alreadyVoted = document.getElementById("already-voted");
const alreadyVotedMessage = document.getElementById("already-voted-message");
const poolStatus = document.getElementById("pool-status");
const accountTab = document.getElementById("account-tab");
const accountSection = document.getElementById("account-section");
const competitivePoolSection = document.getElementById("competitive-pool-section");
const competitivePoolPeriod = document.getElementById("competitive-pool-period");
const competitivePoolMessage = document.getElementById("competitive-pool-message");
const competitivePoolGroups = document.getElementById("competitive-pool-groups");
const competitivePoolTypeTabs = document.getElementById("competitive-pool-type-tabs");
const competitivePoolTypeTabButtons = Array.from(document.querySelectorAll(".competitive-pool-type-tab"));
const refreshCompetitivePoolButton = document.getElementById("refresh-competitive-pool-button");
const rankingPagination = document.getElementById("ranking-pagination");
const rankingPreviousPageButton = document.getElementById("ranking-previous-page");
const rankingNextPageButton = document.getElementById("ranking-next-page");
const rankingPageLabel = document.getElementById("ranking-page");
const seerLookupForm = document.getElementById("seer-lookup-form");
const seerLookupIdInput = document.getElementById("seer-lookup-id");
const seerLookupTitle = document.getElementById("seer-lookup-title");
const seerLookupDescription = document.getElementById("seer-lookup-description");
const seerLookupInputLabel = document.getElementById("seer-lookup-input-label");
const seerSkinSearchTabs = document.getElementById("seer-skin-search-tabs");
const seerSkinSearchModeTabs = Array.from(document.querySelectorAll(".seer-skin-search-tab"));
const seerSkinCategoryFilter = document.getElementById("seer-skin-category-filter");
const seerSkinCategoryOptions = document.getElementById("seer-skin-category-options");
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
const seerLookupPetSkinsButton = document.getElementById("seer-lookup-pet-skins");
const seerExternalLinkModal = document.getElementById("seer-external-link-modal");
const seerExternalLinkCancel = document.getElementById("seer-external-link-cancel");
const seerExternalLinkOpen = document.getElementById("seer-external-link-open");
const gameAccountForm = document.getElementById("game-account-form");
const gameAccountInput = document.getElementById("game-account-input");
const bindGameAccountButton = document.getElementById("bind-game-account-button");
const gameAccountMessage = document.getElementById("game-account-message");
const gameAccountUnbound = document.getElementById("game-account-unbound");
const gameAccountBound = document.getElementById("game-account-bound");
const boundGameAccount = document.getElementById("bound-game-account");
const mainTabs = Array.from(document.querySelectorAll(".main-tab"));
const tabPanels = new Map([
    ["selection-panel", selectionPanel],
    ["ranking-section", document.getElementById("ranking-section")],
    ["competitive-pool-section", competitivePoolSection],
    ["seer-lookup-section", document.getElementById("seer-lookup-section")],
    ["account-section", accountSection]
]);

let currentPool = null;
let rankingTimer = null;
let currentRanking = [];
let currentRankingPage = 1;
let isRegisterMode = false;
let isAuthenticated = false;
let currentCharacters = [];
let currentCharacterPage = 1;
let selectedPoolCharacterIds = new Set();
let isVoteLocked = false;
let hasMiMiBinding = false;
let modalPointerStartedOnBackdrop = false;
const characterTypeIconCache = new Map();
const elementTypeIconCache = new Map();
const elementTypeDetailsCache = new Map();
const seerPetDetailsCache = new Map();
let seerSkinCatalogPromise = null;
let seerSkinCategoriesPromise = null;
const characterTypeIconQueue = [];
const observedTypeIconElements = new Set();
let activeTypeIconRequests = 0;
let seerLookupDebounceTimer = null;
let seerLookupRequestId = 0;
let seerBrowseState = null;
let seerBrowseSentinel = null;
let competitivePoolRequestId = 0;
let currentCompetitivePoolCharacters = [];
let selectedCompetitivePoolType = "banned";
let isSeerLookupComposing = false;
let seerLookupMode = "pet";
let seerSkinSearchMode = "skin";
let selectedSeerSkinCategoryId = null;
let currentSeerPetId = null;
let currentSeerInfoUrl = null;
let currentSeerSkinImageFallback = null;
let externalLinkOpener = null;
let externalLinkPointerStartedOnBackdrop = false;
const TYPE_ICON_REQUEST_LIMIT = 4;
const SEER_BROWSE_PAGE_SIZE = 20;

const seerBrowseObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting && seerBrowseState) {
            void loadMoreSeerBrowseResults(seerBrowseState.requestId);
        }
    });
}, { root: seerLookupResults, rootMargin: "100px" });
const RANKINGS_PER_PAGE = 10;
const CHARACTERS_PER_PAGE = 28;
const s2tConverter = Converter({ from: "cn", to: "tw" });
const t2sConverter = Converter({ from: "tw", to: "cn" });

const typeIconObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        const icon = entry.target;
        icon.dataset.visible = String(entry.isIntersecting);
        if (entry.isIntersecting) {
            loadCharacterTypeIcon(icon.dataset.characterId, icon);
        }
    });
});

loginTrigger.addEventListener("click", openLoginModal);
publicLoginButton.addEventListener("click", openLoginModal);
mimiBindingButton.addEventListener("click", () => activateTab("account-section"));
loginClose.addEventListener("click", closeLoginModal);
loginModal.addEventListener("pointerdown", (event) => {
    modalPointerStartedOnBackdrop = event.target === loginModal;
});
loginModal.addEventListener("click", (event) => {
    if (modalPointerStartedOnBackdrop && event.target === loginModal) closeLoginModal();
    modalPointerStartedOnBackdrop = false;
});

mainTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        if (tab.dataset.lookupMode) setSeerLookupMode(tab.dataset.lookupMode);
        activateTab(tab.dataset.tabTarget);
        if (tab.dataset.tabTarget === "competitive-pool-section") loadCurrentCompetitivePool();
        if (tab.dataset.tabTarget === "seer-lookup-section" && !seerLookupIdInput.value.trim()) {
            void startLatestSeerBrowse(++seerLookupRequestId);
        }
    });
});
refreshCompetitivePoolButton.addEventListener("click", loadCurrentCompetitivePool);
competitivePoolTypeTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectedCompetitivePoolType = button.dataset.poolType;
        updateCompetitivePoolTypeTabs();
        renderCompetitivePoolCharacters();
    });
    button.addEventListener("keydown", (event) => {
        const index = competitivePoolTypeTabButtons.indexOf(button);
        let nextIndex = null;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % competitivePoolTypeTabButtons.length;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + competitivePoolTypeTabButtons.length) % competitivePoolTypeTabButtons.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = competitivePoolTypeTabButtons.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        competitivePoolTypeTabButtons[nextIndex].focus();
        competitivePoolTypeTabButtons[nextIndex].click();
    });
});

rankingPreviousPageButton.addEventListener("click", () => {
    currentRankingPage -= 1;
    renderRanking(currentRanking);
});
rankingNextPageButton.addEventListener("click", () => {
    currentRankingPage += 1;
    renderRanking(currentRanking);
});
characterPreviousPageButton.addEventListener("click", () => {
    currentCharacterPage -= 1;
    renderCurrentCharacterPage();
});
characterNextPageButton.addEventListener("click", () => {
    currentCharacterPage += 1;
    renderCurrentCharacterPage();
});
seerLookupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (seerLookupMode === "skin" && seerSkinSearchMode === "category") {
        void startLatestSeerBrowse(++seerLookupRequestId);
        return;
    }
    startSeerPetLookup(seerLookupIdInput.value.trim());
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
seerLookupMoreInfoButton.addEventListener("click", openSeerExternalLinkModal);
seerLookupPetSkinsButton.addEventListener("click", openSeerSkinSearchForCurrentPet);
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

gameAccountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isAuthenticated) return;

    const gameAccount = gameAccountInput.value.trim();
    if (!/^\d+$/.test(gameAccount)) {
        gameAccountMessage.textContent = "米米號只能輸入數字。";
        return;
    }

    bindGameAccountButton.disabled = true;
    bindGameAccountButton.textContent = "綁定中…";
    gameAccountMessage.textContent = "";

    try {
        const boundAccount = await bindGameAccount(gameAccount);
        renderGameAccount(boundAccount);
        await loadPool();
    } catch (error) {
        console.error("Bind game account error:", error);
        gameAccountMessage.textContent = `綁定失敗：${error.message}`;
    } finally {
        bindGameAccountButton.disabled = false;
        bindGameAccountButton.textContent = "綁定";
    }
});

function activateTab(targetId) {
    tabPanels.forEach((panel, panelId) => {
        panel.hidden = panelId !== targetId;
    });
    mainTabs.forEach((tab) => {
        const isActive = tab.dataset.tabTarget === targetId
            && (!tab.dataset.lookupMode || tab.dataset.lookupMode === seerLookupMode);
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
    });
}

async function loadCurrentCompetitivePool() {
    const requestId = ++competitivePoolRequestId;
    competitivePoolMessage.textContent = "正在載入競技池資料…";
    competitivePoolPeriod.textContent = "";
    competitivePoolTypeTabs.hidden = true;
    competitivePoolGroups.hidden = true;
    competitivePoolGroups.replaceChildren();
    refreshCompetitivePoolButton.disabled = true;

    try {
        const pool = await getCurrentCompetitivePool();
        if (requestId !== competitivePoolRequestId) return;
        if (!pool) {
            currentCompetitivePoolCharacters = [];
            competitivePoolMessage.textContent = "目前沒有進行中的競技池。";
            return;
        }

        competitivePoolPeriod.textContent = `${formatCompetitivePoolDate(pool.start_at)} 至 ${formatCompetitivePoolDate(pool.end_at)}`;
        currentCompetitivePoolCharacters = pool.competitive_pool_characters || [];
        const availableTypes = new Set(currentCompetitivePoolCharacters.map((character) => character.pool_type));
        if (!availableTypes.has(selectedCompetitivePoolType)) {
            selectedCompetitivePoolType = ["banned", "restricted", "semi_restricted"]
                .find((type) => availableTypes.has(type)) || "banned";
        }
        competitivePoolTypeTabs.hidden = false;
        updateCompetitivePoolTypeTabs();
        renderCompetitivePoolCharacters();
        competitivePoolMessage.textContent = pool.name;
        competitivePoolGroups.hidden = false;
        competitivePoolGroups.setAttribute("aria-labelledby", competitivePoolTypeTabButtons
            .find((button) => button.dataset.poolType === selectedCompetitivePoolType)?.id || "");
    } catch (error) {
        if (requestId !== competitivePoolRequestId) return;
        console.error("Load competitive pool error:", error);
        competitivePoolMessage.textContent = "競技池資料載入失敗，請稍後重新整理。";
    } finally {
        if (requestId === competitivePoolRequestId) refreshCompetitivePoolButton.disabled = false;
    }
}

function updateCompetitivePoolTypeTabs() {
    const counts = currentCompetitivePoolCharacters.reduce((result, character) => {
        result[character.pool_type] = (result[character.pool_type] || 0) + 1;
        return result;
    }, {});

    competitivePoolTypeTabButtons.forEach((button) => {
        const isSelected = button.dataset.poolType === selectedCompetitivePoolType;
        button.classList.toggle("is-active", isSelected);
        button.setAttribute("aria-selected", String(isSelected));
        button.tabIndex = isSelected ? 0 : -1;
        button.querySelector("[data-pool-type-count]").textContent = String(counts[button.dataset.poolType] || 0);
    });
    const selectedTab = competitivePoolTypeTabButtons.find((button) => button.dataset.poolType === selectedCompetitivePoolType);
    if (selectedTab) competitivePoolGroups.setAttribute("aria-labelledby", selectedTab.id);
}

function renderCompetitivePoolCharacters() {
    const types = {
        banned: { marker: "⊘", className: "is-banned", title: "禁止池：禁止攜帶" },
        restricted: { marker: "2", className: "is-restricted", title: "限制池：最多攜帶 2 隻" },
        semi_restricted: { marker: "3", className: "is-semi-restricted", title: "準限制池：最多攜帶 3 隻" }
    };
    const type = types[selectedCompetitivePoolType];
    const characters = currentCompetitivePoolCharacters.filter((character) => character.pool_type === selectedCompetitivePoolType);
    clearObservedTypeIcons(competitivePoolGroups);
    competitivePoolGroups.replaceChildren();
    competitivePoolGroups.setAttribute("aria-label", type.title);

    if (characters.length === 0) {
        const empty = document.createElement("p");
        empty.className = "competitive-pool-empty";
        empty.textContent = "此池目前沒有精靈";
        competitivePoolGroups.append(empty);
        return;
    }

    characters.forEach((character) => {
        const item = document.createElement("article");
        const avatar = document.createElement("img");
        const typeIcon = createCharacterTypeIcon(character.seer_pet_id);
        const marker = document.createElement("span");
        const petId = document.createElement("span");
        const petName = document.createElement("strong");

        item.className = `character-card public-character-card competitive-pool-pet ${type.className}`;
        avatar.className = "character-portrait";
        avatar.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(character.seer_pet_id)}.png`;
        avatar.alt = `${character.pet_name} 精靈頭像`;
        avatar.loading = "lazy";
        avatar.addEventListener("error", () => { avatar.classList.add("is-unavailable"); }, { once: true });
        marker.className = `character-check competitive-pool-limit-indicator ${type.className}`;
        marker.textContent = type.marker;
        marker.title = type.title;
        marker.setAttribute("aria-label", type.title);
        marker.setAttribute("role", "img");
        petId.className = "character-id";
        petId.textContent = `#${character.seer_pet_id}`;
        petName.className = "character-name";
        petName.textContent = character.pet_name;
        petName.title = character.pet_name;
        item.append(avatar, typeIcon, marker, petId, petName);
        competitivePoolGroups.append(item);
    });
}

function formatCompetitivePoolDate(value) {
    return new Date(value).toLocaleString("zh-TW", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Taipei"
    });
}

function setSeerLookupMode(mode) {
    if (mode !== "pet" && mode !== "skin") return;
    if (seerLookupMode === mode) return;
    seerLookupMode = mode;
    seerLookupIdInput.value = "";
    invalidateSeerPetLookup();
    const isSkinMode = mode === "skin";
    seerSkinSearchTabs.hidden = !isSkinMode;
    seerSkinCategoryFilter.hidden = !isSkinMode || seerSkinSearchMode !== "skin";
    if (isSkinMode) {
        updateSeerSkinSearchModeUi();
        void loadSeerSkinCategoryOptions();
    } else {
        seerSkinSearchMode = "skin";
        seerLookupInputLabel.hidden = false;
        seerLookupIdInput.parentElement.hidden = false;
        seerLookupIdInput.required = true;
        seerSkinCategoryFilter.hidden = true;
    }
    seerLookupTitle.textContent = isSkinMode ? "皮膚查詢" : "精靈查詢";
    if (!isSkinMode) {
        seerLookupDescription.textContent = "輸入精靈 ID 或中文名稱，可能包含僅陸服存在的項目或顯示錯誤。";
        seerLookupInputLabel.textContent = "精靈 ID／名稱";
        seerLookupIdInput.placeholder = "例如：5000 或 聖靈譜尼";
    }
    seerLookupResults.setAttribute("aria-label", isSkinMode ? "皮膚搜尋結果" : "精靈搜尋結果");
    seerLookupIllustrationTitle.textContent = isSkinMode ? "皮膚立繪預覽" : "立繪預覽";
    seerLookupIllustrationDescription.textContent = isSkinMode
        ? "先搜尋並選擇皮膚，即可在此查看立繪。"
        : "先搜尋並選擇精靈，即可在此查看立繪。";
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
    seerLookupIdInput.parentElement.hidden = isCategoryMode;
    seerLookupIdInput.required = !isCategoryMode;
    seerSkinCategoryFilter.hidden = !isCategoryMode;
    seerLookupInputLabel.textContent = isPetMode ? "綁定精靈 ID／名稱" : "皮膚 ID／名稱";
    seerLookupIdInput.placeholder = isPetMode ? "例如：3506 或 波塞冬" : "例如：241 或 火焰萌王";
    seerLookupDescription.textContent = isPetMode
        ? "輸入綁定精靈 ID 或名稱，列出遊戲中綁定該精靈的皮膚，可能包含僅陸服存在的項目或顯示錯誤。"
        : isCategoryMode
            ? "選擇皮膚種類圖示，即可瀏覽該種類的皮膚。"
            : "輸入皮膚 ID 或名稱，可能包含僅陸服存在的項目或顯示錯誤。";
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
            icon.src = `https://img.yuyuqaq.cn/seer-common/common_pet_skin_icon_${option.id}.png`;
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

function openLoginModal() {
    loginModal.classList.remove("is-closing");
    loginModal.hidden = false;
    emailInput.focus();
}

function closeLoginModal() {
    if (loginModal.hidden || loginModal.classList.contains("is-closing")) return;
    loginModal.classList.add("is-closing");
    loginMessage.textContent = "";
    window.setTimeout(() => {
        loginModal.hidden = true;
        loginModal.classList.remove("is-closing");
    }, 180);
}

loginButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
        loginMessage.textContent = "請輸入 Email 和密碼";
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "登入中…";
    loginMessage.textContent = "正在驗證帳號…";
    try {
        const { data, error } = await login(email, password);
        if (error) throw error;
        console.log("Login success:", data.user);
        showAuthenticatedView();
        await initializeAuthenticatedPage();
    } catch (error) {
        console.error("Login error:", error);
        loginMessage.textContent = getChineseAuthError(error, "login");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "登入";
    }
});

registerButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    const mimiId = mimiIdInput.value.trim();
    if (!email || !password || !passwordConfirm || !mimiId) {
        loginMessage.textContent = "請完整填寫 Email、密碼、確認密碼 與米米號。";
        return;
    }
    if (password !== passwordConfirm) {
        loginMessage.textContent = "兩次輸入的密碼不一致。";
        return;
    }
    if (!/^\d+$/.test(mimiId)) {
        loginMessage.textContent = "米米號只能輸入數字。";
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "建立帳號中…";
    loginMessage.textContent = "正在建立帳號…";
    try {
        const { data, error } = await register(email, password, mimiId);
        if (error) throw error;

        if (data.session) {
            loginMessage.textContent = "帳號建立成功，正在登入…";
            showAuthenticatedView();
            await initializeAuthenticatedPage();
        } else {
            loginMessage.textContent = "帳號建立成功，請前往信箱完成驗證後再登入。";
        }
    } catch (error) {
        console.error("Register error:", error);
        loginMessage.textContent = getChineseAuthError(error, "register");
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "建立帳號";
    }
});

authModeToggle.addEventListener("click", () => {
    setAuthMode(!isRegisterMode);
});

function setAuthMode(registerMode) {
    isRegisterMode = registerMode;
    passwordConfirmGroup.hidden = !isRegisterMode;
    mimiIdGroup.hidden = !isRegisterMode;
    loginButton.hidden = isRegisterMode;
    registerButton.hidden = !isRegisterMode;
    passwordInput.autocomplete = isRegisterMode ? "new-password" : "current-password";
    authTitle.textContent = isRegisterMode ? "建立帳號" : "登入投票";
    authDescription.textContent = isRegisterMode
        ? "建立帳號時須綁定米米號，完成後即可參與投票。"
        : "登入後即可參與本期競技限制投票。";
    authModeToggle.textContent = isRegisterMode
        ? "已有帳號？返回登入"
        : "還沒有帳號？建立帳號";
    loginMessage.textContent = "";
    passwordConfirmInput.value = "";
    mimiIdInput.value = "";
}

function getChineseAuthError(error, action) {
    const message = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "").toLowerCase();

    if (/database error saving new user/.test(message)) {
        return "此米米號已被其他帳號綁定，請確認後使用另一組米米號。";
    }
    if (/invalid login credentials|invalid credentials/.test(message)) {
        return "Email 或密碼錯誤，請重新輸入。";
    }
    if (/email not confirmed|email_not_confirmed/.test(message) || code === "email_not_confirmed") {
        return "Email 尚未完成驗證，請先到信箱點擊驗證連結。";
    }
    if (/user already registered|email.*already.*registered|email_exists/.test(message) || code === "email_exists") {
        return "此 Email 已註冊，請直接登入或使用其他 Email。";
    }
    if (/password.*(least|short|weak)|weak_password/.test(message) || code === "weak_password") {
        return "密碼長度不足或不符合安全規則，請改用更安全的密碼。";
    }
    if (/rate limit|over_email_send_rate_limit|over_request_rate_limit/.test(message) || /rate_limit/.test(code)) {
        return "嘗試次數過於頻繁，請稍後再試。";
    }
    if (/signup.*disabled|signup_disabled/.test(message) || code === "signup_disabled") {
        return "目前暫停開放建立帳號。";
    }
    if (/invalid.*email|email.*invalid/.test(message)) {
        return "Email 格式不正確，請重新輸入。";
    }
    if (/network|fetch/.test(message)) {
        return "網路連線異常，請確認網路後再試。";
    }

    return action === "login"
        ? "登入失敗，請稍後再試。"
        : "建立帳號失敗，請稍後再試。";
}

async function initializeAuthenticatedPage() {
    activateTab("selection-panel");
    selectionPanel.hidden = false;
    selectionBar.hidden = false;
    publicLoginPrompt.hidden = true;
    accountTab.hidden = false;
    await loadGameAccount();
    await loadPool();
    await loadRanking();
    startRankingRefresh();
    await syncAdminLink();
}

async function loadGameAccount() {
    try {
        const gameAccount = await getMyGameAccount();
        renderGameAccount(gameAccount);
    } catch (error) {
        console.error("Load game account error:", error);
        renderGameAccount(null);
        gameAccountMessage.textContent = `讀取遊戲帳號失敗：${error.message}`;
    }
}

function renderGameAccount(gameAccount) {
    const isBound = typeof gameAccount === "string" && gameAccount.length > 0;
    hasMiMiBinding = isBound;
    gameAccountUnbound.hidden = isBound;
    gameAccountBound.hidden = !isBound;
    boundGameAccount.textContent = isBound ? gameAccount : "";
    gameAccountInput.value = "";
    gameAccountMessage.textContent = "";
}

async function loadPool() {
    try {
        // Authenticated state always wins over any earlier public-page render.
        publicLoginPrompt.hidden = true;
        mimiBindingPrompt.hidden = true;
        selectionBar.hidden = false;
        alreadyVoted.hidden = true;
        submitButton.hidden = false;
        submitButton.disabled = false;
        const pool = await getActivePool();
        if (!pool) {
            renderNoActivePool();
            return;
        }
        currentPool = pool;
        renderPoolMeta(pool);

        document.getElementById("vote-rule").textContent = `請剛好選擇 ${pool.max_votes} 個角色後提交。`;
        const characters = await getPoolCharacters(pool.id);
        currentCharacters = sortCharactersByIdDescending(characters);
        currentCharacterPage = 1;
        selectedPoolCharacterIds = new Set();
        isVoteLocked = false;
        renderVoteCharacters(currentCharacters);

        const [voted, savedPoolCharacterIds] = await Promise.all([
            hasVoted(pool.id),
            getMyVote(pool.id)
        ]);

        if (voted) {
            restoreSavedVote(savedPoolCharacterIds);
            document.getElementById("vote-rule").textContent = "你已經完成這個 Pool 的投票。以下是你選擇的角色。";
            submitButton.hidden = true;
            selectionBar.hidden = true;
            alreadyVotedMessage.textContent = "本期投票已成功提交；重新整理後仍可查看你的選擇。";
            alreadyVoted.hidden = false;
            voteMessage.textContent = "";
            return;
        }

        if (!hasMiMiBinding) {
            document.querySelectorAll("#character-list input[type='checkbox']").forEach((checkbox) => {
                checkbox.disabled = true;
            });
            document.getElementById("vote-rule").textContent = "請先綁定米米號，完成後才能選擇角色並提交投票。";
            selectionBar.hidden = true;
            mimiBindingPrompt.hidden = false;
            return;
        }

        updateSelectionCount();
    } catch (error) {
        console.error("Load pool error:", error);
        voteMessage.textContent = `讀取投票失敗：${error.message}`;
    }
}

function renderVoteCharacters(characters) {
    clearObservedTypeIcons(characterList);
    characterList.innerHTML = "";
    updateCharacterPagination(characters.length);
    const start = (currentCharacterPage - 1) * CHARACTERS_PER_PAGE;
    for (const character of characters.slice(start, start + CHARACTERS_PER_PAGE)) {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        label.className = "character-card";
        checkbox.type = "checkbox";
        checkbox.value = character.id;
        checkbox.dataset.characterId = character.character_id;
        checkbox.checked = selectedPoolCharacterIds.has(String(character.id));
        checkbox.disabled = isVoteLocked || !hasMiMiBinding;
        label.classList.toggle("selected", checkbox.checked);
        label.hidden = isVoteLocked && !checkbox.checked;
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) selectedPoolCharacterIds.add(String(character.id));
            else selectedPoolCharacterIds.delete(String(character.id));
            label.classList.toggle("selected", checkbox.checked);
            updateSelectionCount();
        });

        const portrait = createCharacterPortrait(character);
        const checkmark = document.createElement("span");
        checkmark.className = "character-check";
        checkmark.textContent = "✓";
        const characterId = document.createElement("span");
        characterId.className = "character-id";
        characterId.textContent = `#${character.character_id}`;
        const characterName = document.createElement("span");
        characterName.className = "character-name";
        const typeIcon = appendCharacterName(characterName, character.character_name, character.character_id);
        label.append(checkbox, portrait, typeIcon, checkmark, characterId, characterName);
        characterList.appendChild(label);
    }
}

function renderCurrentVoteCharacters() {
    const visibleCharacters = isVoteLocked
        ? currentCharacters.filter((character) => selectedPoolCharacterIds.has(String(character.id)))
        : currentCharacters;
    renderVoteCharacters(visibleCharacters);
}

function restoreSavedVote(savedPoolCharacterIds) {
    selectedPoolCharacterIds = new Set(savedPoolCharacterIds.map(String));
    isVoteLocked = true;
    currentCharacterPage = 1;
    renderCurrentVoteCharacters();
    updateSelectionCount();
}

async function initializePublicPage() {
    if (isAuthenticated) return;
    activateTab("selection-panel");
    voteSection.hidden = false;
    selectionPanel.hidden = false;
    selectionBar.hidden = true;
    alreadyVoted.hidden = true;
    submitButton.hidden = true;
    voteMessage.textContent = "";
    publicLoginPrompt.hidden = false;
    mimiBindingPrompt.hidden = true;
    selectionCount.textContent = "0";
    selectionMax.textContent = "—";

    try {
        const pool = await getActivePool();
        if (isAuthenticated) return;
        if (!pool) {
            renderNoActivePool();
            return;
        }
        currentPool = pool;
        renderPoolMeta(pool);
        document.getElementById("vote-rule").textContent = "登入後即可選擇角色並提交投票。";

        const characters = await getPoolCharacters(pool.id);
        if (isAuthenticated) return;
        currentCharacters = sortCharactersByIdDescending(characters);
        currentCharacterPage = 1;
        selectedPoolCharacterIds = new Set();
        clearObservedTypeIcons(characterList);
        renderPublicCharacterPage();
        await loadRanking();
        if (isAuthenticated) return;
        startRankingRefresh();
    } catch (error) {
        console.error("Load public pool error:", error);
        clearObservedTypeIcons(characterList);
        characterList.innerHTML = "<p class=\"empty-state\">目前無法載入公開投票資訊。</p>";
        characterPagination.hidden = true;
        document.getElementById("vote-rule").textContent = "登入後即可查看投票資訊並參與投票。";
    }
}

function renderPublicCharacterPage() {
    clearObservedTypeIcons(characterList);
    characterList.innerHTML = "";
    updateCharacterPagination(currentCharacters.length);
    const start = (currentCharacterPage - 1) * CHARACTERS_PER_PAGE;
    for (const character of currentCharacters.slice(start, start + CHARACTERS_PER_PAGE)) {
        const card = document.createElement("article");
        const characterId = document.createElement("span");
        const characterName = document.createElement("span");
        card.className = "character-card public-character-card";
        const portrait = createCharacterPortrait(character);
        characterId.className = "character-id";
        characterId.textContent = `#${character.character_id}`;
        characterName.className = "character-name";
        const typeIcon = appendCharacterName(characterName, character.character_name, character.character_id);
        card.append(portrait, typeIcon, characterId, characterName);
        characterList.appendChild(card);
    }
}

function sortCharactersByIdDescending(characters) {
    return [...characters].sort((left, right) =>
        Number(right.character_id) - Number(left.character_id)
    );
}

function updateCharacterPagination(totalCharacters) {
    const totalPages = Math.max(1, Math.ceil(totalCharacters / CHARACTERS_PER_PAGE));
    currentCharacterPage = Math.min(Math.max(currentCharacterPage, 1), totalPages);
    characterPageLabel.textContent = `第 ${currentCharacterPage} / ${totalPages} 頁`;
    characterPreviousPageButton.disabled = currentCharacterPage === 1;
    characterNextPageButton.disabled = currentCharacterPage === totalPages;
    characterPagination.hidden = totalPages <= 1;
}

function renderCurrentCharacterPage() {
    if (isAuthenticated) renderCurrentVoteCharacters();
    else renderPublicCharacterPage();
}

function createCharacterPortrait(character) {
    const portrait = document.createElement("img");
    portrait.className = "character-portrait";
    portrait.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(character.character_id)}.png`;
    portrait.alt = `${character.character_name} 縮圖`;
    portrait.loading = "lazy";
    portrait.addEventListener("error", () => {
        portrait.classList.add("is-unavailable");
        portrait.alt = "";
    }, { once: true });
    return portrait;
}

function appendCharacterName(container, name, characterId) {
    const nameText = document.createElement("span");
    const typeIcon = createCharacterTypeIcon(characterId);
    nameText.className = "character-name-text";
    nameText.textContent = name;
    nameText.title = name;
    container.append(nameText);
    return typeIcon;
}

function createCharacterTypeIcon(characterId) {
    const icon = document.createElement("img");
    icon.className = "character-type-icon";
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    icon.title = "精靈屬性";
    icon.dataset.characterId = String(characterId);
    icon.addEventListener("error", () => { icon.hidden = true; }, { once: true });
    observedTypeIconElements.add(icon);
    typeIconObserver.observe(icon);
    return icon;
}

function clearObservedTypeIcons(container = document) {
    Array.from(observedTypeIconElements)
        .filter((icon) => container.contains(icon))
        .forEach((icon) => {
            icon.dataset.visible = "false";
            typeIconObserver.unobserve(icon);
            observedTypeIconElements.delete(icon);
        });
}

function loadCharacterTypeIcon(characterId, icon) {
    const cacheKey = String(characterId);
    let iconPromise = characterTypeIconCache.get(cacheKey);
    if (!iconPromise) {
        iconPromise = new Promise((resolve) => {
            characterTypeIconQueue.push({ characterId: cacheKey, resolve });
        });
        characterTypeIconCache.set(cacheKey, iconPromise);
    }
    iconPromise.then((url) => {
        if (!url || !icon.isConnected) return;
        icon.src = url;
        icon.classList.add("is-loaded");
    });
    processCharacterTypeIconQueue();
}

function processCharacterTypeIconQueue() {
    while (activeTypeIconRequests < TYPE_ICON_REQUEST_LIMIT && characterTypeIconQueue.length > 0) {
        const job = characterTypeIconQueue.shift();
        const hasVisibleIcon = Array.from(observedTypeIconElements).some((icon) =>
            icon.dataset.characterId === job.characterId &&
            icon.dataset.visible === "true" &&
            icon.isConnected
        );
        if (!hasVisibleIcon) {
            characterTypeIconCache.delete(job.characterId);
            job.resolve(null);
            continue;
        }

        activeTypeIconRequests += 1;
        fetchCharacterTypeIconUrl(job.characterId)
            .catch((error) => {
                console.warn(`Failed to load Seer type for pet ${job.characterId}:`, error);
                return null;
            })
            .then((url) => {
                job.resolve(url);
            })
            .finally(() => {
                activeTypeIconRequests -= 1;
                processCharacterTypeIconQueue();
            });
    }
}

async function fetchCharacterTypeIconUrl(characterId) {
    const pet = await fetchSeerJson(`https://api.seerapi.com/v1/pet/${encodeURIComponent(characterId)}`);
    const typeId = pet && pet.type && pet.type.id;
    if (!typeId) throw new Error("SeerAPI 回傳未包含 type.id。");

    const typeKey = String(typeId);
    let resolvedTypeIdPromise = elementTypeIconCache.get(typeKey);
    if (!resolvedTypeIdPromise) {
        resolvedTypeIdPromise = fetchSeerJson(
            `https://api.seerapi.com/v1/element_type_combination/${encodeURIComponent(typeKey)}`
        ).then((typeCombination) => {
            const resolvedId = Number(typeCombination && typeCombination.id ? typeCombination.id : typeId);
            if (!Number.isSafeInteger(resolvedId) || resolvedId <= 0) {
                throw new Error("SeerAPI 回傳的屬性 ID 無效。");
            }
            return resolvedId;
        }).catch((error) => {
            elementTypeIconCache.delete(typeKey);
            throw error;
        });
        elementTypeIconCache.set(typeKey, resolvedTypeIdPromise);
    }
    const resolvedTypeId = await resolvedTypeIdPromise;
    if (!Number.isSafeInteger(resolvedTypeId) || resolvedTypeId <= 0) {
        throw new Error("SeerAPI 回傳的屬性 ID 無效。");
    }
    return `https://img.yuyuqaq.cn/seer-pet/type/${resolvedTypeId}.png`;
}

async function fetchSeerJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`SeerAPI 請求失敗（${response.status}）`);
    return response.json();
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

function invalidateSeerPetLookup() {
    if (seerLookupDebounceTimer !== null) {
        window.clearTimeout(seerLookupDebounceTimer);
        seerLookupDebounceTimer = null;
    }
    seerLookupRequestId += 1;
    seerBrowseState = null;
    clearSeerBrowseSentinel();
    clearSeerLookupResult();
}

function startSeerPetLookup(query) {
    if (!query) {
        scheduleSeerPetLookup();
        return;
    }
    if (seerLookupDebounceTimer !== null) {
        window.clearTimeout(seerLookupDebounceTimer);
        seerLookupDebounceTimer = null;
    }
    seerBrowseState = null;
    clearSeerBrowseSentinel();
    const requestId = ++seerLookupRequestId;
    void lookupSeerPet(query, requestId);
}

async function startLatestSeerBrowse(requestId) {
    if (requestId !== seerLookupRequestId || seerLookupIdInput.value.trim()) return;
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
        categoryId: isSkinResource && seerSkinSearchMode === "category"
            ? selectedSeerSkinCategoryId
            : null
    };
    seerLookupPreview.hidden = true;
    seerLookupResults.replaceChildren();
    seerLookupResults.hidden = false;
    seerLookupMessage.textContent = "正在載入最新編號資料…";
    try {
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
        const state = seerBrowseState;
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
            .filter(({ skin }) => !state.seenIds.has(String(skin.id)))
            .sort((first, second) => Number(second.skin.id) - Number(first.skin.id));
        uniqueEntries.forEach(({ skin }) => state.seenIds.add(String(skin.id)));
        renderSeerSkinSearchResults(uniqueEntries, true);
    } else {
        orderedResults = orderedResults.filter((pet) => !state.seenIds.has(String(pet.id)));
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
        const skins = await fetchSeerSkinCatalog();
        if (requestId !== seerLookupRequestId) return;
        const matchingSkins = skins.filter((skin) =>
            String(skin && skin.pet && skin.pet.id) === String(petId)
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
        if (pets.length === 0) {
            seerLookupMessage.textContent = "找不到符合的精靈，請確認名稱或改用精靈 ID。";
            return;
        }
        const skins = await fetchSeerSkinCatalog();
        if (requestId !== seerLookupRequestId) return;
        const petsById = new Map(pets.map((pet) => [String(pet.id), pet]));
        const matchingSkins = skins.filter((skin) =>
            petsById.has(String(skin && skin.pet && skin.pet.id))
        );
        if (matchingSkins.length === 0) {
            seerLookupMessage.textContent = `找到 ${pets.length} 隻精靈，但沒有找到綁定它們的皮膚。`;
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

function fetchSeerSkinCatalog() {
    if (!seerSkinCatalogPromise) {
        seerSkinCatalogPromise = (async () => {
            const skins = [];
            let nextUrl = "https://api.seerapi.com/v1/pet_skin?offset=0&limit=200&expand=true";
            const visitedPageUrls = new Set();
            while (nextUrl) {
                const parsedUrl = new URL(nextUrl);
                if (parsedUrl.origin !== "https://api.seerapi.com") {
                    throw new Error("SeerAPI 回傳了無效的皮膚分頁網址。");
                }
                if (visitedPageUrls.has(parsedUrl.href)) {
                    throw new Error("SeerAPI 回傳重複的皮膚分頁網址。");
                }
                visitedPageUrls.add(parsedUrl.href);
                const page = await fetchSeerJson(parsedUrl.href);
                if (!Array.isArray(page.results)) {
                    throw new Error("SeerAPI 回傳的皮膚清單格式無效。");
                }
                skins.push(...page.results);
                if (skins.length > 5000) {
                    throw new Error("SeerAPI 皮膚清單超出可處理筆數。");
                }
                nextUrl = page.next || null;
            }
            return skins;
        })().catch((error) => {
            seerSkinCatalogPromise = null;
            throw error;
        });
    }
    return seerSkinCatalogPromise;
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
    renderSeerSkinSearchResults(entries);
    seerLookupResults.hidden = false;
    const hasMoreMatches = responses.some((response) =>
        Number(response.count) > (Array.isArray(response.results) ? response.results.length : 0)
    );
    const resultCountMessage = entries.length === 1
        ? "找到 1 款皮膚，點選結果查看預覽。"
        : `找到 ${entries.length} 款皮膚，請選擇。`;
    seerLookupMessage.textContent = hasMoreMatches
        ? `${resultCountMessage} 結果較多，請輸入更完整的名稱以縮小範圍。`
        : resultCountMessage;
}

function matchesSelectedSkinCategory(skin, categoryId) {
    return categoryId === null
        || Number(skin && skin.category && skin.category.id) === categoryId;
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

function fetchSeerPetDetails(petId) {
    const key = String(petId);
    let petPromise = seerPetDetailsCache.get(key);
    if (!petPromise) {
        petPromise = fetchSeerJson(`https://api.seerapi.com/v1/pet/${encodeURIComponent(key)}`)
            .catch((error) => {
                seerPetDetailsCache.delete(key);
                throw error;
            });
        seerPetDetailsCache.set(key, petPromise);
    }
    return petPromise;
}

async function searchSeerPetsByName(query, requestId) {
    const { pets, responses } = await fetchSeerPetsByName(query);
    if (requestId !== seerLookupRequestId) return;

    if (pets.length === 0) {
        seerLookupMessage.textContent = "找不到符合的精靈，請確認名稱或改用精靈 ID。";
        return;
    }
    const typeDetailsById = await loadSeerPetSearchTypeDetails(pets);
    if (requestId !== seerLookupRequestId) return;
    renderSeerPetSearchResults(pets, typeDetailsById);
    seerLookupResults.hidden = false;
    const hasMoreMatches = responses.some((response) =>
        Number(response.count) > (Array.isArray(response.results) ? response.results.length : 0)
    );
    const resultCountMessage = pets.length === 1 ? "找到 1 隻精靈，點選結果查看預覽。" : `找到 ${pets.length} 隻精靈，請選擇。`;
    seerLookupMessage.textContent = hasMoreMatches
        ? `${resultCountMessage} 結果較多，請輸入更完整的名稱以縮小範圍。`
        : resultCountMessage;
}

async function fetchSeerPetsByName(query) {
    const searchTerms = [...new Set([query, convertToSimplifiedChinese(query)].filter(Boolean))];
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
    return { pets: Array.from(petsById.values()), responses };
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

function fetchSeerElementTypeDetails(typeId) {
    const key = String(typeId);
    let detailsPromise = elementTypeDetailsCache.get(key);
    if (!detailsPromise) {
        detailsPromise = fetchSeerJson(
            `https://api.seerapi.com/v1/element_type_combination/${encodeURIComponent(key)}`
        ).then((details) => {
            const resolvedId = Number(details && details.id ? details.id : typeId);
            if (!Number.isSafeInteger(resolvedId) || resolvedId <= 0) {
                throw new Error("SeerAPI 回傳的屬性 ID 無效。");
            }
            return {
                id: resolvedId,
                name: convertToTraditionalChinese(details && details.name ? String(details.name).trim() : "")
            };
        }).catch((error) => {
            elementTypeDetailsCache.delete(key);
            throw error;
        });
        elementTypeDetailsCache.set(key, detailsPromise);
    }
    return detailsPromise;
}

function renderSeerPetSearchResults(pets, typeDetailsById, append = false) {
    if (!append) seerLookupResults.replaceChildren();
    pets.forEach((pet) => {
        const button = document.createElement("button");
        button.className = "seer-lookup-result";
        button.type = "button";
        const content = document.createElement("span");
        content.className = "seer-lookup-result-content";
        const typeId = pet && pet.type && pet.type.id;
        const typeDetails = typeId && typeDetailsById.get(String(typeId));
        const type = document.createElement("span");
        type.className = "seer-lookup-result-type";
        if (typeDetails) {
            const typeIcon = document.createElement("img");
            typeIcon.src = `https://img.yuyuqaq.cn/seer-pet/type/${typeDetails.id}.png`;
            typeIcon.alt = typeDetails.name || "屬性";
            type.append(typeIcon);
        } else {
            type.textContent = "-";
        }
        const name = document.createElement("strong");
        name.className = "seer-lookup-result-name";
        name.textContent = convertToTraditionalChinese(pet.name || "未命名精靈");
        content.append(type, name);
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
                clearSeerBrowseSentinel();
            }
            const requestId = isBrowsing ? seerLookupRequestId : ++seerLookupRequestId;
            const resultButtons = seerLookupResults.querySelectorAll(".seer-lookup-result");
            resultButtons.forEach((result) => {
                result.disabled = true;
                result.classList.toggle("is-selected", result === button);
            });
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
        const category = document.createElement("span");
        category.className = "seer-lookup-result-category";
        const categoryId = skin && skin.category && Number(skin.category.id);
        if (Number.isSafeInteger(categoryId) && categoryId >= 0) {
            const categoryIcon = document.createElement("img");
            categoryIcon.src = `https://img.yuyuqaq.cn/seer-common/common_pet_skin_icon_${categoryId}.png`;
            categoryIcon.alt = `皮膚種類 ${categoryId}`;
            categoryIcon.loading = "lazy";
            categoryIcon.addEventListener("error", () => {
                categoryIcon.hidden = true;
            }, { once: true });
            category.append(categoryIcon);
        } else {
            category.textContent = "-";
        }
        const details = document.createElement("span");
        details.className = "seer-lookup-result-details";
        const name = document.createElement("strong");
        name.className = "seer-lookup-result-name";
        name.textContent = convertToTraditionalChinese(skin.name || "未命名皮膚");
        const petName = document.createElement("span");
        petName.className = "seer-lookup-result-pet";
        petName.textContent = `綁定精靈：${convertToTraditionalChinese(pet.name || "未命名精靈")}`;
        details.append(name, petName);
        content.append(category, details);
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
                clearSeerBrowseSentinel();
            }
            const requestId = isBrowsing ? seerLookupRequestId : ++seerLookupRequestId;
            const resultButtons = seerLookupResults.querySelectorAll(".seer-lookup-result");
            resultButtons.forEach((result) => {
                result.disabled = true;
                result.classList.toggle("is-selected", result === button);
            });
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
    const typeId = pet && pet.type && pet.type.id;
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
    seerLookupTypeIcon.src = `https://img.yuyuqaq.cn/seer-pet/type/${resolvedTypeId}.png`;
    seerLookupTypeName.textContent = typeName || "未知";
    seerLookupIllustrationImage.src = `https://newseer.61.com/web/monster//body/${encodeURIComponent(petId)}.png`;
    seerLookupIllustrationImage.alt = `${petName}立繪`;
    seerLookupMoreInfoButton.hidden = false;
    seerLookupPetSkinsButton.hidden = false;
    seerLookupIllustrationTitle.textContent = "立繪預覽";
    seerLookupIllustrationDescription.textContent = "已選擇精靈，可在此查看立繪。";
    currentSeerInfoUrl = `https://wiki.biligame.com/seer/${encodeURI(`精灵:${petId}`)}`;
    currentSeerPetId = String(petId);
    seerLookupIllustrationImage.hidden = false;
    seerLookupPreview.hidden = false;
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
    seerLookupAvatar.src = `https://newseer.61.com/web/monster/head/1400${encodeURIComponent(skinId)}.png`;
    seerLookupName.textContent = skinName;
    seerLookupIdResult.textContent = `#${skinId}`;
    seerLookupRelatedPet.textContent = `綁定精靈：${petName} (#${petId})`;
    seerLookupRelatedPet.hidden = false;
    const categoryId = skin && skin.category && Number(skin.category.id);
    if (Number.isSafeInteger(categoryId) && categoryId >= 0) {
        seerLookupSkinCategoryIcon.src = `https://img.yuyuqaq.cn/seer-common/common_pet_skin_icon_${categoryId}.png`;
        seerLookupSkinCategoryIcon.hidden = false;
        seerLookupIllustrationCategoryIcon.src = `https://img.yuyuqaq.cn/seer-common/common_pet_skin_icon_${categoryId}.png`;
        seerLookupIllustrationCategoryIcon.hidden = false;
    } else {
        seerLookupSkinCategoryIcon.hidden = true;
        seerLookupSkinCategoryIcon.removeAttribute("src");
        seerLookupIllustrationCategoryIcon.hidden = true;
        seerLookupIllustrationCategoryIcon.removeAttribute("src");
    }
    seerLookupTypeIcon.src = `https://img.yuyuqaq.cn/seer-pet/type/${typeDetails.id}.png`;
    seerLookupTypeName.textContent = typeDetails.name || "未知";
    seerLookupIllustrationImage.src = `https://newseer.61.com/web/monster//body/1400${encodeURIComponent(skinId)}.png`;
    seerLookupIllustrationImage.alt = `${skinName}立繪`;
    seerLookupMoreInfoButton.hidden = false;
    seerLookupPetSkinsButton.hidden = true;
    seerLookupIllustrationTitle.textContent = "皮膚立繪預覽";
    seerLookupIllustrationDescription.textContent = `綁定精靈：${petName}`;
    currentSeerInfoUrl = `https://wiki.biligame.com/seer/${encodeURI(`皮肤:${1400}${skinId}`)}`;
    currentSeerPetId = null;
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
    seerLookupMoreInfoButton.hidden = seerLookupMode === "skin";
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
    activateTab("seer-lookup-section");
    seerLookupIdInput.value = petId;
    seerLookupIdInput.focus();
    startSeerPetLookup(petId);
}

function openSeerExternalLinkModal() {
    if (!currentSeerInfoUrl) return;
    externalLinkOpener = document.activeElement;
    seerExternalLinkOpen.href = currentSeerInfoUrl;
    seerExternalLinkModal.classList.remove("is-closing");
    seerExternalLinkModal.hidden = false;
    document.body.classList.add("has-admin-confirm-modal");
    seerExternalLinkCancel.focus();
}

function closeSeerExternalLinkModal() {
    if (seerExternalLinkModal.hidden || seerExternalLinkModal.classList.contains("is-closing")) return;
    seerExternalLinkModal.classList.add("is-closing");
    document.body.classList.remove("has-admin-confirm-modal");
    window.setTimeout(() => {
        seerExternalLinkModal.hidden = true;
        seerExternalLinkModal.classList.remove("is-closing");
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

function convertToTraditionalChinese(value) {
    if (!value) return "";
    try {
        return value.split(/([岳杰托里])/).map((part) => "岳杰托里".includes(part) ? part : s2tConverter(part)).join("");
    } catch (error) {
        console.warn("Simplified-to-traditional conversion failed:", error);
        return value;
    }
}

function convertToSimplifiedChinese(value) {
    try {
        return value.split(/([岳杰托里])/).map((part) => "岳杰托里".includes(part) ? part : t2sConverter(part)).join("");
    } catch (error) {
        console.warn("Traditional-to-simplified conversion failed:", error);
        return value;
    }
}

function renderPoolMeta(pool) {
    document.getElementById("pool-name").textContent = pool.name;
    document.getElementById("vote-limit").textContent = `${pool.max_votes} 票`;
    poolStatus.textContent = pool.status;
    poolStatus.className = `status-badge status-${pool.status}`;
}

function renderNoActivePool() {
    currentPool = null;
    currentCharacters = [];
    currentCharacterPage = 1;
    selectedPoolCharacterIds = new Set();
    isVoteLocked = false;
    document.getElementById("pool-name").textContent = "目前沒有進行中的投票";
    document.getElementById("vote-limit").textContent = "—";
    poolStatus.textContent = "inactive";
    poolStatus.className = "status-badge status-closed";
    document.getElementById("vote-rule").textContent = "請稍後再回來查看下一期投票。";
    clearObservedTypeIcons();
    characterList.innerHTML = "<p class=\"empty-state\">目前沒有進行中的投票。</p>";
    characterPagination.hidden = true;
    const rankingList = document.getElementById("ranking-list");
    clearObservedTypeIcons(rankingList);
    rankingList.innerHTML = "<p class=\"empty-state\">目前沒有可顯示的排名。</p>";
    currentRanking = [];
    currentRankingPage = 1;
    rankingPagination.hidden = true;
    selectionBar.hidden = true;
    publicLoginPrompt.hidden = true;
}

async function loadRanking() {
    const rankingList = document.getElementById("ranking-list");
    if (!currentPool) {
        clearObservedTypeIcons(rankingList);
        rankingList.innerHTML = "<p class=\"empty-state\">目前沒有可顯示的排名。</p>";
        currentRanking = [];
        currentRankingPage = 1;
        rankingPagination.hidden = true;
        return;
    }
    try {
        currentRanking = await getPoolRanking(currentPool.id);
        renderRanking(currentRanking);
    } catch (error) {
        console.error("Ranking error:", error);
        clearObservedTypeIcons(rankingList);
        rankingList.textContent = `讀取排名失敗：${error.message}`;
        rankingPagination.hidden = true;
    }
}

function renderRanking(ranking) {
    const rankingList = document.getElementById("ranking-list");
    clearObservedTypeIcons(rankingList);
    rankingList.innerHTML = "";
    if (ranking.length === 0) {
        rankingList.innerHTML = "<p class=\"empty-state\">尚無投票資料，排名將在第一張票送出後顯示。</p>";
        rankingPageLabel.textContent = "第 1 / 1 頁";
        rankingPagination.hidden = true;
        currentRankingPage = 1;
        return;
    }

    const totalPages = Math.ceil(ranking.length / RANKINGS_PER_PAGE);
    currentRankingPage = Math.min(Math.max(currentRankingPage, 1), totalPages);
    const start = (currentRankingPage - 1) * RANKINGS_PER_PAGE;
    const pageRanking = ranking.slice(start, start + RANKINGS_PER_PAGE);
    rankingPageLabel.textContent = `第 ${currentRankingPage} / ${totalPages} 頁`;
    rankingPreviousPageButton.disabled = currentRankingPage === 1;
    rankingNextPageButton.disabled = currentRankingPage === totalPages;
    rankingPagination.hidden = totalPages <= 1;

    for (const item of pageRanking) {
        const row = document.createElement("div");
        const character = findRankingCharacter(item);
        const characterId = item.character_id ?? character?.character_id ?? "—";
        row.className = "ranking-item";
        row.innerHTML = `<span class="ranking-rank">${String(item.rank).padStart(2, "0")}</span><img class="ranking-portrait" alt="" loading="lazy"><span class="ranking-character"><span class="ranking-character-id"></span><span class="ranking-name"></span></span><span class="ranking-votes">${item.vote_count} 票</span>`;
        const portrait = row.querySelector(".ranking-portrait");
        if (characterId !== "—") {
            portrait.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(characterId)}.png`;
            portrait.alt = `${item.character_name} 縮圖`;
            portrait.addEventListener("error", () => { portrait.hidden = true; }, { once: true });
        } else {
            portrait.hidden = true;
        }
        row.querySelector(".ranking-character-id").textContent = characterId === "—" ? "" : `#${characterId}`;
        const rankingName = row.querySelector(".ranking-name");
        rankingName.textContent = item.character_name;
        if (characterId !== "—") {
            const typeIcon = createCharacterTypeIcon(characterId);
            const nameLine = document.createElement("span");
            nameLine.className = "ranking-name-line";
            rankingName.replaceWith(nameLine);
            nameLine.append(rankingName, typeIcon);
        }
        rankingList.appendChild(row);
    }
}

function findRankingCharacter(item) {
    if (item.pool_character_id) {
        return currentCharacters.find((character) => character.id === item.pool_character_id);
    }
    if (item.character_id) {
        return currentCharacters.find((character) => String(character.character_id) === String(item.character_id));
    }
    return currentCharacters.find((character) => character.character_name === item.character_name);
}

function startRankingRefresh() {
    if (rankingTimer === null) rankingTimer = setInterval(() => loadRanking(), 5000);
}

function stopRankingRefresh() {
    if (rankingTimer !== null) clearInterval(rankingTimer);
    rankingTimer = null;
}

function updateSelectionCount() {
    const count = selectedPoolCharacterIds.size;
    selectionCount.textContent = count;
    selectionMax.textContent = currentPool?.max_votes ?? 0;
    if (!currentPool) return;
    const isComplete = count === currentPool.max_votes;
    voteMessage.textContent = isComplete ? "選擇完成，可以提交投票。" : `還需要選擇 ${currentPool.max_votes - count} 個角色。`;
    voteMessage.classList.toggle("is-complete", isComplete);
}

submitButton.addEventListener("click", async () => {
    if (!hasMiMiBinding) {
        voteMessage.textContent = "請先綁定米米號後再投票。";
        mimiBindingPrompt.hidden = false;
        return;
    }
    if (!currentPool) {
        voteMessage.textContent = "目前沒有載入投票。";
        return;
    }
    if (selectedPoolCharacterIds.size !== currentPool.max_votes) {
        voteMessage.textContent = `你必須剛好選擇 ${currentPool.max_votes} 個角色。`;
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "投票送出中…";
    voteMessage.classList.remove("is-complete");
    voteMessage.textContent = "投票送出中…";
    try {
        const data = await submitVote(currentPool.id, Array.from(selectedPoolCharacterIds));
        console.log("Vote submitted:", data);
        voteMessage.textContent = "投票成功！你的選擇已鎖定。";
        voteMessage.classList.add("is-complete");
        isVoteLocked = true;
        currentCharacterPage = 1;
        renderCurrentVoteCharacters();
        submitButton.hidden = true;
        alreadyVoted.hidden = false;
        alreadyVotedMessage.textContent = "本期投票已成功提交；重新整理後仍可查看你的選擇。";
        await loadRanking();
    } catch (error) {
        console.error("Submit vote error:", error);
        voteMessage.textContent = `投票失敗：${error.message}`;
        submitButton.disabled = false;
        submitButton.textContent = "提交投票";
    }
});

logoutButton.addEventListener("click", async () => {
    const { error } = await logout();
    if (error) {
        console.error("Logout error:", error);
        return;
    }
    stopRankingRefresh();
    showLoggedOutView();
});

function showAuthenticatedView() {
    isAuthenticated = true;
    loginModal.classList.remove("is-closing");
    loginModal.hidden = true;
    loginTrigger.hidden = true;
    voteSection.hidden = false;
    logoutButton.hidden = false;
    accountTab.hidden = false;
}

function showLoggedOutView() {
    isAuthenticated = false;
    activateTab("selection-panel");
    loginModal.classList.remove("is-closing");
    loginModal.hidden = true;
    loginTrigger.hidden = false;
    voteSection.hidden = false;
    selectionPanel.hidden = false;
    selectionBar.hidden = true;
    logoutButton.hidden = true;
    accountTab.hidden = true;
    accountSection.hidden = true;
    publicLoginPrompt.hidden = false;
    mimiBindingPrompt.hidden = true;
    currentPool = null;
    adminLink.hidden = true;
    renderGameAccount(null);
    alreadyVoted.hidden = true;
    emailInput.value = "";
    passwordInput.value = "";
    passwordConfirmInput.value = "";
    mimiIdInput.value = "";
    setAuthMode(false);
    loginMessage.textContent = "";
    voteMessage.textContent = "";
    submitButton.textContent = "提交投票";
}

async function syncAdminLink() {
    try {
        adminLink.hidden = !(await isAdmin());
    } catch (error) {
        console.error("Admin status error:", error);
        adminLink.hidden = true;
    }
}

supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
        stopRankingRefresh();
        showLoggedOutView();
        initializePublicPage();
    }
});

async function checkSession() {
    try {
        const session = await getSession();
        if (!session) {
            showLoggedOutView();
            await initializePublicPage();
            return;
        }
        showAuthenticatedView();
        await initializeAuthenticatedPage();
    } catch (error) {
        console.error("Session error:", error);
        showLoggedOutView();
    }
}

checkSession();
