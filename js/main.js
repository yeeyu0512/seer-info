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
const seerLookupSkinMoreInfoButton = document.getElementById("seer-lookup-skin-more-info");
const seerLookupPetSkinsButton = document.getElementById("seer-lookup-pet-skins");
const seerTestPetShortcutButton = document.getElementById("seer-test-pet-shortcut");
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
const seerPetInfoCache = new Map();
const seerSkillDetailsCache = new Map();
const seerSkillActivationItemCache = new Map();
const seerSoulmarkDetailsCache = new Map();
const seerPetAdvanceCache = new Map();
const seerSoulmarkImageCache = new Map();
const seerSkinThumbnailFallbackCache = new Map();
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
seerLookupSkinMoreInfoButton.addEventListener("click", openSeerExternalLinkModal);
seerTestPetShortcutButton.addEventListener("click", loadTestSeerPet);
document.addEventListener("keydown", (event) => {
    if (
        !event.ctrlKey
        || !event.shiftKey
        || event.altKey
        || event.metaKey
        || event.repeat
        || event.code !== "Digit6"
        || !seerPetInfoModal.hidden
        || !seerExternalLinkModal.hidden
    ) return;
    const target = event.target;
    if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) return;
    event.preventDefault();
    loadTestSeerPet();
});
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
            ? "選擇皮膚種類圖示，即可瀏覽該種類的皮膚，可能包含僅陸服存在的項目或顯示錯誤。"
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

async function fetchSeerJson(url, options = {}) {
    const response = await fetch(url, { headers: { Accept: "application/json" }, ...options });
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

function startSeerPetLookup(query, openInfoWhenLoaded = false) {
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
    resetSeerPetInfo();
    const requestId = ++seerLookupRequestId;
    void lookupSeerPet(query, requestId).then(() => {
        if (openInfoWhenLoaded && requestId === seerLookupRequestId && currentSeerPetData) {
            openSeerPetInfoModal();
        }
    });
}

function loadTestSeerPet() {
    setSeerLookupMode("pet");
    activateTab("seer-lookup-section");
    seerLookupIdInput.value = "3506";
    seerLookupIdInput.focus();
    startSeerPetLookup("3506", true);
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
        visual.className = "seer-lookup-result-category seer-lookup-result-skin-thumbnail";
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
            fetchSeerPetRelatedRecords(skillRefs, "skill", seerSkillDetailsCache),
            fetchSeerPetRelatedRecords(
                activationItemRefs,
                "skill_activation_item",
                seerSkillActivationItemCache
            ).catch((error) => {
                console.warn(`Load Seer pet skill activation items ${petId} error:`, error);
                return [];
            }),
            fetchSeerPetRelatedRecords(soulmarkRefs, "soulmark", seerSoulmarkDetailsCache),
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
                    "pet_advance",
                    seerPetAdvanceCache
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

function fetchSeerPetInfo(petId) {
    const key = String(petId);
    let promise = seerPetInfoCache.get(key);
    if (!promise) {
        promise = fetchSeerJson(`https://api.seerapi.com/v1/pet/${encodeURIComponent(key)}`)
            .catch((error) => {
                seerPetInfoCache.delete(key);
                throw error;
            });
        seerPetInfoCache.set(key, promise);
    }
    return promise;
}

async function fetchSeerPetRelatedRecords(references, resource, cache) {
    const getRelatedReference = (item) => item && (item[resource] || item);
    const uniqueIds = [...new Set(references
        .map((item) => getRelatedReference(item) && getRelatedReference(item).id)
        .filter((id) => id !== undefined && id !== null)
        .map(String))];
    const pendingIds = uniqueIds.slice();
    const recordsById = new Map();
    const workers = Array.from({ length: Math.min(4, pendingIds.length) }, async () => {
        while (pendingIds.length) {
            const id = pendingIds.shift();
            let promise = cache.get(id);
            if (!promise) {
                const reference = references.find((item) =>
                    getRelatedReference(item) && String(getRelatedReference(item).id) === id
                );
                const relatedUrl = reference && getRelatedReference(reference).url;
                const endpoint = relatedUrl || `https://api.seerapi.com/v1/${resource}/${encodeURIComponent(id)}`;
                const parsedUrl = new URL(endpoint);
                if (parsedUrl.origin !== "https://api.seerapi.com") {
                    throw new Error(`SeerAPI 回傳了無效的 ${resource} 資料網址。`);
                }
                promise = fetchSeerJson(parsedUrl.href)
                    .catch((error) => {
                        cache.delete(id);
                        throw error;
                    });
                cache.set(id, promise);
            }
            recordsById.set(id, await promise);
        }
    });
    await Promise.all(workers);
    return references.map((reference) => {
        const relatedReference = getRelatedReference(reference);
        const id = relatedReference && String(relatedReference.id);
        return { reference, record: id ? recordsById.get(id) : null };
    });
}

function renderSeerPetInfo(pet, skills, soulmarks, advanceStats, advanceLoadError, typeDetails, activationItemsById) {
    seerPetInfoPanel.replaceChildren();
    renderSeerPetInfoIdentity(pet, typeDetails);

    const statsSection = document.createElement("section");
    statsSection.className = "seer-pet-info-section";
    const statsTitle = document.createElement("h3");
    statsTitle.textContent = "種族值";
    const statNames = [
        ["hp", "體力"], ["atk", "攻擊"], ["def", "防禦"],
        ["sp_atk", "特攻"], ["sp_def", "特防"], ["spd", "速度"]
    ];
    const createStatGrid = (stats) => {
        const grid = document.createElement("dl");
        grid.className = "seer-pet-stat-grid";
        statNames.forEach(([key, label]) => {
            const item = document.createElement("div");
            const term = document.createElement("dt");
            term.textContent = label;
            const value = document.createElement("dd");
            value.textContent = stats[key] === undefined || stats[key] === null
                ? "—"
                : String(stats[key]);
            item.append(term, value);
            grid.append(item);
        });
        const total = document.createElement("div");
        total.className = "seer-pet-stat-total";
        const totalTerm = document.createElement("dt");
        totalTerm.textContent = "總和";
        const totalValue = document.createElement("dd");
        totalValue.textContent = stats.total === undefined || stats.total === null
            ? "—"
            : String(stats.total);
        total.append(totalTerm, totalValue);
        grid.append(total);
        return grid;
    };
    const normalStats = pet.base_stats || {};
    if (advanceStats) {
        const tabList = document.createElement("div");
        tabList.className = "seer-pet-stat-tabs";
        tabList.setAttribute("role", "tablist");
        tabList.setAttribute("aria-label", "種族值狀態");
        const normalTab = document.createElement("button");
        const advancedTab = document.createElement("button");
        const normalPanel = createStatGrid(normalStats);
        const advancedPanel = createStatGrid(advanceStats);
        normalTab.className = "seer-pet-stat-tab";
        advancedTab.className = "seer-pet-stat-tab";
        normalTab.type = "button";
        advancedTab.type = "button";
        normalTab.id = `seer-stat-tab-${pet.id}-normal`;
        advancedTab.id = `seer-stat-tab-${pet.id}-advance`;
        normalPanel.id = `seer-stat-panel-${pet.id}-normal`;
        advancedPanel.id = `seer-stat-panel-${pet.id}-advance`;
        normalTab.setAttribute("role", "tab");
        advancedTab.setAttribute("role", "tab");
        normalTab.setAttribute("aria-controls", normalPanel.id);
        advancedTab.setAttribute("aria-controls", advancedPanel.id);
        normalTab.setAttribute("aria-selected", "true");
        advancedTab.setAttribute("aria-selected", "false");
        normalTab.tabIndex = 0;
        advancedTab.tabIndex = -1;
        normalTab.textContent = "覺醒前";
        advancedTab.textContent = "神諭覺醒";
        normalPanel.setAttribute("role", "tabpanel");
        advancedPanel.setAttribute("role", "tabpanel");
        normalPanel.setAttribute("aria-labelledby", normalTab.id);
        advancedPanel.setAttribute("aria-labelledby", advancedTab.id);
        normalPanel.tabIndex = 0;
        advancedPanel.tabIndex = 0;
        advancedPanel.hidden = true;
        const activateStatsTab = (isAdvanced, moveFocus = false) => {
            normalTab.setAttribute("aria-selected", String(!isAdvanced));
            advancedTab.setAttribute("aria-selected", String(isAdvanced));
            normalTab.tabIndex = isAdvanced ? -1 : 0;
            advancedTab.tabIndex = isAdvanced ? 0 : -1;
            normalPanel.hidden = isAdvanced;
            advancedPanel.hidden = !isAdvanced;
            if (moveFocus) (isAdvanced ? advancedTab : normalTab).focus();
        };
        [[normalTab, false], [advancedTab, true]].forEach(([tab, isAdvanced]) => {
            tab.addEventListener("click", () => activateStatsTab(isAdvanced));
            tab.addEventListener("keydown", (event) => {
                let selectAdvanced;
                if (event.key === "Home") {
                    selectAdvanced = false;
                } else if (event.key === "End") {
                    selectAdvanced = true;
                } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
                    selectAdvanced = !isAdvanced;
                } else {
                    return;
                }
                event.preventDefault();
                activateStatsTab(selectAdvanced, true);
            });
        });
        tabList.append(normalTab, advancedTab);
        statsSection.append(statsTitle, tabList, normalPanel, advancedPanel);
    } else {
        statsSection.append(statsTitle, createStatGrid(normalStats));
        if (advanceLoadError) {
            const advanceMessage = document.createElement("p");
            advanceMessage.className = "seer-pet-info-message";
            advanceMessage.textContent = "神諭覺醒種族值暫時無法取得。";
            statsSection.append(advanceMessage);
        }
    }
    seerPetInfoPanel.append(statsSection);

    const skillsSection = document.createElement("section");
    skillsSection.className = "seer-pet-info-section";
    const skillsTitle = document.createElement("h3");
    skillsTitle.textContent = `技能（${skills.length}）`;
    const skillCategories = [
        { key: "normal", label: "普通技能", skills: [] },
        { key: "advanced", label: "神諭覺醒", skills: [] },
        { key: "special", label: "特殊學習", skills: [] }
    ];
    skills.forEach((skill) => {
        const { is_advanced: isAdvanced, is_special: isSpecial } = skill.reference;
        if (isAdvanced) {
            skillCategories.find((item) => item.key === "advanced").skills.push(skill);
        }
        if (isSpecial) {
            skillCategories.find((item) => item.key === "special").skills.push(skill);
        }
        if (!isAdvanced && !isSpecial) {
            skillCategories.find((item) => item.key === "normal").skills.push(skill);
        }
    });
    const visibleSkillCategories = skillCategories.filter((category) => category.skills.length);
    const hasClassifiedSkills = skills.some(({ reference }) => reference.is_advanced || reference.is_special);
    const renderSkillList = (categorySkills) => {
        const skillList = document.createElement("div");
        skillList.className = "seer-pet-skill-list";
        categorySkills
            .slice()
            .sort((first, second) => Number(first.reference.learning_level) - Number(second.reference.learning_level))
            .forEach(({ reference, record }) => {
                const item = document.createElement("article");
                item.className = "seer-pet-skill";
                const heading = document.createElement("div");
                heading.className = "seer-pet-skill-heading";
                const nameGroup = document.createElement("div");
                nameGroup.className = "seer-pet-skill-name";
                const typeId = Number(record && record.type && record.type.id);
                if (Number.isSafeInteger(typeId) && typeId > 0) {
                    const typeIcon = document.createElement("img");
                    typeIcon.className = "seer-pet-skill-type-icon";
                    typeIcon.src = Number(record && record.category && record.category.id) === 4
                        ? "https://img.yuyuqaq.cn/seer-pet/type/prop.png"
                        : `https://img.yuyuqaq.cn/seer-pet/type/${typeId}.png`;
                    typeIcon.alt = "";
                    typeIcon.setAttribute("aria-hidden", "true");
                    typeIcon.loading = "lazy";
                    typeIcon.addEventListener("error", () => typeIcon.remove(), { once: true });
                    nameGroup.append(typeIcon);
                }
                const name = document.createElement("strong");
                name.textContent = convertToTraditionalChinese(record && record.name || "技能資料未提供");
                nameGroup.append(name);
                if (reference.is_fifth) {
                    const fifth = document.createElement("span");
                    fifth.className = "seer-pet-skill-badge";
                    fifth.textContent = "第五技能";
                    nameGroup.append(fifth);
                }
                heading.append(nameGroup);
                const learningLevel = Number(reference.learning_level);
                const learningLevelText = Number.isFinite(learningLevel)
                    ? `學習等級：${learningLevel}級`
                    : "學習等級：特殊";
                const statsText = document.createElement("p");
                const power = record && record.power !== null && record.power !== undefined ? record.power : "—";
                const pp = record && record.max_pp !== null && record.max_pp !== undefined ? record.max_pp : "—";
                const accuracy = record && record.accuracy !== null && record.accuracy !== undefined ? `${record.accuracy}%` : "—";
                statsText.textContent = `威力 ${power} · PP ${pp} · 命中 ${accuracy} · ${learningLevelText}`;
                item.append(heading, statsText);
                const activationItemId = reference.skill_activation_item
                    && reference.skill_activation_item.id;
                const activationItem = activationItemId === undefined || activationItemId === null
                    ? null
                    : activationItemsById.get(String(activationItemId));
                const skillEffects = Array.isArray(record && record.skill_effect)
                    ? record.skill_effect
                    : [];
                const effectTexts = skillEffects
                    .map((effect) => {
                        if (effect && typeof effect.info === "string" && effect.info.trim()) {
                            return effect.info.trim();
                        }
                        if (!effect || typeof effect.analyze_info !== "string" || !effect.analyze_info.trim()) {
                            return "";
                        }
                        return effect.analyze_info
                            .replace(/\[(?:sprite\s+[^\]]+|\/?color(?:=[^\]]*)?)\]/gi, "")
                            .trim();
                    })
                    .filter(Boolean);
                if (effectTexts.length) {
                    const effects = document.createElement("ul");
                    effects.className = "seer-pet-skill-effects";
                    effectTexts.forEach((effectText) => {
                        const effectItem = document.createElement("li");
                        effectItem.textContent = convertToTraditionalChinese(effectText);
                        effects.append(effectItem);
                    });
                    item.append(effects);
                }
                if (record && record.info) {
                    const description = document.createElement("p");
                    description.className = "seer-pet-skill-description";
                    description.textContent = convertToTraditionalChinese(String(record.info));
                    item.append(description);
                }
                if (activationItem && activationItem.name) {
                    const activationItemText = document.createElement("p");
                    activationItemText.className = "seer-pet-skill-activation-item";
                    const itemNumber = Number(activationItem.item_number);
                    const itemCount = Number.isFinite(itemNumber) && itemNumber > 1
                        ? ` ×${itemNumber}`
                        : "";
                    activationItemText.textContent =
                        `學習道具：${convertToTraditionalChinese(String(activationItem.name))}${itemCount}`;
                    item.append(activationItemText);
                }
                skillList.append(item);
            });
        if (!categorySkills.length) {
            const empty = document.createElement("p");
            empty.className = "seer-pet-info-message";
            empty.textContent = "沒有技能資料。";
            skillList.append(empty);
        }
        return skillList;
    };
    if (hasClassifiedSkills) {
        const tabList = document.createElement("div");
        tabList.className = "seer-pet-stat-tabs seer-pet-skill-tabs";
        tabList.setAttribute("role", "tablist");
        tabList.setAttribute("aria-label", "技能分類");
        const panels = visibleSkillCategories.map((category) => {
            const tab = document.createElement("button");
            const panel = renderSkillList(category.skills);
            const categoryId = `seer-skill-${String(pet.id || "pet").replace(/[^\w-]/g, "-")}-${category.key}`;
            tab.className = "seer-pet-stat-tab";
            tab.type = "button";
            tab.id = `${categoryId}-tab`;
            tab.setAttribute("role", "tab");
            tab.setAttribute("aria-controls", `${categoryId}-panel`);
            tab.setAttribute("aria-selected", "false");
            tab.tabIndex = -1;
            tab.textContent = `${category.label}（${category.skills.length}）`;
            panel.id = `${categoryId}-panel`;
            panel.setAttribute("role", "tabpanel");
            panel.setAttribute("aria-labelledby", tab.id);
            panel.tabIndex = 0;
            panel.hidden = true;
            tab.addEventListener("click", () => activateSkillTab(category.key));
            tab.addEventListener("keydown", (event) => {
                const currentIndex = visibleSkillCategories.findIndex((item) => item.key === category.key);
                let nextIndex;
                if (event.key === "Home") nextIndex = 0;
                else if (event.key === "End") nextIndex = visibleSkillCategories.length - 1;
                else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    nextIndex = (currentIndex + 1) % visibleSkillCategories.length;
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    nextIndex = (currentIndex - 1 + visibleSkillCategories.length) % visibleSkillCategories.length;
                } else return;
                event.preventDefault();
                activateSkillTab(visibleSkillCategories[nextIndex].key, true);
            });
            tabList.append(tab);
            return { category, tab, panel };
        });
        const activateSkillTab = (selectedKey, moveFocus = false) => {
            panels.forEach(({ category, tab, panel }) => {
                const selected = category.key === selectedKey;
                tab.setAttribute("aria-selected", String(selected));
                tab.tabIndex = selected ? 0 : -1;
                panel.hidden = !selected;
                if (selected && moveFocus) tab.focus();
            });
        };
        skillsSection.append(skillsTitle, tabList, ...panels.map(({ panel }) => panel));
        activateSkillTab(visibleSkillCategories[0].key);
    } else {
        skillsSection.append(skillsTitle, renderSkillList(skills));
    }
    seerPetInfoPanel.append(skillsSection);

    const soulmarkSection = document.createElement("section");
    soulmarkSection.className = "seer-pet-info-section";
    const soulmarkTitle = document.createElement("h3");
    soulmarkTitle.textContent = "魂印";
    soulmarkSection.append(soulmarkTitle);
    if (!soulmarks.length) {
        const empty = document.createElement("p");
        empty.className = "seer-pet-info-message";
        empty.textContent = "沒有魂印資料。";
        soulmarkSection.append(empty);
    }
    const soulmarkTabPrefix = `seer-soulmark-${String(pet.id || "pet").replace(/[^\w-]/g, "-")}`;
    const soulmarkCards = soulmarks.map(({ reference, record }, index) => {
        const soulmarkId = record && record.id || reference.id;
        const card = document.createElement("article");
        card.className = "seer-pet-soulmark-card";
        card.id = `${soulmarkTabPrefix}-panel-${index}`;
        if (soulmarkId) {
            const image = document.createElement("img");
            image.className = "seer-pet-soulmark-image";
            image.alt = `魂印 ${soulmarkId}`;
            image.loading = "lazy";
            resolveSeerWikiSoulmarkImage(soulmarkId)
                .then((imageUrl) => {
                    if (imageUrl) image.src = imageUrl;
                    else image.hidden = true;
                })
                .catch((error) => {
                    console.warn(`Load wiki soulmark image ${soulmarkId} error:`, error);
                    image.hidden = true;
                });
            image.addEventListener("error", () => {
                image.hidden = true;
            }, { once: true });
            card.append(image);
        }
        const description = document.createElement("p");
        description.className = "seer-pet-soulmark";
        const descriptionText = [
            record && record.desc,
            record && record.desc_formatting_adjustment,
            record && record.analyze_desc
        ].find((value) => typeof value === "string" && value.trim());
        if (descriptionText) {
            const bossNotePattern = /^[（(]\s*boss\s*(?:無效|有效)\s*[）)]$/i;
            const lines = convertToTraditionalChinese(descriptionText.trim())
                .replace(/\s*\|\s*/g, "\n")
                .replace(/\s*([（(]\s*boss\s*(?:無效|有效)\s*[）)])\s*/gi, "\n$1\n")
                .split(/\n/)
                .map((line) => line.trim())
                .filter(Boolean);
            description.textContent = lines
                .map((line) => bossNotePattern.test(line) ? line : `• ${line}`)
                .join("\n");
        } else {
            description.textContent = `魂印 #${soulmarkId || "?"} 描述未提供。`;
        }
        card.append(description);
        return {
            card,
            id: soulmarkId,
            name: record && record.name,
            index
        };
    });
    if (soulmarkCards.length > 1) {
        const tabList = document.createElement("div");
        tabList.className = "seer-pet-soulmark-tabs";
        tabList.setAttribute("role", "tablist");
        tabList.setAttribute("aria-label", "魂印");
        const activateTab = (selectedIndex, moveFocus = false) => {
            soulmarkCards.forEach(({ card }, tabIndex) => {
                const tab = tabList.children[tabIndex];
                const isSelected = tabIndex === selectedIndex;
                tab.setAttribute("aria-selected", String(isSelected));
                tab.tabIndex = isSelected ? 0 : -1;
                card.hidden = !isSelected;
                if (moveFocus && isSelected) tab.focus();
            });
        };
        soulmarkCards.forEach(({ card }, tabIndex) => {
            const tab = document.createElement("button");
            const tabId = `${soulmarkTabPrefix}-tab-${tabIndex}`;
            tab.className = "seer-pet-soulmark-tab";
            tab.id = tabId;
            tab.type = "button";
            tab.setAttribute("role", "tab");
            tab.setAttribute("aria-controls", card.id);
            tab.setAttribute("aria-selected", String(tabIndex === 0));
            tab.tabIndex = tabIndex === 0 ? 0 : -1;
            tab.textContent = tabIndex === 0
                ? "強化前"
                : tabIndex === 1
                    ? "強化後"
                    : `強化後${tabIndex}`;
            card.setAttribute("role", "tabpanel");
            card.setAttribute("aria-labelledby", tabId);
            card.tabIndex = 0;
            card.hidden = tabIndex !== 0;
            tab.addEventListener("click", () => activateTab(tabIndex));
            tab.addEventListener("keydown", (event) => {
                let nextIndex;
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    nextIndex = (tabIndex + 1) % soulmarkCards.length;
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    nextIndex = (tabIndex - 1 + soulmarkCards.length) % soulmarkCards.length;
                } else if (event.key === "Home") {
                    nextIndex = 0;
                } else if (event.key === "End") {
                    nextIndex = soulmarkCards.length - 1;
                } else {
                    return;
                }
                event.preventDefault();
                activateTab(nextIndex, true);
            });
            tabList.append(tab);
        });
        soulmarkSection.append(tabList);
        soulmarkCards.forEach(({ card }) => soulmarkSection.append(card));
    } else {
        soulmarkCards.forEach(({ card }) => soulmarkSection.append(card));
    }
    seerPetInfoPanel.insertBefore(soulmarkSection, skillsSection);
}

function renderSeerPetInfoIdentity(pet, typeDetails) {
    const petId = String(pet.id || "");
    const petName = convertToTraditionalChinese(String(pet.name || "精靈"));
    seerPetInfoTitle.textContent = petName;
    seerPetInfoAvatar.hidden = !petId;
    seerPetInfoAvatar.alt = `${petName}縮圖`;
    if (petId) {
        seerPetInfoAvatar.src =
            `https://newseer.61.com/web/monster/head/${encodeURIComponent(petId)}.png`;
    } else {
        seerPetInfoAvatar.removeAttribute("src");
    }
    seerPetInfoAvatar.onerror = () => {
        seerPetInfoAvatar.hidden = true;
    };
    seerPetInfoMeta.replaceChildren();

    const addMeta = (label, value, iconUrl = "") => {
        const item = document.createElement("span");
        item.className = "seer-pet-info-meta-item";
        item.setAttribute("aria-label", `${label} ${value}`);
        if (iconUrl) {
            const icon = document.createElement("img");
            icon.src = iconUrl;
            icon.alt = "";
            icon.loading = "lazy";
            icon.addEventListener("error", () => icon.remove(), { once: true });
            item.append(icon);
        }
        const text = document.createElement("span");
        text.textContent = value;
        item.append(text);
        seerPetInfoMeta.append(item);
    };

    addMeta("編號", `#${petId}`);
    const genderId = Number(pet.gender && pet.gender.id);
    const gender = {
        0: ["無性", "https://img.yuyuqaq.cn/seer-common/sex_sexless.png"],
        1: ["雄性", "https://img.yuyuqaq.cn/seer-common/sex_male.png"],
        2: ["雌性", "https://img.yuyuqaq.cn/seer-common/sex_female.png"]
    }[genderId];
    addMeta("性別", gender ? gender[0] : "未知", gender && gender[1]);
    const typeId = typeDetails && typeDetails.id || pet.type && pet.type.id;
    const typeName = typeDetails && typeDetails.name;
    addMeta(
        "屬性",
        typeName || "",
        typeId ? `https://img.yuyuqaq.cn/seer-pet/type/${encodeURIComponent(typeId)}.png` : ""
    );
}

function resolveSeerWikiSoulmarkImage(soulmarkId) {
    const key = String(soulmarkId);
    let promise = seerSoulmarkImageCache.get(key);
    if (!promise) {
        const query = new URLSearchParams({
            action: "parse",
            page: `魂印:${key}`,
            prop: "text",
            format: "json",
            origin: "*"
        });
        promise = fetchSeerJson(`https://wiki.biligame.com/seer/api.php?${query}`)
            .then((response) => {
                const html = response && response.parse && response.parse.text &&
                    response.parse.text["*"];
                if (typeof html !== "string") {
                    throw new Error(`魂印 Wiki 頁面 ${key} 沒有可解析的內容。`);
                }
                const document = new DOMParser().parseFromString(html, "text/html");
                const soulmarkImage = document.querySelector(
                    ".mw-parser-output > table.wikitable td[rowspan] img"
                );
                const candidates = [
                    soulmarkImage && soulmarkImage.getAttribute("src"),
                    ...(soulmarkImage && soulmarkImage.getAttribute("srcset") || "")
                        .split(",")
                        .map((candidate) => candidate.trim().split(/\s+/)[0])
                        .filter(Boolean),
                ].filter(Boolean);
                const imageUrl = candidates[candidates.length - 1];
                if (!imageUrl) {
                    throw new Error(`魂印 Wiki 頁面 ${key} 找不到魂印圖片。`);
                }
                const parsedImageUrl = new URL(imageUrl, "https://wiki.biligame.com");
                if (parsedImageUrl.hostname !== "patchwiki.biligame.com" ||
                    !parsedImageUrl.pathname.startsWith("/images/seer/")) {
                    throw new Error(`魂印 Wiki 頁面 ${key} 回傳了無效圖片網址。`);
                }
                return parsedImageUrl.href;
            })
            .catch((error) => {
                seerSoulmarkImageCache.delete(key);
                throw error;
            });
        seerSoulmarkImageCache.set(key, promise);
    }
    return promise;
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
    activateTab("seer-lookup-section");
    seerLookupIdInput.value = petId;
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
        const skins = await fetchSeerSkinCatalog();
        if (requestId !== seerRelatedSkinsRequestId || seerRelatedSkinsModal.hidden) return;
        const matchingSkins = skins
            .filter((skin) => String(skin && skin.pet && skin.pet.id) === String(petId))
            .sort((first, second) => Number(second.id) - Number(first.id));
        if (!matchingSkins.length) {
            seerRelatedSkinsMessage.textContent = "找不到這隻精靈的關聯皮膚。";
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
                `https://img.yuyuqaq.cn/seer-common/common_pet_skin_icon_${categoryId}.png`;
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
    activateTab("seer-lookup-section");
    seerLookupIdInput.value = String(skinId);
    seerLookupIdInput.focus();
    startSeerPetLookup(String(skinId));
}

function openSeerPetInfoModal() {
    if (!currentSeerPetData || !currentSeerPetId || !seerPetInfoModal.hidden) return;
    seerPetInfoOpener = document.activeElement;
    seerPetInfoModal.classList.remove("is-closing");
    seerPetInfoModal.hidden = false;
    updateSeerModalScrollLock();
    seerPetInfoClose.focus();
    void loadSeerPetInfo(currentSeerPetData);
}

function updateSeerModalScrollLock() {
    document.body.classList.toggle(
        "has-admin-confirm-modal",
        !seerPetInfoModal.hidden || !seerExternalLinkModal.hidden || !seerRelatedSkinsModal.hidden
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

function openSeerExternalLinkModal() {
    if (!currentSeerInfoUrl) return;
    externalLinkOpener = document.activeElement;
    seerExternalLinkOpen.href = currentSeerInfoUrl;
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
