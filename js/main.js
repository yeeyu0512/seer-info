import { createAuthView } from "./account/auth-view.js";
import { createSessionController } from "./app/session-controller.js";
import { login, logout, getSession } from "./auth.js";
import { isAdmin } from "./admin.js";
import { supabaseClient } from "./supabase.js";
import { createPetTypeIcons } from "./shared/pet-type-icons.js";
import { createCompetitiveView } from "./competitive/view-controller.js";
import { createNavigation } from "./app/navigation.js";
import { initDamageCalculator } from "./damage/view.js";
import { initHome } from "./app/home.js";
import { createChineseConverters } from "./shared/chinese.js";
import { fetchSeerJson } from "./shared/http.js";
import { Converter } from "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/esm/full.js";
import { initSeerLookup } from "./seer-lookup.js";
import { initSeerTypeCalculator } from "./seer-type-calculator.js";
import { initSeerMintmarks } from "./seer-mintmarks.js";
import { initSeerSuits } from "./seer-suits.js";
import { initSeerTraining } from "./seer-training.js";
import { getSeerServerSettings } from "./seer-server-settings.js";
import { preloadSeerIcons } from "./seer-icons.js";
import { getCurrentCompetitivePool } from "./competitive-pool.js";
const primaryMainTabs = Array.from(document.querySelectorAll("[data-main-target]"));
const sealEncyclopediaSection = document.getElementById("seal-encyclopedia-section");
const suitEncyclopediaSection = document.getElementById("suit-encyclopedia-section");
const typeChartSection = document.getElementById("type-chart-section");
const trainingSection = document.getElementById("training-section");
const damageSection = document.getElementById("damage-calculator-section");
const damageCalculator = { load() {
    if (!damageSection.hasChildNodes()) initDamageCalculator(damageSection);
    queueMicrotask(() => {
        const notice = document.getElementById("damage-testing-notice");
        if (!damageSection.hidden && !notice.open) notice.showModal();
    });
} };
const encyclopediaSubTabs = document.getElementById("encyclopedia-sub-tabs");
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
const { activateTab, restoreRouteFromUrl } = createNavigation({
    primaryMainTabs,
    seerLookup,
    sealEncyclopediaSection,
    seerMintmarks,
    suitEncyclopediaSection,
    seerSuits,
    typeChartSection,
    trainingSection,
    seerTraining,
    damageCalculator,
    encyclopediaSubTabs,
    loadCurrentCompetitivePool: (...args) => loadCurrentCompetitivePool(...args),
});

initHome({ seerLookup, activateTab });
preloadSeerIcons();
const session = createSessionController({ getSession, isAdmin, logout, supabaseClient, activateTab });
createAuthView({ login, onAuthenticated: () => session.checkSession() });
session.checkSession().then(() => restoreRouteFromUrl({ initial: true }));
