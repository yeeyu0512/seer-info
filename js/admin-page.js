import { createAdminDialogs } from "./admin/confirm-dialog.js";
import { createAdminServerSettings } from "./admin/server-settings.js";
import { createAdminDateInputs } from "./admin/date-inputs.js";
import { createAdminNavigation } from "./admin/navigation.js";
import { createVoteRecordsController } from "./admin/vote-records.js";
import { createCharacterManager } from "./admin/character-manager.js";
import { createPoolEditor } from "./admin/pool-editor.js";
import { createCompetitivePreview } from "./admin/competitive-preview.js";
import { createCompetitiveEditor } from "./admin/competitive-editor.js";
import { createAdminSession } from "./admin/session-controller.js";
import { getAdminErrorMessage } from "./admin/error-message.js";
import { mapWithConcurrency } from "./shared/concurrency.js";
import { toCsvCell } from "./shared/csv.js";
import { parseImportedCharacters, parseCompetitivePoolPetIds } from "./admin/import-parsers.js";
import { createChineseConverters } from "./shared/chinese.js";
import { fetchAdminJson as fetchJson } from "./shared/http.js";
import { Converter } from "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/esm/full.js";
import { getSession, login, logout } from "./auth.js";
import { getPoolCharacters } from "./pool.js";
import {
    isAdmin,
    getAdminPools,
    createPool,
    updatePoolDraft,
    addPoolCharacter,
    deletePoolCharacter,
    startPool,
    closePool,
    returnPoolToDraft,
    deletePool,
    getPoolVoteDetails
} from "./admin.js";
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
import { preloadSeerIcons } from "./seer-icons.js";

const adminContent = document.getElementById("admin-content");

const adminToolTabs = Array.from(document.querySelectorAll("[data-admin-tab]"));

const poolList = document.getElementById("admin-pool-list");

const characterForm = document.getElementById("character-form");

const characterImportForm = document.getElementById("character-import-form");

const deleteAllCharactersProgress = document.getElementById("delete-all-characters-progress");

const competitivePoolNameInput = document.getElementById("competitive-pool-name");

const competitivePoolImportProgress = document.getElementById("competitive-pool-import-progress");

const { toTraditionalChinese } = createChineseConverters(Converter);

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
const { loadVoteRecords, exportVoteRecords, renderVoteRecords } = createVoteRecordsController({
    getPoolVoteDetails: (...args) => getPoolVoteDetails(...args),
    showAdminNotification: (...args) => showAdminNotification(...args),
    getAdminErrorMessage: (...args) => getAdminErrorMessage(...args),
    formatDate: (...args) => formatDate(...args),
    toCsvCell: (...args) => toCsvCell(...args),
    getSelectedPool: (...args) => getSelectedPool(...args)
});
const { renderSeerPreview, clearSeerPreview, lookupSeerPet, loadCharacters, renderCharacters, deleteAllPoolCharacters, exportCharacters, renderCharacter, requestCharacterTypeIcon, processCharacterTypeMetadataQueue, fetchCharacterTypeIconUrl } = createCharacterManager({
    characterForm,
    showAdminNotification: (...args) => showAdminNotification(...args),
    addPoolCharacter: (...args) => addPoolCharacter(...args),
    getAdminErrorMessage: (...args) => getAdminErrorMessage(...args),
    parseImportedCharacters: (...args) => parseImportedCharacters(...args),
    characterImportForm,
    mapWithConcurrency: (...args) => mapWithConcurrency(...args),
    fetchJson: (...args) => fetchJson(...args),
    toTraditionalChinese,
    getPoolCharacters: (...args) => getPoolCharacters(...args),
    showConfirmDialog: (...args) => showConfirmDialog(...args),
    deleteAllCharactersProgress,
    deletePoolCharacter: (...args) => deletePoolCharacter(...args),
    toCsvCell: (...args) => toCsvCell(...args),
    getSelectedPool: (...args) => getSelectedPool(...args)
});
const { changePoolStatus, deleteSelectedPool, loadPools, renderPools, selectPool, showCreatePoolEditor, getSelectedPool } = createPoolEditor({
    toIsoDate: (...args) => toIsoDate(...args),
    showAdminNotification: (...args) => showAdminNotification(...args),
    updatePoolDraft: (...args) => updatePoolDraft(...args),
    createPool: (...args) => createPool(...args),
    getAdminErrorMessage: (...args) => getAdminErrorMessage(...args),
    showConfirmDialog: (...args) => showConfirmDialog(...args),
    startPool: (...args) => startPool(...args),
    closePool: (...args) => closePool(...args),
    returnPoolToDraft: (...args) => returnPoolToDraft(...args),
    deletePool: (...args) => deletePool(...args),
    getAdminPools: (...args) => getAdminPools(...args),
    poolList,
    formatDate: (...args) => formatDate(...args),
    deleteAllCharactersProgress,
    characterForm,
    clearSeerPreview: (...args) => clearSeerPreview(...args),
    setPoolDateValue: (...args) => setPoolDateValue(...args),
    toLocalDateTime: (...args) => toLocalDateTime(...args),
    setPoolDatePickersDisabled: (...args) => setPoolDatePickersDisabled(...args),
    characterImportForm,
    loadCharacters: (...args) => loadCharacters(...args),
    loadVoteRecords: (...args) => loadVoteRecords(...args)
});
const { openCompetitivePoolPreview, closeCompetitivePoolPreview, selectCompetitivePoolPreviewType, handleCompetitivePoolPreviewKeydown, handleCompetitivePoolPreviewTabKeydown, formatCompetitivePoolPreviewDate } = createCompetitivePreview({
    competitivePoolNameInput,
    toIsoDate: (...args) => toIsoDate(...args),
    requestCharacterTypeIcon: (...args) => requestCharacterTypeIcon(...args),
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
    poolList,
    loadPools: (...args) => loadPools(...args),
    loadAdminCompetitivePools: (...args) => loadAdminCompetitivePools(...args),
    loadTaiwanSeerSettings: (...args) => loadTaiwanSeerSettings(...args)
});

initializeTimeSelects();
initializeDateTimePickers();
preloadSeerIcons();
loadAdminPage();
