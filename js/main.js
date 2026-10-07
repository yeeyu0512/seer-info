import { createPetTypeIcons } from "./shared/pet-type-icons.js";
import { createCompetitiveView } from "./competitive/view-controller.js";
import { createGameAccountController } from "./account/game-account-controller.js";
import { createVotingController } from "./voting/controller.js";
import { createRankingController } from "./voting/ranking-controller.js";
import { createNavigation } from "./app/navigation.js";
import { createAuthView } from "./account/auth-view.js";
import { createSessionController } from "./app/session-controller.js";
import { createChineseConverters } from "./shared/chinese.js";
import { fetchSeerJson } from "./shared/http.js";
import { Converter } from "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/esm/full.js";
import { login, logout, getSession, register } from "./auth.js";
import { supabaseClient } from "./supabase.js";
import { initSeerLookup } from "./seer-lookup.js";
import { initSeerTypeCalculator } from "./seer-type-calculator.js";
import { initSeerMintmarks } from "./seer-mintmarks.js";
import { initSeerSuits } from "./seer-suits.js";
import { initSeerTraining } from "./seer-training.js";
import { getSeerServerSettings } from "./seer-server-settings.js";
import { preloadSeerIcons } from "./seer-icons.js";
import { getActivePool, getPoolCharacters } from "./pool.js";
import { getMyVote, hasVoted, submitVote } from "./vote.js";
import { getPoolRanking } from "./ranking.js";
import { isAdmin } from "./admin.js";
import { bindGameAccount, getMyGameAccount } from "./game-account.js";
import { getCurrentCompetitivePool } from "./competitive-pool.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginMessage = document.getElementById("login-message");

const passwordConfirmInput = document.getElementById("password-confirm");

const mimiIdInput = document.getElementById("mimi-id");

const loginModal = document.getElementById("login-modal");
const loginTrigger = document.getElementById("login-trigger");

const publicLoginPrompt = document.getElementById("public-login-prompt");

const mimiBindingPrompt = document.getElementById("mimi-binding-prompt");

const selectionPanel = document.getElementById("selection-panel");
const selectionBar = document.getElementById("selection-bar");
const submitButton = document.getElementById("submit-button");
const voteMessage = document.getElementById("vote-message");

const selectionCount = document.getElementById("selection-count");
const selectionMax = document.getElementById("selection-max");
const alreadyVoted = document.getElementById("already-voted");

const accountSection = document.getElementById("account-section");

const votingSubTabs = document.getElementById("voting-sub-tabs");
const encyclopediaSubTabs = document.getElementById("encyclopedia-sub-tabs");
const primaryMainTabs = Array.from(document.querySelectorAll("[data-main-target]"));

const sealEncyclopediaSection = document.getElementById("seal-encyclopedia-section");
const suitEncyclopediaSection = document.getElementById("suit-encyclopedia-section");
const typeChartSection = document.getElementById("type-chart-section");
const trainingSection = document.getElementById("training-section");
const competitivePoolSection = document.getElementById("competitive-pool-section");

const rankingPagination = document.getElementById("ranking-pagination");

const rankingSection = document.getElementById("ranking-section");
const votePanels = new Map([
    ["selection-panel", selectionPanel],
    ["ranking-section", rankingSection],
    ["competitive-pool-section", competitivePoolSection]
]);

const { convertToTraditionalChinese, convertToSimplifiedChinese } = createChineseConverters(Converter);

const seerLookup = initSeerLookup({
    activateTab: (...args) => activateTab(...args),
    openTypeLookup(typeId) {
        if (!seerTypeCalculator.openLookup(typeId)) return;
        activateTab("type-chart-section");
        typeChartSection.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("type-calc-tab-lookup").focus({ preventScroll: true });
    },
    convertToTraditionalChinese,
    convertToSimplifiedChinese,
    fetchSeerJson
});
const seerTypeCalculator = initSeerTypeCalculator("#type-chart-section");
const seerMintmarks = initSeerMintmarks(sealEncyclopediaSection, { fetchSeerJson, convertToTraditionalChinese, getSeerServerSettings });
const seerSuits = initSeerSuits(suitEncyclopediaSection, { fetchSeerJson, convertToTraditionalChinese });
const seerTraining = initSeerTraining(trainingSection, { fetchSeerJson, convertToTraditionalChinese, convertToSimplifiedChinese });
const { createCharacterTypeIcon, clearObservedTypeIcons, loadCharacterTypeIcon, processCharacterTypeIconQueue, fetchCharacterTypeIconUrl } = createPetTypeIcons({
    fetchSeerJson: (...args) => fetchSeerJson(...args)
});
const { loadCurrentCompetitivePool, updateCompetitivePoolTypeTabs, renderCompetitivePoolCharacters, formatCompetitivePoolDate } = createCompetitiveView({
    getCurrentCompetitivePool: (...args) => getCurrentCompetitivePool(...args),
    clearObservedTypeIcons: (...args) => clearObservedTypeIcons(...args),
    createCharacterTypeIcon: (...args) => createCharacterTypeIcon(...args),
    seerLookup
});
const { loadGameAccount, renderGameAccount, getHasMiMiBinding } = createGameAccountController({
    bindGameAccount: (...args) => bindGameAccount(...args),
    loadPool: (...args) => loadPool(...args),
    getMyGameAccount: (...args) => getMyGameAccount(...args),
    getIsAuthenticated: (...args) => getIsAuthenticated(...args)
});
const { loadPool, renderVoteCharacters, renderCurrentVoteCharacters, restoreSavedVote, renderPublicCharacterPage, sortCharactersByIdDescending, updateCharacterPagination, renderCurrentCharacterPage, createCharacterPortrait, appendCharacterName, renderPoolMeta, renderNoActivePool, updateSelectionCount, getCurrentPool, getCharacters, resetPool } = createVotingController({
    publicLoginPrompt,
    mimiBindingPrompt,
    selectionBar,
    alreadyVoted,
    submitButton,
    getActivePool: (...args) => getActivePool(...args),
    getPoolCharacters: (...args) => getPoolCharacters(...args),
    hasVoted: (...args) => hasVoted(...args),
    getMyVote: (...args) => getMyVote(...args),
    voteMessage,
    clearObservedTypeIcons: (...args) => clearObservedTypeIcons(...args),
    seerLookup,
    createCharacterTypeIcon: (...args) => createCharacterTypeIcon(...args),
    resetRanking: (...args) => resetRanking(...args),
    rankingPagination,
    selectionCount,
    selectionMax,
    submitVote: (...args) => submitVote(...args),
    loadRanking: (...args) => loadRanking(...args),
    getIsAuthenticated: (...args) => getIsAuthenticated(...args),
    getIsAdministrator: (...args) => getIsAdministrator(...args),
    getHasMiMiBinding: (...args) => getHasMiMiBinding(...args)
});
const { loadRanking, renderRanking, findRankingCharacter, startRankingRefresh, stopRankingRefresh, resetRanking } = createRankingController({
    clearObservedTypeIcons: (...args) => clearObservedTypeIcons(...args),
    rankingPagination,
    getPoolRanking: (...args) => getPoolRanking(...args),
    createCharacterTypeIcon: (...args) => createCharacterTypeIcon(...args),
    seerLookup,
    getCurrentPool: (...args) => getCurrentPool(...args),
    getCharacters: (...args) => getCharacters(...args),
    getIsAdministrator: (...args) => getIsAdministrator(...args)
});
const { activateTab } = createNavigation({
    primaryMainTabs,
    seerLookup,
    votePanels,
    sealEncyclopediaSection,
    seerMintmarks,
    suitEncyclopediaSection,
    seerSuits,
    typeChartSection,
    trainingSection,
    seerTraining,
    accountSection,
    votingSubTabs,
    encyclopediaSubTabs,
    loadCurrentCompetitivePool: (...args) => loadCurrentCompetitivePool(...args),
    getIsAdministrator: (...args) => getIsAdministrator(...args)
});
const { openLoginModal, closeLoginModal, setAuthMode, getChineseAuthError } = createAuthView({
    loginTrigger,
    activateTab: (...args) => activateTab(...args),
    loginModal,
    emailInput,
    loginMessage,
    passwordInput,
    login: (...args) => login(...args),
    showAuthenticatedView: (...args) => showAuthenticatedView(...args),
    initializeAuthenticatedPage: (...args) => initializeAuthenticatedPage(...args),
    passwordConfirmInput,
    mimiIdInput,
    register: (...args) => register(...args)
});
const { initializeAuthenticatedPage, initializePublicPage, showAuthenticatedView, showLoggedOutView, syncAdminLink, checkSession, getIsAuthenticated, getIsAdministrator } = createSessionController({
    publicLoginPrompt,
    stopRankingRefresh: (...args) => stopRankingRefresh(...args),
    activateTab: (...args) => activateTab(...args),
    loadGameAccount: (...args) => loadGameAccount(...args),
    selectionPanel,
    selectionBar,
    loadPool: (...args) => loadPool(...args),
    loadRanking: (...args) => loadRanking(...args),
    startRankingRefresh: (...args) => startRankingRefresh(...args),
    alreadyVoted,
    submitButton,
    voteMessage,
    mimiBindingPrompt,
    selectionCount,
    selectionMax,
    logout: (...args) => logout(...args),
    loginModal,
    loginTrigger,
    primaryMainTabs,
    accountSection,
    resetPool: (...args) => resetPool(...args),
    renderGameAccount: (...args) => renderGameAccount(...args),
    emailInput,
    passwordInput,
    passwordConfirmInput,
    mimiIdInput,
    setAuthMode: (...args) => setAuthMode(...args),
    loginMessage,
    isAdmin: (...args) => isAdmin(...args),
    supabaseClient,
    getSession: (...args) => getSession(...args)
});

preloadSeerIcons();

checkSession();
