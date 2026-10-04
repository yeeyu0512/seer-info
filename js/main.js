import { Converter } from "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/esm/full.js";
import { login, logout, getSession, register } from "./auth.js";
import { supabaseClient } from "./supabase.js";
import { initSeerLookup } from "./seer-lookup.js";
import { preloadSeerIcons } from "./seer-icons.js";
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
const aboutSection = document.getElementById("about-section");
const votingSubTabs = document.getElementById("voting-sub-tabs");
const encyclopediaSubTabs = document.getElementById("encyclopedia-sub-tabs");
const primaryMainTabs = Array.from(document.querySelectorAll("[data-main-target]"));
const voteSubTabs = Array.from(votingSubTabs.querySelectorAll("[data-tab-target]"));
const encyclopediaModeTabs = Array.from(encyclopediaSubTabs.querySelectorAll("[data-lookup-mode]"));
const seerLookupSection = document.getElementById("seer-lookup-section");
const sealEncyclopediaSection = document.getElementById("seal-encyclopedia-section");
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
const gameAccountForm = document.getElementById("game-account-form");
const gameAccountInput = document.getElementById("game-account-input");
const bindGameAccountButton = document.getElementById("bind-game-account-button");
const gameAccountMessage = document.getElementById("game-account-message");
const gameAccountUnbound = document.getElementById("game-account-unbound");
const gameAccountBound = document.getElementById("game-account-bound");
const boundGameAccount = document.getElementById("bound-game-account");
const rankingSection = document.getElementById("ranking-section");
const votePanels = new Map([
    ["selection-panel", selectionPanel],
    ["ranking-section", rankingSection],
    ["competitive-pool-section", competitivePoolSection]
]);

let currentPool = null;
let currentVotePanelId = "selection-panel";
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
const characterTypeIconQueue = [];
const observedTypeIconElements = new Set();
let activeTypeIconRequests = 0;
let competitivePoolRequestId = 0;
let currentCompetitivePoolCharacters = [];
let selectedCompetitivePoolType = "banned";
const TYPE_ICON_REQUEST_LIMIT = 4;
const RANKINGS_PER_PAGE = 10;
const CHARACTERS_PER_PAGE = 28;
const s2tConverter = Converter({ from: "cn", to: "tw" });
const t2sConverter = Converter({ from: "tw", to: "cn" });
const LOGIN_ENABLED = false;
const REGISTRATION_ENABLED = false;

if (!LOGIN_ENABLED) {
    loginButton.disabled = true;
    loginButton.textContent = "本站暫時不開放登入";
}

if (!REGISTRATION_ENABLED) {
    registerButton.hidden = true;
    authModeToggle.hidden = true;
}

const typeIconObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        const icon = entry.target;
        icon.dataset.visible = String(entry.isIntersecting);
        if (entry.isIntersecting) {
            loadCharacterTypeIcon(icon.dataset.characterId, icon);
        }
    });
});

const seerLookup = initSeerLookup({
    activateTab,
    convertToTraditionalChinese,
    convertToSimplifiedChinese,
    fetchSeerJson
});
preloadSeerIcons();

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

primaryMainTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.mainTarget;
        activateTab(target === "voting"
            ? currentVotePanelId
            : target === "encyclopedia"
                ? "seer-lookup-section"
                : target === "account"
                    ? "account-section"
                    : "about-section");
    });
});
voteSubTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        activateTab(tab.dataset.tabTarget);
    });
});
encyclopediaModeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        if (tab.dataset.lookupMode === "seal") {
            activateTab("seal-encyclopedia-section");
            return;
        }
        seerLookup.setMode(tab.dataset.lookupMode);
        activateTab("seer-lookup-section");
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
    const isLookup = targetId === "seer-lookup-section";
    const isSealEncyclopedia = targetId === "seal-encyclopedia-section";
    const isAccount = targetId === "account-section";
    const isAbout = targetId === "about-section";
    const mainTarget = isAbout ? "about" : isAccount ? "account" : isLookup || isSealEncyclopedia ? "encyclopedia" : "voting";
    if (!isLookup && !isAccount && votePanels.has(targetId)) currentVotePanelId = targetId;

    voteSection.hidden = mainTarget !== "voting";
    seerLookupSection.hidden = !isLookup;
    sealEncyclopediaSection.hidden = !isSealEncyclopedia;
    accountSection.hidden = !isAccount;
    aboutSection.hidden = !isAbout;
    votingSubTabs.hidden = mainTarget !== "voting";
    encyclopediaSubTabs.hidden = mainTarget !== "encyclopedia";
    votePanels.forEach((panel, panelId) => {
        panel.hidden = panelId !== currentVotePanelId;
    });
    primaryMainTabs.forEach((tab) => {
        const isActive = tab.dataset.mainTarget === mainTarget;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
    });
    voteSubTabs.forEach((tab) => {
        const isActive = mainTarget === "voting" && tab.dataset.tabTarget === currentVotePanelId;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
    });
    encyclopediaModeTabs.forEach((tab) => {
        const isActive = mainTarget === "encyclopedia" && (
            isSealEncyclopedia
                ? tab.dataset.lookupMode === "seal"
                : tab.dataset.lookupMode === seerLookup.getMode()
        );
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
    });
    if (targetId === "competitive-pool-section") loadCurrentCompetitivePool();
    if (isLookup) seerLookup.browseLatestIfEmpty();
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
        const item = document.createElement("button");
        const avatar = document.createElement("img");
        const typeIcon = createCharacterTypeIcon(character.seer_pet_id);
        const marker = document.createElement("span");
        const petId = document.createElement("span");
        const petName = document.createElement("strong");

        item.className = `character-card public-character-card competitive-pool-pet ${type.className}`;
        item.type = "button";
        item.setAttribute("aria-label", `查看${character.pet_name}精靈資訊`);
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
        item.addEventListener("click", () => seerLookup.openPetInfo(character.seer_pet_id));
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
    if (!LOGIN_ENABLED) return;

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
    if (!REGISTRATION_ENABLED) return;

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
    if (!REGISTRATION_ENABLED) return;
    setAuthMode(!isRegisterMode);
});

function setAuthMode(registerMode) {
    if (registerMode && !REGISTRATION_ENABLED) return;
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
        const card = document.createElement("article");
        const checkbox = document.createElement("input");
        card.className = "character-card";
        checkbox.type = "checkbox";
        checkbox.value = character.id;
        checkbox.dataset.characterId = character.character_id;
        checkbox.setAttribute("aria-label", `選擇${character.character_name}`);
        checkbox.checked = selectedPoolCharacterIds.has(String(character.id));
        checkbox.disabled = isVoteLocked || !hasMiMiBinding;
        card.classList.toggle("selected", checkbox.checked);
        card.hidden = isVoteLocked && !checkbox.checked;
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) selectedPoolCharacterIds.add(String(character.id));
            else selectedPoolCharacterIds.delete(String(character.id));
            card.classList.toggle("selected", checkbox.checked);
            updateSelectionCount();
        });
        checkbox.addEventListener("click", (event) => event.stopPropagation());
        card.addEventListener("click", (event) => {
            if (event.target.closest(".character-name-info, input") || checkbox.disabled) return;
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event("change", { bubbles: true }));
        });

        const portrait = createCharacterPortrait(character);
        const checkmark = document.createElement("span");
        checkmark.className = "character-check";
        checkmark.textContent = "✓";
        const characterId = document.createElement("span");
        characterId.className = "character-id";
        characterId.textContent = `#${character.character_id}`;
        const characterName = document.createElement("button");
        characterName.className = "character-name character-name-info";
        characterName.type = "button";
        characterName.setAttribute("aria-label", `查看${character.character_name}精靈資訊`);
        const typeIcon = appendCharacterName(characterName, character.character_name, character.character_id);
        characterName.addEventListener("click", () => seerLookup.openPetInfo(character.character_id));
        card.append(checkbox, portrait, typeIcon, checkmark, characterId, characterName);
        characterList.appendChild(card);
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
    return `./seer_icons/${resolvedTypeId}.png`;
}

async function fetchSeerJson(url, options = {}) {
    const response = await fetch(url, { headers: { Accept: "application/json" }, ...options });
    if (!response.ok) throw new Error(`SeerAPI 請求失敗（${response.status}）`);
    return response.json();
}

function convertToTraditionalChinese(value) {
    if (!value) return "";
    try {
        return value.split(/([岳杰托里背])/).map((part) => "岳杰托里背".includes(part) ? part : s2tConverter(part)).join("");
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
        const row = document.createElement("button");
        const character = findRankingCharacter(item);
        const characterId = item.character_id ?? character?.character_id ?? "—";
        row.className = "ranking-item";
        row.type = "button";
        row.setAttribute("aria-label", `查看${item.character_name}精靈資訊`);
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
            row.addEventListener("click", () => seerLookup.openPetInfo(characterId));
        } else {
            row.disabled = true;
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
