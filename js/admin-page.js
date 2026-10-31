import { createAdminDialogs } from "./admin/confirm-dialog.js";
import { createAdminServerSettings } from "./admin/server-settings.js";
import { createAdminDateInputs } from "./admin/date-inputs.js";
import { createAdminNavigation } from "./admin/navigation.js";
import { createCompetitivePreview } from "./admin/competitive-preview.js";
import { createCompetitiveEditor } from "./admin/competitive-editor.js";
import { createAdminSession } from "./admin/session-controller.js";
import { getAdminErrorMessage } from "./admin/error-message.js";
import { mapWithConcurrency } from "./shared/concurrency.js";
import { toCsvCell } from "./shared/csv.js";
import { parseCompetitivePoolPetIds } from "./admin/import-parsers.js";
import { createChineseConverters } from "./shared/chinese.js";
import { fetchAdminJson as fetchJson } from "./shared/http.js";
import { Converter } from "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/esm/full.js";
import { getSession, login, logout } from "./auth.js";
import { isAdmin } from "./admin.js";
import {
    getAdminCompetitivePools,
    createCompetitivePool,
    updateCompetitivePool,
    deleteCompetitivePool,
    getCompetitivePoolCharacters,
    addCompetitivePoolCharacter,
    addCompetitivePoolCharacters,
    deleteCompetitivePoolCharacter
} from "./competitive-pool.js";
import { getSeerServerSettings, updateSeerServerSettings } from "./seer-server-settings.js";
import { createPetTypeIcons } from "./shared/pet-type-icons.js";
import { preloadSeerIcons } from "./seer-icons.js";

const adminToolTabs = Array.from(document.querySelectorAll("[data-admin-tab]"));

const poolList = document.getElementById("competitive-pool-admin-list");

const competitivePoolNameInput = document.getElementById("competitive-pool-name");

const competitivePoolImportProgress = document.getElementById("competitive-pool-import-progress");

const { toTraditionalChinese, convertToSimplifiedChinese } = createChineseConverters(Converter);

const { showConfirmDialog, showAdminNotification, showNextAdminNotification, finishConfirmDialog } = createAdminDialogs({

});
const { loadTaiwanSeerSettings, saveTaiwanSeerSettings } = createAdminServerSettings({
    getSeerServerSettings: (...args) => getSeerServerSettings(...args),
    getAdminErrorMessage: (...args) => getAdminErrorMessage(...args),
    updateSeerServerSettings: (...args) => updateSeerServerSettings(...args)
});
const { initializeDateTimePickers, initializeTimeSelects, setPoolDateValue, setPoolDatePickersDisabled, toIsoDate, toLocalDateTime, formatDate } = createAdminDateInputs({

});
const { activateAdminTool } = createAdminNavigation({
    adminToolTabs
});
const { observeCharacterTypeIcon, clearObservedTypeIcons } = createPetTypeIcons({ fetchSeerJson: fetchJson });
function requestCharacterTypeIcon(characterId, icon) {
    icon.addEventListener("load", () => { icon.hidden = false; }, { once: true });
    icon.dataset.characterId = String(characterId);
    observeCharacterTypeIcon(icon);
}
const { openCompetitivePoolPreview, closeCompetitivePoolPreview, selectCompetitivePoolPreviewType, handleCompetitivePoolPreviewKeydown, handleCompetitivePoolPreviewTabKeydown, formatCompetitivePoolPreviewDate } = createCompetitivePreview({
    competitivePoolNameInput,
    toIsoDate: (...args) => toIsoDate(...args),
    requestCharacterTypeIcon: (...args) => requestCharacterTypeIcon(...args),
    clearObservedTypeIcons,
    getPreviewCharacters: (...args) => getPreviewCharacters(...args)
});
const { loadAdminCompetitivePools, renderAdminCompetitivePools, showNewCompetitivePoolEditor, closeCompetitivePoolEditor, openCompetitivePoolEditor, saveCompetitivePool, deleteSelectedCompetitivePool, loadCompetitivePoolCharacters, exportCompetitivePoolCsv, renderCompetitivePoolCharacters, lookupCompetitivePet, fetchCompetitivePet, clearCompetitivePetPreview, addSelectedCompetitivePet, updateCompetitivePoolImportCount, resetCompetitivePoolImport, importCompetitivePoolCharacters, removeCompetitivePoolCharacter, getPreviewCharacters } = createCompetitiveEditor({
    getAdminCompetitivePools: (...args) => getAdminCompetitivePools(...args),
    showAdminNotification: (...args) => showAdminNotification(...args),
    getAdminErrorMessage: (...args) => getAdminErrorMessage(...args),
    formatDate: (...args) => formatDate(...args),
    setPoolDateValue: (...args) => setPoolDateValue(...args),
    competitivePoolNameInput,
    toLocalDateTime: (...args) => toLocalDateTime(...args),
    toIsoDate: (...args) => toIsoDate(...args),
    updateCompetitivePool: (...args) => updateCompetitivePool(...args),
    createCompetitivePool: (...args) => createCompetitivePool(...args),
    showConfirmDialog: (...args) => showConfirmDialog(...args),
    deleteCompetitivePool: (...args) => deleteCompetitivePool(...args),
    getCompetitivePoolCharacters: (...args) => getCompetitivePoolCharacters(...args),
    toCsvCell: (...args) => toCsvCell(...args),
    fetchJson: (...args) => fetchJson(...args),
    toTraditionalChinese,
    convertToSimplifiedChinese,
    addCompetitivePoolCharacter: (...args) => addCompetitivePoolCharacter(...args),
    competitivePoolImportProgress,
    parseCompetitivePoolPetIds: (...args) => parseCompetitivePoolPetIds(...args),
    mapWithConcurrency: (...args) => mapWithConcurrency(...args),
    addCompetitivePoolCharacters: (...args) => addCompetitivePoolCharacters(...args),
    deleteCompetitivePoolCharacter: (...args) => deleteCompetitivePoolCharacter(...args)
});
const { loadAdminPage, showAdminWorkspace } = createAdminSession({
    logout: (...args) => logout(...args),
    showAdminNotification: (...args) => showAdminNotification(...args),
    getAdminErrorMessage: (...args) => getAdminErrorMessage(...args),
    login: (...args) => login(...args),
    isAdmin: (...args) => isAdmin(...args),
    getSession: (...args) => getSession(...args),
    errorContainer: poolList,
    loadWorkspace: async () => {
        await loadAdminCompetitivePools();
        await loadTaiwanSeerSettings();
    }
});

initializeTimeSelects();
initializeDateTimePickers();
preloadSeerIcons();
loadAdminPage();
