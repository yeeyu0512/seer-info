import { Converter } from "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/esm/full.js";
import { getSession, logout } from "./auth.js";
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

const adminWorkspace = document.getElementById("admin-workspace");
const adminContent = document.getElementById("admin-content");
const accessDenied = document.getElementById("access-denied");
const poolList = document.getElementById("admin-pool-list");
const logoutButton = document.getElementById("logout-button");
const editor = document.getElementById("pool-editor");
const poolForm = document.getElementById("pool-form");
const poolFormMessage = document.getElementById("pool-form-message");
const characterManager = document.getElementById("character-manager");
const characterEditControls = document.getElementById("character-edit-controls");
const characterForm = document.getElementById("character-form");
const characterFormMessage = document.getElementById("character-form-message");
const lookupSeerPetButton = document.getElementById("lookup-seer-pet-button");
const seerPetIdInput = document.getElementById("seer-pet-id");
const seerPetPreview = document.getElementById("seer-pet-preview");
const seerPetIcon = document.getElementById("seer-pet-icon");
const seerPetTypeIcon = document.getElementById("seer-pet-type-icon");
const seerPetTypeName = document.getElementById("seer-pet-type-name");
const seerPetName = document.getElementById("seer-pet-name");
const seerPetIdPreview = document.getElementById("seer-pet-id-preview");
let resolvedSeerPetId = null;
const characterImportForm = document.getElementById("character-import-form");
const characterImportText = document.getElementById("character-import-text");
const characterImportCount = document.getElementById("character-import-count");
const characterImportMessage = document.getElementById("character-import-message");
const characterImportProgress = document.getElementById("character-import-progress");
const characterImportProgressText = document.getElementById("character-import-progress-text");
const characterImportProgressPercent = document.getElementById("character-import-progress-percent");
const characterImportProgressBar = document.getElementById("character-import-progress-bar");
const characterImportProgressFill = document.getElementById("character-import-progress-fill");
const characterList = document.getElementById("admin-character-list");
const characterCount = document.getElementById("admin-character-count");
const characterSearch = document.getElementById("admin-character-search");
const exportCharactersButton = document.getElementById("export-characters-button");
const characterPreviousPageButton = document.getElementById("admin-character-previous-page");
const characterNextPageButton = document.getElementById("admin-character-next-page");
const characterPage = document.getElementById("admin-character-page");
const adminConfirmModal = document.getElementById("admin-confirm-modal");
const adminConfirmMessage = document.getElementById("admin-confirm-message");
const adminConfirmCancelButton = document.getElementById("admin-confirm-cancel");
const adminConfirmAcceptButton = document.getElementById("admin-confirm-accept");
const characterTypeMetadataCache = new Map();
const characterTypeMetadataQueue = [];
const observedCharacterRows = new Set();
let activeCharacterTypeMetadataRequests = 0;
const startPoolButton = document.getElementById("start-pool-button");
const draftPoolButton = document.getElementById("draft-pool-button");
const closePoolButton = document.getElementById("close-pool-button");
const deletePoolButton = document.getElementById("delete-pool-button");
const voteRecordList = document.getElementById("admin-vote-record-list");
const voteRecordSummary = document.getElementById("vote-record-summary");
const refreshVoteRecordsButton = document.getElementById("refresh-vote-records-button");
const exportVoteRecordsButton = document.getElementById("export-vote-records-button");
const voteRecordSearch = document.getElementById("vote-record-search");
const voteRecordPreviousButton = document.getElementById("vote-record-previous-button");
const voteRecordNextButton = document.getElementById("vote-record-next-button");
const voteRecordPage = document.getElementById("vote-record-page");
const poolDatePickers = new Map();
const adminConfirmTitle = document.getElementById("admin-confirm-title");
const competitivePoolAdminList = document.getElementById("competitive-pool-admin-list");
const competitivePoolEditor = document.getElementById("competitive-pool-editor");
const competitivePoolEditorTitle = document.getElementById("competitive-pool-editor-title");
const competitivePoolForm = document.getElementById("competitive-pool-form");
const competitivePoolNameInput = document.getElementById("competitive-pool-name");
const competitivePoolFormMessage = document.getElementById("competitive-pool-form-message");
const createCompetitivePoolButton = document.getElementById("create-competitive-pool-button");
const cancelCompetitivePoolButton = document.getElementById("cancel-competitive-pool-button");
const saveCompetitivePoolButton = document.getElementById("save-competitive-pool-button");
const deleteCompetitivePoolButton = document.getElementById("delete-competitive-pool-button");
const competitivePoolCharacterManager = document.getElementById("competitive-pool-character-manager");
const competitivePoolCharacterForm = document.getElementById("competitive-pool-character-form");
const competitivePetIdInput = document.getElementById("competitive-pet-id");
const competitivePetTypeInput = document.getElementById("competitive-pet-type");
const lookupCompetitivePetButton = document.getElementById("lookup-competitive-pet-button");
const addCompetitivePetButton = document.getElementById("add-competitive-pet-button");
const competitivePetPreview = document.getElementById("competitive-pet-preview");
const competitivePetAvatar = document.getElementById("competitive-pet-avatar");
const competitivePetName = document.getElementById("competitive-pet-name");
const competitivePetIdPreview = document.getElementById("competitive-pet-id-preview");
const competitivePetMessage = document.getElementById("competitive-pet-message");
const competitivePoolCharacterList = document.getElementById("competitive-pool-character-list");
const competitivePoolImportForm = document.getElementById("competitive-pool-import-form");
const competitivePoolImportType = document.getElementById("competitive-pool-import-type");
const competitivePoolImportIds = document.getElementById("competitive-pool-import-ids");
const competitivePoolImportCount = document.getElementById("competitive-pool-import-count");
const competitivePoolImportButton = document.getElementById("competitive-pool-import-button");
const competitivePoolImportProgress = document.getElementById("competitive-pool-import-progress");
const competitivePoolImportProgressText = document.getElementById("competitive-pool-import-progress-text");
const competitivePoolImportProgressPercent = document.getElementById("competitive-pool-import-progress-percent");
const competitivePoolImportProgressBar = competitivePoolImportProgress.querySelector("[role='progressbar']");
const competitivePoolImportProgressFill = document.getElementById("competitive-pool-import-progress-fill");
const competitivePoolImportMessage = document.getElementById("competitive-pool-import-message");

let pools = [];
let selectedPool = null;
let competitivePools = [];
let selectedCompetitivePool = null;
let competitivePoolCharacters = [];
let resolvedCompetitivePet = null;
let competitivePoolCharacterLoadRequestId = 0;
let poolCharacters = [];
let loadedCharacterPoolId = null;
let characterCurrentPage = 1;
let voteRecords = [];
let voteRecordCurrentPage = 1;
const CHARACTERS_PER_PAGE = 5;
const VOTE_RECORDS_PER_PAGE = 20;
let confirmDialogResolve = null;
let confirmDialogReturnFocus = null;
const adminNotificationQueue = [];
let showingAdminNotification = false;

adminConfirmCancelButton.addEventListener("click", () => finishConfirmDialog(false));
adminConfirmAcceptButton.addEventListener("click", () => finishConfirmDialog(true));
adminConfirmModal.addEventListener("click", (event) => {
    if (event.target === adminConfirmModal && !adminConfirmModal.classList.contains("is-closing")) {
        finishConfirmDialog(false);
    }
});
adminConfirmModal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        event.preventDefault();
        finishConfirmDialog(false);
        return;
    }
    if (event.key !== "Tab") return;

    const buttons = [adminConfirmCancelButton, adminConfirmAcceptButton].filter((button) => !button.hidden);
    const currentIndex = buttons.indexOf(document.activeElement);
    const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1)
        : (currentIndex === buttons.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    buttons[nextIndex].focus();
});

function initializeDateTimePickers() {
    if (!window.flatpickr) {
        console.warn("Flatpickr did not load; using the browser date-time input instead.");
        return;
    }

    document.querySelectorAll(".pool-datetime").forEach((input) => {
        const picker = window.flatpickr(input, {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "Y 年 n 月 j 日（D）",
            allowInput: false,
            locale: window.flatpickr.l10ns?.zh_tw ?? "default"
        });
        poolDatePickers.set(input.id, picker);
    });
}

function initializeTimeSelects() {
    document.querySelectorAll(".pool-time-select").forEach((select) => {
        for (let hour = 0; hour < 24; hour += 1) {
            for (let minute = 0; minute < 60; minute += 5) {
                const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                const option = new Option(value, value);
                select.add(option);
            }
        }
        select.value = "00:00";
    });
}

function setPoolDateValue(elementId, value) {
    const picker = poolDatePickers.get(elementId);
    const timeSelect = document.getElementById(`${elementId}-time`);
    const [datePart, timePart] = (value || "").split("T");
    if (picker) {
        picker.setDate(datePart || null, false, "Y-m-d");
    } else {
        document.getElementById(elementId).value = datePart || "";
    }
    if (timeSelect) {
        const time = timePart?.slice(0, 5) || "00:00";
        if (!Array.from(timeSelect.options).some((option) => option.value === time)) {
            timeSelect.add(new Option(time, time));
        }
        timeSelect.value = time;
    }
}

function setPoolDatePickersDisabled(disabled) {
    poolDatePickers.forEach((picker) => {
        picker.set("clickOpens", !disabled);
        picker.altInput.disabled = disabled;
    });
}

logoutButton.addEventListener("click", async () => {
    const { error } = await logout();
    if (error) {
        console.error("Logout error:", error);
        showAdminNotification(`登出失敗：${getAdminErrorMessage(error)}`, "error");
        return;
    }
    window.location.href = "./index.html";
});

document.getElementById("show-create-pool-button").addEventListener("click", showCreatePoolEditor);
document.getElementById("close-editor-button").addEventListener("click", () => { editor.hidden = true; });
createCompetitivePoolButton.addEventListener("click", showNewCompetitivePoolEditor);
cancelCompetitivePoolButton.addEventListener("click", closeCompetitivePoolEditor);
competitivePoolForm.addEventListener("submit", saveCompetitivePool);
deleteCompetitivePoolButton.addEventListener("click", deleteSelectedCompetitivePool);
competitivePetIdInput.addEventListener("input", clearCompetitivePetPreview);
lookupCompetitivePetButton.addEventListener("click", lookupCompetitivePet);
competitivePoolCharacterForm.addEventListener("submit", addSelectedCompetitivePet);
competitivePoolImportIds.addEventListener("input", updateCompetitivePoolImportCount);
competitivePoolImportForm.addEventListener("submit", importCompetitivePoolCharacters);

poolForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("pool-form-name").value.trim();
    const startAt = toIsoDate("pool-form-start");
    const endAt = toIsoDate("pool-form-end");
    const maxVotes = Number(document.getElementById("pool-form-max-votes").value);
    if (!name || !startAt || !endAt || !maxVotes) return;
    if (new Date(endAt) <= new Date(startAt)) {
        poolFormMessage.textContent = "結束時間必須晚於開始時間。";
        showAdminNotification("結束時間必須晚於開始時間，請調整後再儲存。", "error");
        return;
    }

    const saveButton = document.getElementById("save-pool-button");
    saveButton.disabled = true;
    poolFormMessage.textContent = "儲存中…";
    try {
        if (selectedPool) {
            await updatePoolDraft(selectedPool.id, name, startAt, endAt, maxVotes);
            poolFormMessage.textContent = "票選活動設定已更新。";
            showAdminNotification("票選活動設定已成功更新。", "success");
        } else {
            await createPool(name, startAt, endAt, maxVotes);
            poolFormMessage.textContent = "票選活動已建立。";
            showAdminNotification("票選活動已建立。", "success");
        }
        await loadPools();
    } catch (error) {
        console.error("Save pool error:", error);
        poolFormMessage.textContent = `儲存失敗：${getAdminErrorMessage(error)}`;
        showAdminNotification(`儲存票選活動失敗：${getAdminErrorMessage(error)}`, "error");
    } finally {
        saveButton.disabled = false;
    }
});

lookupSeerPetButton.addEventListener("click", lookupSeerPet);
seerPetIdInput.addEventListener("input", () => {
    if (resolvedSeerPetId !== null && seerPetIdInput.value.trim() !== String(resolvedSeerPetId)) {
        clearSeerPreview(false);
    }
});

characterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedPool) return;
    const characterId = Number(seerPetIdInput.value);
    const characterName = document.getElementById("character-name").value.trim();
    if (!characterName || !Number.isInteger(characterId) || characterId !== resolvedSeerPetId) {
        characterFormMessage.textContent = "請先查詢有效的精靈 ID。";
        showAdminNotification("請先查詢有效的精靈 ID，再新增角色。", "error");
        return;
    }

    const addButton = document.getElementById("add-character-button");
    addButton.disabled = true;
    characterFormMessage.textContent = "新增中…";
    try {
        await addPoolCharacter(selectedPool.id, characterId, characterName);
        characterForm.reset();
        clearSeerPreview();
        characterFormMessage.textContent = "角色已新增。";
        showAdminNotification(`已新增角色「${characterName}」。`, "success");
        await loadCharacters();
    } catch (error) {
        console.error("Add character error:", error);
        characterFormMessage.textContent = `新增失敗：${getAdminErrorMessage(error)}`;
        showAdminNotification(`新增角色失敗：${getAdminErrorMessage(error)}`, "error");
    } finally {
        addButton.disabled = false;
    }
});

characterImportText.addEventListener("input", () => {
    characterImportProgress.hidden = true;
    const { characters, invalidLines } = parseImportedCharacters(characterImportText.value);
    const lookupCount = characters.filter((character) => character.lookupName).length;
    characterImportCount.textContent = characters.length > 100
        ? `已辨識 ${characters.length} 位，超過每批 100 位上限。`
        : invalidLines.length > 0
            ? `辨識 ${characters.length} 位；${invalidLines.length} 行格式有誤。`
            : characters.length > 0
                ? `已辨識 ${characters.length} 位角色${lookupCount > 0 ? `，其中 ${lookupCount} 位將查詢 SeerAPI` : ""}。`
                : "尚未輸入角色。";
});

characterSearch.addEventListener("input", () => {
    characterCurrentPage = 1;
    renderCharacters();
});
characterPreviousPageButton.addEventListener("click", () => {
    characterCurrentPage -= 1;
    renderCharacters();
});
characterNextPageButton.addEventListener("click", () => {
    characterCurrentPage += 1;
    renderCharacters();
});

const characterTypeIconObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        const row = entry.target;
        const icon = row.querySelector(".admin-character-type-icon");
        if (!icon) return;
        icon.dataset.visible = String(entry.isIntersecting);
        if (entry.isIntersecting) {
            requestCharacterTypeIcon(Number(icon.dataset.characterId), icon);
        }
    });
}, { root: characterList });

characterImportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedPool || selectedPool.status !== "draft") return;

    const { characters, invalidLines } = parseImportedCharacters(characterImportText.value);
    if (characters.length === 0) {
        characterImportMessage.textContent = "請輸入至少一筆正確格式的角色資料。";
        showAdminNotification("請輸入至少一筆正確格式的角色資料。", "error");
        return;
    }
    if (characters.length > 100) {
        characterImportMessage.textContent = `每批最多匯入 100 位精靈，目前有 ${characters.length} 位，請分批處理。`;
        showAdminNotification(`本批有 ${characters.length} 位，超過每批 100 位上限；請分批匯入。`, "error");
        return;
    }
    if (invalidLines.length > 0) {
        characterImportMessage.textContent = `第 ${invalidLines.join("、")} 行格式有誤，請修正後再匯入。`;
        showAdminNotification(`匯入資料第 ${invalidLines.join("、")} 行格式有誤，請修正後再試。`, "error");
        return;
    }

    const importButton = document.getElementById("import-characters-button");
    importButton.disabled = true;
    characterImportText.disabled = true;
    const lookupCharacters = characters.filter((character) => character.lookupName);
    const updateImportProgress = (label, completed, total) => {
        const percent = total > 0 ? Math.floor((completed / total) * 100) : 100;
        characterImportProgress.hidden = false;
        characterImportProgressText.textContent = `${label}（${completed}/${total}）`;
        characterImportProgressPercent.textContent = `${percent}%`;
        characterImportProgressBar.setAttribute("aria-valuenow", String(percent));
        characterImportProgressBar.setAttribute("aria-valuetext", `${label}，${completed}/${total}，${percent}%`);
        characterImportProgressFill.style.width = `${percent}%`;
    };
    characterImportMessage.textContent = lookupCharacters.length > 0
        ? `正在查詢 ${lookupCharacters.length} 位精靈資料…`
        : `正在匯入 ${characters.length} 位角色…`;

    const results = [];
    let lookedUpCount = 0;
    if (lookupCharacters.length > 0) {
        updateImportProgress("正在查詢精靈資料", 0, lookupCharacters.length);
    }
    const lookupResults = await mapWithConcurrency(lookupCharacters, 5, async (character) => {
        try {
            const pet = await fetchJson(`https://api.seerapi.com/v1/pet/${character.characterId}`);
            const characterName = toTraditionalChinese(pet && pet.name);
            if (!characterName) {
                throw new Error("SeerAPI 回傳未包含精靈名稱。");
            }
            return { character: { ...character, characterName }, ok: true };
        } catch (error) {
            return { character, ok: false, error };
        } finally {
            lookedUpCount += 1;
            updateImportProgress("正在查詢精靈資料", lookedUpCount, lookupCharacters.length);
        }
    });
    const lookupResultsById = new Map();
    const lookupFailures = [];
    lookupCharacters.forEach((character, index) => {
        const result = lookupResults[index];
        lookupResultsById.set(character.characterId, result);
        if (!result.ok) {
            lookupFailures.push(result);
            results.push(result);
        }
    });

    const readyCharacters = characters.flatMap((character) => {
        if (!character.lookupName) return [character];
        const result = lookupResultsById.get(character.characterId);
        return result && result.ok ? [result.character] : [];
    });
    if (lookupCharacters.length > 0) {
        characterImportMessage.textContent = `查詢完成${lookupFailures.length > 0 ? `，${lookupFailures.length} 位查詢失敗` : ""}；正在逐筆新增 ${readyCharacters.length} 位角色…`;
    }
    let addedCount = 0;
    updateImportProgress("正在新增角色", 0, readyCharacters.length);
    for (const character of readyCharacters) {
        try {
            await addPoolCharacter(selectedPool.id, character.characterId, character.characterName);
            results.push({ character, ok: true });
        } catch (error) {
            results.push({ character, ok: false, error });
        } finally {
            addedCount += 1;
            updateImportProgress("正在新增角色", addedCount, readyCharacters.length);
        }
    }

    const failed = results.filter((result) => !result.ok);
    const successCount = results.length - failed.length;
    updateImportProgress("匯入處理完成", readyCharacters.length, readyCharacters.length);
    if (failed.length === 0) {
        characterImportMessage.textContent = `已成功匯入 ${successCount} 位角色。`;
        showAdminNotification(`已成功匯入 ${successCount} 位角色。`, "success");
        characterImportText.value = "";
        characterImportCount.textContent = "尚未輸入角色。";
    } else {
        const failedIds = failed.slice(0, 5).map((result) => {
            const reason = result.error ? `：${getAdminErrorMessage(result.error)}` : "";
            return `第 ${result.character.lineNumber} 行（ID ${result.character.characterId}）${reason}`;
        }).join("；");
        characterImportMessage.textContent = `成功 ${successCount} 位；失敗 ${failed.length} 位（${failedIds}${failed.length > 5 ? "；…" : ""}）。`;
        showAdminNotification(`批次匯入完成：成功 ${successCount} 位，失敗 ${failed.length} 位。詳細原因請查看匯入欄位下方的訊息。`, "error");
    }
    characterImportText.disabled = false;
    importButton.disabled = false;
    await loadCharacters();
});

startPoolButton.addEventListener("click", () => changePoolStatus("start"));
draftPoolButton.addEventListener("click", () => changePoolStatus("draft"));
closePoolButton.addEventListener("click", () => changePoolStatus("close"));
deletePoolButton.addEventListener("click", deleteSelectedPool);
refreshVoteRecordsButton.addEventListener("click", loadVoteRecords);
exportVoteRecordsButton.addEventListener("click", exportVoteRecords);
exportCharactersButton.addEventListener("click", exportCharacters);
voteRecordSearch.addEventListener("input", () => {
    voteRecordCurrentPage = 1;
    renderVoteRecords();
});
voteRecordPreviousButton.addEventListener("click", () => {
    voteRecordCurrentPage -= 1;
    renderVoteRecords();
});
voteRecordNextButton.addEventListener("click", () => {
    voteRecordCurrentPage += 1;
    renderVoteRecords();
});

async function changePoolStatus(action) {
    if (!selectedPool) return;
    const label = action === "start" ? "啟動" : action === "close" ? "關閉" : "退回草稿";
    const confirmationMessage = action === "draft"
        ? `確定將「${selectedPool.name}」退回草稿嗎？只有尚無投票紀錄且狀態為 closed 的票選活動才能退回，退回後即可重新編輯。`
        : action === "start"
            ? `確定要啟動「${selectedPool.name}」嗎？啟動後將依設定的起訖時間開放票選；如需停止，可再手動關閉活動。`
            : `確定要關閉「${selectedPool.name}」嗎？關閉後使用者將無法繼續投票。`;
    const confirmed = await showConfirmDialog(
        confirmationMessage,
        { confirmLabel: label, danger: action === "close" }
    );
    if (!confirmed) return;

    const button = action === "start" ? startPoolButton : action === "close" ? closePoolButton : draftPoolButton;
    button.disabled = true;
    poolFormMessage.textContent = `${label}中…`;
    try {
        if (action === "start") await startPool(selectedPool.id);
        else if (action === "close") await closePool(selectedPool.id);
        else await returnPoolToDraft(selectedPool.id);
        poolFormMessage.textContent = `票選活動已${label}。`;
        showAdminNotification(`票選活動已${label}。`, "success");
        await loadPools();
        await selectPool(selectedPool.id);
    } catch (error) {
        console.error(`${label} pool error:`, error);
        poolFormMessage.textContent = `${label}失敗：${getAdminErrorMessage(error)}`;
        showAdminNotification(`${label}票選活動失敗：${getAdminErrorMessage(error)}`, "error");
    } finally {
        button.disabled = false;
    }
}

async function deleteSelectedPool() {
    if (!selectedPool || !["draft", "closed"].includes(selectedPool.status)) return;
    const statusLabel = selectedPool.status === "draft" ? "draft（草稿）" : "closed（已關閉）";
    const confirmed = await showConfirmDialog(
        `確定要永久刪除 ${statusLabel} 狀態的票選活動「${selectedPool.name}」及其所有角色嗎？此操作無法復原。`,
        { confirmLabel: "永久刪除", danger: true }
    );
    if (!confirmed) return;

    deletePoolButton.disabled = true;
    poolFormMessage.textContent = "刪除中…";
    try {
        await deletePool(selectedPool.id);
        selectedPool = null;
        editor.hidden = true;
        await loadPools();
        showAdminNotification("票選活動已刪除。", "success");
    } catch (error) {
        console.error("Delete pool error:", error);
        const errorMessage = selectedPool.status === "closed" && error?.code === "P0001"
            ? "資料庫目前尚未允許刪除已關閉的票選活動，需更新後端刪除規則才能完成。"
            : getAdminErrorMessage(error);
        poolFormMessage.textContent = `刪除失敗：${errorMessage}`;
        showAdminNotification(`刪除票選活動失敗：${errorMessage}`, "error");
        deletePoolButton.disabled = false;
    }
}

function showConfirmDialog(message, {
    title = "請確認操作",
    confirmLabel = "確定",
    cancelLabel = "取消",
    showCancel = true,
    danger = false,
    focusConfirm = false
} = {}) {
    if (confirmDialogResolve) finishConfirmDialog(false);
    confirmDialogReturnFocus = document.activeElement;
    adminConfirmTitle.textContent = title;
    adminConfirmMessage.textContent = message;
    adminConfirmCancelButton.hidden = !showCancel;
    adminConfirmCancelButton.textContent = cancelLabel;
    adminConfirmAcceptButton.textContent = confirmLabel;
    adminConfirmAcceptButton.classList.toggle("danger-button", danger);
    adminConfirmModal.classList.remove("is-closing");
    adminConfirmModal.hidden = false;
    document.body.classList.add("has-admin-confirm-modal");
    (focusConfirm ? adminConfirmAcceptButton : adminConfirmCancelButton).focus();

    return new Promise((resolve) => {
        confirmDialogResolve = resolve;
    });
}

function showAdminNotification(message, type = "info") {
    adminNotificationQueue.push({ message, type });
    if (!showingAdminNotification) void showNextAdminNotification();
}

async function showNextAdminNotification() {
    showingAdminNotification = true;
    while (adminNotificationQueue.length > 0) {
        const { message, type } = adminNotificationQueue.shift();
        await showConfirmDialog(message, {
            title: type === "error" ? "操作未完成" : type === "success" ? "操作完成" : "通知",
            confirmLabel: "關閉",
            showCancel: false,
            focusConfirm: true
        });
    }
    showingAdminNotification = false;
}

function getAdminErrorMessage(error) {
    const message = String(error?.message || "");
    const lowerMessage = message.toLowerCase();
    const status = Number(error?.status || message.match(/\bHTTP\s+(\d{3})\b/i)?.[1]);
    const code = String(error?.code || "").toUpperCase();

    if (status === 404) {
        if (/\/pet\/\d+\/?$/.test(error?.resource || "")) {
            return "查無這個精靈 ID 的資料，請確認編號是否正確，或稍後再試。";
        }
        if (/\/element_type_combination\/\d+\/?$/.test(error?.resource || "")) {
            return "已找到精靈，但查不到牠的屬性資料，請稍後再試或聯絡管理員。";
        }
        return "找不到這筆資料，可能已被刪除或編號有誤；請重新整理後再試。";
    }
    if (/pool not found/i.test(message)) return "找不到這個票選活動，請重新整理管理頁面後再試。";
    if (/only a closed pool can be returned to draft/i.test(message)) {
        return "只有狀態為 closed 的票選活動才能退回草稿，請重新整理並確認活動狀態。";
    }
    if (/a pool with vote records cannot be returned to draft/i.test(message)) {
        return "這個票選活動已有投票紀錄，為保護既有資料，不能退回草稿。";
    }
    if (/admin access required|authentication required/i.test(message)) {
        return "登入狀態或管理員權限已失效，請重新登入後再試。";
    }
    if (code === "P0001") {
        return "目前資料狀態不符合此操作條件，請重新整理頁面並確認操作是否仍適用。";
    }
    if (/[\u4e00-\u9fff]/.test(message)) return message;
    if (/failed to fetch|networkerror|load failed|fetch failed/.test(lowerMessage)) {
        return "網路連線失敗，請檢查網路後再試。";
    }
    if (/jwt expired|refresh token|session.*expired/.test(lowerMessage)) {
        return "登入狀態已過期，請重新登入後再試。";
    }
    if (/row.level security|permission denied|not authorized|unauthorized/.test(lowerMessage)) {
        return "權限不足，無法執行此操作。";
    }
    if (/duplicate key|unique constraint|already exists/.test(lowerMessage)) {
        return "資料已存在，請確認是否重複新增。";
    }
    if (/foreign key constraint|still referenced/.test(lowerMessage)) {
        return "資料仍被其他內容使用，無法刪除。";
    }
    if (status === 429) return "目前請求過於頻繁，請稍候再試。";
    if (status >= 500) return "伺服器暫時無法處理請求，請稍後再試。";
    if (status >= 400) return "請求未能完成，請確認輸入資料與操作條件後再試。";
    if (message) return "系統暫時無法完成操作，請稍後再試。";
    return "系統暫時無法完成操作，請稍後再試。";
}

function finishConfirmDialog(confirmed) {
    if (!confirmDialogResolve) return;
    const resolve = confirmDialogResolve;
    confirmDialogResolve = null;
    adminConfirmModal.classList.add("is-closing");
    window.setTimeout(() => {
        adminConfirmModal.hidden = true;
        adminConfirmModal.classList.remove("is-closing");
        document.body.classList.remove("has-admin-confirm-modal");
        if (confirmDialogReturnFocus instanceof HTMLElement && confirmDialogReturnFocus.isConnected) {
            confirmDialogReturnFocus.focus();
        }
        confirmDialogReturnFocus = null;
        resolve(confirmed);
    }, 180);
}

async function loadAdminPage() {
    try {
        const session = await getSession();
        if (!session) {
            window.location.href = "./index.html";
            return;
        }
        if (!await isAdmin()) {
            accessDenied.hidden = false;
            return;
        }
        adminWorkspace.hidden = false;
        await loadPools();
        await loadAdminCompetitivePools();
    } catch (error) {
        console.error("Load admin page error:", error);
        adminWorkspace.hidden = false;
        poolList.innerHTML = "<p class=\"empty-state\">載入管理資料失敗，請重新整理後再試。</p>";
        showAdminNotification(`載入管理資料失敗：${getAdminErrorMessage(error)}`, "error");
    }
}

async function loadPools() {
    pools = await getAdminPools();
    renderPools();
}

function renderPools() {
    poolList.innerHTML = "";
    if (pools.length === 0) {
        poolList.innerHTML = "<p class=\"empty-state\">目前沒有任何票選活動。</p>";
        return;
    }
    pools.forEach((pool) => {
        const item = document.createElement("article");
        const details = document.createElement("div");
        const name = document.createElement("strong");
        const rule = document.createElement("span");
        const dates = document.createElement("span");
        const actions = document.createElement("div");
        const manageButton = document.createElement("button");
        const badge = document.createElement("span");
        item.className = "admin-pool-item";
        details.className = "admin-pool-details";
        actions.className = "admin-pool-actions";
        name.textContent = pool.name;
        rule.textContent = `每人 ${pool.max_votes} 票`;
        dates.textContent = `${formatDate(pool.start_at)} → ${formatDate(pool.end_at)}`;
        badge.className = `status-badge status-${pool.status}`;
        badge.textContent = pool.status;
        manageButton.type = "button";
        manageButton.className = "compact-button admin-action-button";
        manageButton.textContent = "管理";
        manageButton.addEventListener("click", () => selectPool(pool.id));
        details.append(name, rule, dates);
        actions.append(badge, manageButton);
        item.append(details, actions);
        poolList.appendChild(item);
    });
}

async function loadAdminCompetitivePools() {
    try {
        competitivePools = await getAdminCompetitivePools();
        renderAdminCompetitivePools();
        return true;
    } catch (error) {
        console.error("Load competitive pools error:", error);
        competitivePoolAdminList.innerHTML = "<p class=\"empty-state\">競技池資料載入失敗。</p>";
        showAdminNotification(`載入競技池資料失敗：${getAdminErrorMessage(error)}`, "error");
        return false;
    }
}

function renderAdminCompetitivePools() {
    competitivePoolAdminList.replaceChildren();
    if (competitivePools.length === 0) {
        competitivePoolAdminList.innerHTML = "<p class=\"empty-state\">尚未建立任何競技池期間。</p>";
        return;
    }

    competitivePools.forEach((pool) => {
        const item = document.createElement("article");
        const details = document.createElement("div");
        const name = document.createElement("strong");
        const dates = document.createElement("span");
        const status = document.createElement("span");
        const actions = document.createElement("div");
        const editButton = document.createElement("button");
        const now = Date.now();
        const startsAt = new Date(pool.start_at).getTime();
        const endsAt = new Date(pool.end_at).getTime();

        item.className = "competitive-pool-admin-item";
        details.className = "competitive-pool-admin-details";
        name.textContent = pool.name;
        dates.textContent = `${formatDate(pool.start_at)} → ${formatDate(pool.end_at)}`;
        status.className = "competitive-pool-period-status";
        status.textContent = startsAt <= now && endsAt > now
            ? "進行中"
            : startsAt > now ? "尚未開始" : "已結束";
        actions.className = "competitive-pool-admin-actions";
        editButton.type = "button";
        editButton.className = "secondary-button compact-button";
        editButton.textContent = "管理名單";
        editButton.addEventListener("click", () => openCompetitivePoolEditor(pool.id));
        details.append(name, dates);
        actions.append(status, editButton);
        item.append(details, actions);
        competitivePoolAdminList.append(item);
    });
}

function showNewCompetitivePoolEditor() {
    selectedCompetitivePool = null;
    competitivePoolEditor.hidden = false;
    competitivePoolEditorTitle.textContent = "新增競技池期間";
    competitivePoolForm.reset();
    setPoolDateValue("competitive-pool-start", "");
    setPoolDateValue("competitive-pool-end", "");
    competitivePoolFormMessage.textContent = "";
    saveCompetitivePoolButton.textContent = "建立期間";
    deleteCompetitivePoolButton.hidden = true;
    competitivePoolCharacterManager.hidden = true;
    competitivePoolCharacterForm.reset();
    clearCompetitivePetPreview();
    resetCompetitivePoolImport();
    competitivePoolEditor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeCompetitivePoolEditor() {
    competitivePoolEditor.hidden = true;
    selectedCompetitivePool = null;
    competitivePoolCharacters = [];
    clearCompetitivePetPreview();
}

async function openCompetitivePoolEditor(poolId) {
    selectedCompetitivePool = competitivePools.find((pool) => pool.id === poolId) ?? null;
    if (!selectedCompetitivePool) return;

    competitivePoolEditor.hidden = false;
    competitivePoolEditorTitle.textContent = selectedCompetitivePool.name;
    competitivePoolNameInput.value = selectedCompetitivePool.name;
    setPoolDateValue("competitive-pool-start", toLocalDateTime(selectedCompetitivePool.start_at));
    setPoolDateValue("competitive-pool-end", toLocalDateTime(selectedCompetitivePool.end_at));
    competitivePoolFormMessage.textContent = "";
    saveCompetitivePoolButton.textContent = "儲存期間設定";
    deleteCompetitivePoolButton.hidden = false;
    competitivePoolCharacterManager.hidden = false;
    competitivePoolCharacterForm.reset();
    clearCompetitivePetPreview();
    resetCompetitivePoolImport();
    await loadCompetitivePoolCharacters();
    competitivePoolEditor.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveCompetitivePool(event) {
    event.preventDefault();
    const name = competitivePoolNameInput.value.trim();
    const startAt = toIsoDate("competitive-pool-start");
    const endAt = toIsoDate("competitive-pool-end");
    if (!name || !startAt || !endAt) {
        competitivePoolFormMessage.textContent = "請填寫期間名稱、開始時間與結束時間。";
        return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
        competitivePoolFormMessage.textContent = "結束時間必須晚於開始時間。";
        showAdminNotification("競技池結束時間必須晚於開始時間。", "error");
        return;
    }

    saveCompetitivePoolButton.disabled = true;
    competitivePoolFormMessage.textContent = "正在儲存競技池期間…";
    try {
        let poolId = selectedCompetitivePool?.id;
        if (poolId) {
            await updateCompetitivePool(poolId, name, startAt, endAt);
        } else {
            poolId = await createCompetitivePool(name, startAt, endAt);
        }
        if (!await loadAdminCompetitivePools()) {
            competitivePoolFormMessage.textContent = "期間已儲存，但重新載入清單失敗；請重新整理管理頁面。";
            return;
        }
        await openCompetitivePoolEditor(poolId);
        competitivePoolFormMessage.textContent = "競技池期間設定已儲存。";
        showAdminNotification("競技池期間設定已儲存。", "success");
    } catch (error) {
        console.error("Save competitive pool error:", error);
        competitivePoolFormMessage.textContent = `儲存失敗：${getAdminErrorMessage(error)}`;
        showAdminNotification(`儲存競技池期間失敗：${getAdminErrorMessage(error)}`, "error");
    } finally {
        saveCompetitivePoolButton.disabled = false;
    }
}

async function deleteSelectedCompetitivePool() {
    if (!selectedCompetitivePool) return;
    const confirmed = await showConfirmDialog(
        `確定要刪除「${selectedCompetitivePool.name}」競技池期間及其中所有精靈名單嗎？此操作無法復原。`,
        { confirmLabel: "刪除期間", danger: true }
    );
    if (!confirmed) return;

    deleteCompetitivePoolButton.disabled = true;
    try {
        await deleteCompetitivePool(selectedCompetitivePool.id);
        closeCompetitivePoolEditor();
        await loadAdminCompetitivePools();
        showAdminNotification("競技池期間與所屬精靈名單已刪除。", "success");
    } catch (error) {
        console.error("Delete competitive pool error:", error);
        showAdminNotification(`刪除競技池期間失敗：${getAdminErrorMessage(error)}`, "error");
    } finally {
        deleteCompetitivePoolButton.disabled = false;
    }
}

async function loadCompetitivePoolCharacters() {
    if (!selectedCompetitivePool) return;
    const poolId = selectedCompetitivePool.id;
    const requestId = ++competitivePoolCharacterLoadRequestId;
    competitivePoolCharacterList.innerHTML = "<p class=\"empty-state\">正在載入精靈名單…</p>";
    try {
        const characters = await getCompetitivePoolCharacters(poolId);
        if (requestId !== competitivePoolCharacterLoadRequestId || selectedCompetitivePool?.id !== poolId) return;
        competitivePoolCharacters = characters;
        renderCompetitivePoolCharacters();
    } catch (error) {
        if (requestId !== competitivePoolCharacterLoadRequestId || selectedCompetitivePool?.id !== poolId) return;
        console.error("Load competitive pool characters error:", error);
        competitivePoolCharacterList.innerHTML = "<p class=\"empty-state\">精靈名單載入失敗。</p>";
        showAdminNotification(`載入精靈名單失敗：${getAdminErrorMessage(error)}`, "error");
    }
}

function renderCompetitivePoolCharacters() {
    competitivePoolCharacterList.replaceChildren();
    const types = [
        { value: "banned", title: "禁止池", rule: "禁止攜帶", className: "is-banned" },
        { value: "restricted", title: "限制池", rule: "最多攜帶 2 隻", className: "is-restricted" },
        { value: "semi_restricted", title: "準限制池", rule: "最多攜帶 3 隻", className: "is-semi-restricted" }
    ];

    types.forEach((type) => {
        const group = document.createElement("section");
        const header = document.createElement("div");
        const title = document.createElement("h4");
        const rule = document.createElement("span");
        const list = document.createElement("div");
        const entries = competitivePoolCharacters.filter((character) => character.pool_type === type.value);

        group.className = `competitive-pool-group ${type.className}`;
        header.className = "competitive-pool-group-header";
        title.textContent = type.title;
        rule.textContent = type.rule;
        list.className = "competitive-pool-pet-list";
        header.append(title, rule);

        if (entries.length === 0) {
            const empty = document.createElement("p");
            empty.className = "competitive-pool-empty";
            empty.textContent = "尚未加入精靈";
            list.append(empty);
        } else {
            entries.forEach((character) => {
                const item = document.createElement("article");
                const avatar = document.createElement("img");
                const name = document.createElement("strong");
                const id = document.createElement("span");
                const removeButton = document.createElement("button");

                item.className = "competitive-pool-pet";
                avatar.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(character.seer_pet_id)}.png`;
                avatar.alt = "";
                avatar.loading = "lazy";
                avatar.addEventListener("error", () => { avatar.hidden = true; }, { once: true });
                name.textContent = character.pet_name;
                id.textContent = `#${character.seer_pet_id}`;
                removeButton.type = "button";
                removeButton.className = "text-button delete-character-button";
                removeButton.textContent = "移除";
                removeButton.addEventListener("click", () => removeCompetitivePoolCharacter(character));
                item.append(avatar, name, id, removeButton);
                list.append(item);
            });
        }

        group.append(header, list);
        competitivePoolCharacterList.append(group);
    });
}

async function lookupCompetitivePet() {
    const petId = competitivePetIdInput.value.trim();
    if (!/^\d+$/.test(petId) || !Number.isSafeInteger(Number(petId)) || Number(petId) <= 0) {
        competitivePetMessage.textContent = "請輸入有效的精靈 ID。";
        return;
    }

    lookupCompetitivePetButton.disabled = true;
    competitivePetIdInput.disabled = true;
    lookupCompetitivePetButton.textContent = "查詢中…";
    competitivePetMessage.textContent = "正在向 SeerAPI 查詢精靈…";
    clearCompetitivePetPreview();
    try {
        resolvedCompetitivePet = await fetchCompetitivePet(Number(petId));
        competitivePetPreview.hidden = false;
        competitivePetAvatar.src = `https://newseer.61.com/web/monster/head/${resolvedCompetitivePet.id}.png`;
        competitivePetAvatar.alt = `${resolvedCompetitivePet.name} 精靈頭像`;
        competitivePetName.textContent = resolvedCompetitivePet.name;
        competitivePetIdPreview.textContent = `#${resolvedCompetitivePet.id}`;
        addCompetitivePetButton.disabled = false;
        competitivePetMessage.textContent = "精靈資料已確認，加入後會顯示在首頁競技池。";
    } catch (error) {
        console.error("Lookup competitive pet error:", error);
        competitivePetMessage.textContent = `精靈查詢失敗：${getAdminErrorMessage(error)}`;
    } finally {
        lookupCompetitivePetButton.disabled = false;
        competitivePetIdInput.disabled = false;
        lookupCompetitivePetButton.textContent = "查詢精靈";
    }
}

async function fetchCompetitivePet(petId) {
    const pet = await fetchJson(`https://api.seerapi.com/v1/pet/${petId}`);
    const apiPetId = Number(pet?.id);
    const petName = toTraditionalChinese(pet?.name || "");
    if (apiPetId !== petId || !petName) {
        throw new Error("SeerAPI 回傳的精靈資料不完整或 ID 不符。");
    }
    return { id: apiPetId, name: petName };
}

function clearCompetitivePetPreview() {
    resolvedCompetitivePet = null;
    if (!competitivePetPreview) return;
    competitivePetPreview.hidden = true;
    competitivePetAvatar.removeAttribute("src");
    competitivePetName.textContent = "";
    competitivePetIdPreview.textContent = "";
    addCompetitivePetButton.disabled = true;
}

async function addSelectedCompetitivePet(event) {
    event.preventDefault();
    if (!selectedCompetitivePool) return;
    const petId = Number(competitivePetIdInput.value);
    if (!resolvedCompetitivePet || resolvedCompetitivePet.id !== petId) {
        competitivePetMessage.textContent = "請先查詢並確認此精靈 ID。";
        return;
    }

    addCompetitivePetButton.disabled = true;
    competitivePetMessage.textContent = "正在加入精靈名單…";
    try {
        await addCompetitivePoolCharacter(
            selectedCompetitivePool.id,
            resolvedCompetitivePet.id,
            resolvedCompetitivePet.name,
            competitivePetTypeInput.value
        );
        const petName = resolvedCompetitivePet.name;
        competitivePoolCharacterForm.reset();
        clearCompetitivePetPreview();
        competitivePetMessage.textContent = `已加入「${petName}」。`;
        await loadCompetitivePoolCharacters();
        showAdminNotification(`已將「${petName}」加入競技池名單。`, "success");
    } catch (error) {
        console.error("Add competitive pool character error:", error);
        competitivePetMessage.textContent = `加入失敗：${getAdminErrorMessage(error)}`;
        showAdminNotification(`加入競技池精靈失敗：${getAdminErrorMessage(error)}`, "error");
    } finally {
        addCompetitivePetButton.disabled = !resolvedCompetitivePet;
    }
}

function parseCompetitivePoolPetIds(value) {
    const ids = [];
    const invalidLines = new Set();
    const seenIds = new Set();
    let duplicateCount = 0;

    value.split(/\r?\n/).forEach((line, index) => {
        const tokens = line.trim().split(/[,\s，]+/).filter(Boolean);
        tokens.forEach((token) => {
            if (!/^\d+$/.test(token)) {
                invalidLines.add(index + 1);
                return;
            }
            const id = Number(token);
            if (!Number.isSafeInteger(id) || id <= 0) {
                invalidLines.add(index + 1);
                return;
            }
            if (seenIds.has(id)) {
                duplicateCount += 1;
                return;
            }
            seenIds.add(id);
            ids.push({ id, lineNumber: index + 1 });
        });
    });

    return { ids, invalidLines: [...invalidLines], duplicateCount };
}

function updateCompetitivePoolImportCount() {
    competitivePoolImportProgress.hidden = true;
    const { ids, invalidLines, duplicateCount } = parseCompetitivePoolPetIds(competitivePoolImportIds.value);
    competitivePoolImportCount.textContent = ids.length > 100
        ? `已辨識 ${ids.length} 個 ID，超過每批 100 隻上限。`
        : invalidLines.length > 0
            ? `已辨識 ${ids.length} 個 ID；第 ${invalidLines.join("、")} 行格式有誤。`
            : ids.length > 0
                ? `已辨識 ${ids.length} 個 ID${duplicateCount > 0 ? `，已忽略 ${duplicateCount} 個重複 ID` : ""}。`
                : "尚未輸入精靈 ID。";
}

function resetCompetitivePoolImport() {
    if (competitivePoolImportButton.disabled) return;
    competitivePoolImportForm.reset();
    competitivePoolImportMessage.textContent = "";
    competitivePoolImportProgress.hidden = true;
    updateCompetitivePoolImportCount();
}

async function importCompetitivePoolCharacters(event) {
    event.preventDefault();
    if (!selectedCompetitivePool) return;

    const { ids, invalidLines, duplicateCount } = parseCompetitivePoolPetIds(competitivePoolImportIds.value);
    if (ids.length === 0 || invalidLines.length > 0) {
        competitivePoolImportMessage.textContent = invalidLines.length > 0
            ? `第 ${invalidLines.join("、")} 行格式有誤，請只輸入數字精靈 ID。`
            : "請輸入至少一個精靈 ID。";
        return;
    }
    if (ids.length > 100) {
        competitivePoolImportMessage.textContent = `每批最多匯入 100 隻，目前有 ${ids.length} 隻，請分批處理。`;
        return;
    }

    const poolId = selectedCompetitivePool.id;
    const existingIds = new Set(competitivePoolCharacters.map((character) => Number(character.seer_pet_id)));
    const alreadyPresentCount = ids.filter((item) => existingIds.has(item.id)).length;
    const idsToLookup = ids.filter((item) => !existingIds.has(item.id));
    if (idsToLookup.length === 0) {
        competitivePoolImportMessage.textContent = `這 ${ids.length} 隻精靈都已在目前名單中，沒有新增資料。`;
        return;
    }

    const importType = competitivePoolImportType.value;
    competitivePoolImportButton.disabled = true;
    competitivePoolImportType.disabled = true;
    competitivePoolImportIds.disabled = true;
    competitivePoolImportMessage.textContent = `正在查詢 ${idsToLookup.length} 隻精靈…`;
    let completedLookups = 0;
    const updateProgress = (label, completed, total) => {
        const percent = total > 0 ? Math.floor(completed / total * 100) : 100;
        competitivePoolImportProgress.hidden = false;
        competitivePoolImportProgressText.textContent = `${label}（${completed}/${total}）`;
        competitivePoolImportProgressPercent.textContent = `${percent}%`;
        competitivePoolImportProgressBar.setAttribute("aria-valuenow", String(percent));
        competitivePoolImportProgressFill.style.width = `${percent}%`;
    };

    updateProgress("正在查詢 SeerAPI", 0, idsToLookup.length);
    try {
        const lookupResults = await mapWithConcurrency(idsToLookup, 5, async (item) => {
            try {
                return { item, pet: await fetchCompetitivePet(item.id), error: null };
            } catch (error) {
                return { item, pet: null, error };
            } finally {
                completedLookups += 1;
                updateProgress("正在查詢 SeerAPI", completedLookups, idsToLookup.length);
            }
        });
        const readyPets = lookupResults.flatMap((result) => result.pet ? [result.pet] : []);
        const lookupFailures = lookupResults.filter((result) => result.error);
        if (readyPets.length > 0) {
            competitivePoolImportMessage.textContent = `已查詢 ${readyPets.length} 隻精靈；正在批次加入名單…`;
            updateProgress("正在加入競技池名單", 0, 1);
            await addCompetitivePoolCharacters(poolId, readyPets, importType);
            updateProgress("競技池匯入完成", 1, 1);
        }

        const failedIds = lookupFailures.slice(0, 5).map((result) => `ID ${result.item.id}`).join("、");
        const resultParts = [];
        if (readyPets.length > 0) resultParts.push(`成功加入 ${readyPets.length} 隻`);
        if (alreadyPresentCount > 0) resultParts.push(`略過已在名單中的 ${alreadyPresentCount} 隻`);
        if (duplicateCount > 0) resultParts.push(`略過輸入重複的 ${duplicateCount} 個 ID`);
        if (lookupFailures.length > 0) {
            resultParts.push(`${lookupFailures.length} 隻查詢失敗（${failedIds}${lookupFailures.length > 5 ? "…" : ""}）`);
        }
        const resultMessage = `${resultParts.join("；")}。`;
        competitivePoolImportMessage.textContent = resultMessage;
        if (lookupFailures.length === 0) {
            competitivePoolImportIds.value = "";
            updateCompetitivePoolImportCount();
            showAdminNotification(resultMessage, "success");
        } else {
            showAdminNotification(`競技池批次匯入完成：成功 ${readyPets.length} 隻，查詢失敗 ${lookupFailures.length} 隻。`, "error");
        }
        if (selectedCompetitivePool?.id === poolId && readyPets.length > 0) {
            await loadCompetitivePoolCharacters();
        }
    } catch (error) {
        console.error("Import competitive pool characters error:", error);
        competitivePoolImportMessage.textContent = `批次加入失敗：${getAdminErrorMessage(error)}；保留輸入內容，可修正後重試。`;
        showAdminNotification(`競技池批次匯入失敗：${getAdminErrorMessage(error)}`, "error");
    } finally {
        competitivePoolImportButton.disabled = false;
        competitivePoolImportType.disabled = false;
        competitivePoolImportIds.disabled = false;
    }
}

async function removeCompetitivePoolCharacter(character) {
    const confirmed = await showConfirmDialog(
        `確定要從競技池名單移除「${character.pet_name}」嗎？`,
        { confirmLabel: "移除", danger: true }
    );
    if (!confirmed) return;

    try {
        await deleteCompetitivePoolCharacter(character.id);
        await loadCompetitivePoolCharacters();
        showAdminNotification(`已從競技池名單移除「${character.pet_name}」。`, "success");
    } catch (error) {
        console.error("Remove competitive pool character error:", error);
        showAdminNotification(`移除競技池精靈失敗：${getAdminErrorMessage(error)}`, "error");
    }
}

async function selectPool(poolId) {
    selectedPool = pools.find((pool) => pool.id === poolId) ?? null;
    if (!selectedPool) return;
    editor.hidden = false;
    document.getElementById("editor-title").textContent = selectedPool.name;
    document.getElementById("editor-description").textContent = `票選活動編號：${selectedPool.id}`;
    characterForm.reset();
    clearSeerPreview();
    document.getElementById("pool-form-name").value = selectedPool.name;
    setPoolDateValue("pool-form-start", toLocalDateTime(selectedPool.start_at));
    setPoolDateValue("pool-form-end", toLocalDateTime(selectedPool.end_at));
    document.getElementById("pool-form-max-votes").value = selectedPool.max_votes;
    document.getElementById("save-pool-button").textContent = "儲存草稿設定";
    poolFormMessage.textContent = "";

    const isDraft = selectedPool.status === "draft";
    poolForm.querySelectorAll("input, select").forEach((input) => { input.disabled = !isDraft; });
    setPoolDatePickersDisabled(!isDraft);
    document.getElementById("save-pool-button").hidden = !isDraft;
    characterManager.hidden = false;
    characterEditControls.hidden = !isDraft;
    characterForm.querySelectorAll("input, button").forEach((input) => { input.disabled = !isDraft; });
    characterImportForm.querySelectorAll("textarea, button").forEach((input) => { input.disabled = !isDraft; });
    startPoolButton.hidden = !isDraft;
    closePoolButton.hidden = selectedPool.status !== "active";
    draftPoolButton.hidden = selectedPool.status !== "closed";
    deletePoolButton.hidden = !isDraft && selectedPool.status !== "closed";
    deletePoolButton.disabled = false;
    await loadCharacters();
    await loadVoteRecords();
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showCreatePoolEditor() {
    selectedPool = null;
    editor.hidden = false;
    document.getElementById("editor-title").textContent = "建立票選活動";
    document.getElementById("editor-description").textContent = "設定投票期間與每位玩家必選的角色數。";
    poolForm.reset();
    characterForm.reset();
    clearSeerPreview();
    setPoolDateValue("pool-form-start", "");
    setPoolDateValue("pool-form-end", "");
    poolForm.querySelectorAll("input, select").forEach((input) => { input.disabled = false; });
    setPoolDatePickersDisabled(false);
    document.getElementById("save-pool-button").hidden = false;
    document.getElementById("save-pool-button").textContent = "建立票選活動";
    startPoolButton.hidden = true;
    draftPoolButton.hidden = true;
    deletePoolButton.hidden = true;
    closePoolButton.hidden = true;
    poolFormMessage.textContent = "";
    characterManager.hidden = true;
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

const s2tConverter = Converter({ from: "cn", to: "tw" });

function toTraditionalChinese(value) {
    if (value === null || value === undefined) return "";
    const text = String(value).trim();
    if (!text) return "";
    try {
        return text.split(/([岳杰托里])/).map((part) => "岳杰托里".includes(part) ? part : s2tConverter(part)).join("");
    } catch (error) {
        console.warn("Simplified-to-traditional conversion failed:", error);
        return text;
    }
}

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json"
        }
    });

    if (!response.ok) {
        let message = `SeerAPI 請求失敗（${response.status}）`;
        try {
            const payload = await response.json();
            if (payload && payload.message) {
                message = payload.message;
            }
        } catch (error) {
            // ignore JSON parse errors and fall back to the status text
        }
        const error = new Error(message);
        error.status = response.status;
        error.resource = new URL(url).pathname;
        throw error;
    }

    return response.json();
}

function renderSeerPreview(preview) {
    if (!preview) {
        seerPetPreview.hidden = true;
        return;
    }

    seerPetPreview.hidden = false;
    seerPetIcon.src = preview.avatarUrl;
    seerPetIcon.alt = `${preview.petName} 精靈頭像`;
    seerPetTypeIcon.src = preview.typeIconUrl;
    seerPetName.textContent = preview.petName;
    seerPetIdPreview.textContent = `#${preview.petId}`;
    seerPetTypeName.textContent = preview.typeName;

    resolvedSeerPetId = preview.petId;
    document.getElementById("character-name").value = preview.petName;
}

function clearSeerPreview(clearPetId = true) {
    resolvedSeerPetId = null;
    if (clearPetId && seerPetIdInput) seerPetIdInput.value = "";
    if (seerPetPreview) seerPetPreview.hidden = true;
    if (seerPetIcon) seerPetIcon.removeAttribute("src");
    if (seerPetTypeIcon) seerPetTypeIcon.removeAttribute("src");
    seerPetName.textContent = "-";
    seerPetIdPreview.textContent = "#-";
    seerPetTypeName.textContent = "-";
}

async function lookupSeerPet() {
    const petId = seerPetIdInput.value.trim();
    if (!petId || !/^\d+$/.test(petId)) {
        characterFormMessage.textContent = "請輸入有效的 Seer 精靈 ID。";
        showAdminNotification("請輸入有效的 Seer 精靈 ID。", "error");
        clearSeerPreview();
        return;
    }

    const button = lookupSeerPetButton;
    button.disabled = true;
    button.textContent = "查詢中…";
    characterFormMessage.textContent = "正在查詢精靈資料…";

    try {
        const pet = await fetchJson(`https://api.seerapi.com/v1/pet/${petId}`);
        const typeId = pet && pet.type && pet.type.id;
        if (!typeId) {
            throw new Error("SeerAPI 回傳未包含 type.id。");
        }

        const typeCombination = await fetchJson(`https://api.seerapi.com/v1/element_type_combination/${typeId}`);
        const resolvedTypeId = Number(typeCombination && typeCombination.id ? typeCombination.id : typeId);
        const petName = toTraditionalChinese(pet.name || "");
        const typeName = toTraditionalChinese(typeCombination && typeCombination.name ? typeCombination.name : "");

        if (!petName) {
            throw new Error("SeerAPI 回傳未包含精靈名稱。");
        }

        const preview = {
            petId: Number(petId),
            petName,
            typeId: resolvedTypeId,
            typeName,
            avatarUrl: `https://newseer.61.com/web/monster/head/${petId}.png`,
            typeIconUrl: `https://img.yuyuqaq.cn/seer-pet/type/${resolvedTypeId}.png`
        };

        renderSeerPreview(preview);
        characterFormMessage.textContent = `已取得精靈資料：${petName}（${preview.typeName}）`;
        showAdminNotification(`已取得精靈資料：${petName}。`, "success");
    } catch (error) {
        console.error("Lookup Seer pet error:", error);
        clearSeerPreview();
        characterFormMessage.textContent = `查詢失敗：${getAdminErrorMessage(error)}`;
        showAdminNotification(`查詢精靈失敗：${getAdminErrorMessage(error)}`, "error");
    } finally {
        button.disabled = false;
        button.textContent = "查詢精靈";
    }
}

function parseImportedCharacters(value) {
    const characters = [];
    const invalidLines = [];
    const seenIds = new Set();

    value.split(/\r?\n/).forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const match = trimmed.match(/^(\d+)(?:\s*[,\t]\s*(.+?))?$/);
        const characterId = match ? Number(match[1]) : NaN;
        if (!match || !Number.isSafeInteger(characterId) || seenIds.has(characterId) || (match[2] !== undefined && !match[2].trim())) {
            invalidLines.push(index + 1);
            return;
        }
        seenIds.add(characterId);
        characters.push({
            characterId,
            characterName: match[2] ? match[2].trim() : "",
            lookupName: match[2] === undefined,
            lineNumber: index + 1
        });
    });

    return { characters, invalidLines };
}

async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workerCount = Math.min(concurrency, items.length);

    await Promise.all(Array.from({ length: workerCount }, async () => {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await mapper(items[index]);
        }
    }));

    return results;
}

async function loadCharacters() {
    if (!selectedPool) return;
    characterList.innerHTML = "<p class=\"empty-state\">正在載入角色…</p>";
    characterCount.textContent = "正在載入角色…";
    exportCharactersButton.disabled = true;
    if (loadedCharacterPoolId !== selectedPool.id) characterSearch.value = "";
    try {
        poolCharacters = await getPoolCharacters(selectedPool.id);
        loadedCharacterPoolId = selectedPool.id;
        renderCharacters();
    } catch (error) {
        console.error("Load characters error:", error);
        poolCharacters = [];
        characterCount.textContent = "角色載入失敗。";
        characterList.innerHTML = "<p class=\"empty-state\">角色載入失敗。</p>";
        exportCharactersButton.disabled = true;
        showAdminNotification(`載入角色失敗：${getAdminErrorMessage(error)}`, "error");
    }
}

function renderCharacters() {
    exportCharactersButton.disabled = poolCharacters.length === 0;
    const keyword = characterSearch.value.trim().toLowerCase();
    const filteredCharacters = poolCharacters.filter((character) => {
        const searchable = `${character.character_id} ${character.character_name}`.toLowerCase();
        return searchable.includes(keyword);
    });

    characterCount.textContent = keyword
        ? `顯示 ${filteredCharacters.length} / ${poolCharacters.length} 位角色`
        : `共 ${poolCharacters.length} 位角色`;
    const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / CHARACTERS_PER_PAGE));
    characterCurrentPage = Math.min(Math.max(characterCurrentPage, 1), totalPages);
    const pageStart = (characterCurrentPage - 1) * CHARACTERS_PER_PAGE;
    const pageCharacters = filteredCharacters.slice(pageStart, pageStart + CHARACTERS_PER_PAGE);
    characterPage.textContent = `第 ${characterCurrentPage} / ${totalPages} 頁`;
    characterPreviousPageButton.disabled = characterCurrentPage === 1;
    characterNextPageButton.disabled = characterCurrentPage === totalPages;

    observedCharacterRows.forEach((row) => {
        const icon = row.querySelector(".admin-character-type-icon");
        if (icon) icon.dataset.visible = "false";
        characterTypeIconObserver.unobserve(row);
    });
    observedCharacterRows.clear();
    characterList.innerHTML = "";

    if (filteredCharacters.length === 0) {
        characterList.innerHTML = `<p class="empty-state">${poolCharacters.length === 0 ? "此票選活動尚未加入角色。" : "找不到符合的角色。"}</p>`;
        return;
    }

    pageCharacters.forEach((character) => renderCharacter(character));
}

async function loadVoteRecords() {
    if (!selectedPool) return;
    voteRecordCurrentPage = 1;
    voteRecordSearch.value = "";
    voteRecordList.innerHTML = "<p class=\"empty-state\">正在載入投票紀錄…</p>";
    voteRecordSummary.textContent = "正在載入投票紀錄…";
    refreshVoteRecordsButton.disabled = true;
    exportVoteRecordsButton.disabled = true;

    try {
        voteRecords = await getPoolVoteDetails(selectedPool.id);
        voteRecordSummary.textContent = voteRecords.length > 0
            ? `共 ${voteRecords.length} 位使用者已完成投票。`
            : "目前尚無使用者完成投票。";
        renderVoteRecords();
    } catch (error) {
        console.error("Load vote records error:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        voteRecordSummary.textContent = "投票紀錄載入失敗。";
        voteRecordList.innerHTML = "<p class=\"empty-state\">無法載入投票紀錄，請稍後再試。</p>";
        showAdminNotification(`載入投票紀錄失敗：${getAdminErrorMessage(error)}`, "error");
    } finally {
        refreshVoteRecordsButton.disabled = false;
        exportVoteRecordsButton.disabled = voteRecords.length === 0;
    }
}

function exportVoteRecords() {
    if (!selectedPool || voteRecords.length === 0) return;

    const rows = [["米米號", "使用者 ID", "投票時間", "選擇數量", "所選角色"]];
    voteRecords.forEach((record) => {
        const choices = record.selections || [];
        const selectedCharacters = choices
            .map((choice) => `#${choice.character_id} ${choice.character_name}`)
            .join("｜");
        rows.push([
            record.mimi_id || "未綁定",
            record.user_id || "",
            record.voted_at ? formatDate(record.voted_at) : "",
            choices.length,
            selectedCharacters
        ]);
    });

    const csv = `\ufeff${rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safePoolName = selectedPool.name.replace(/[\\/:*?"<>|]/g, "_");
    link.href = url;
    link.download = `${safePoolName}_投票紀錄.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showAdminNotification("投票紀錄 CSV 已下載。", "success");
}

function exportCharacters() {
    if (!selectedPool || poolCharacters.length === 0) return;

    const rows = [["精靈 ID", "精靈名稱"]];
    poolCharacters.forEach((character) => {
        rows.push([character.character_id, character.character_name]);
    });

    const csv = `\ufeff${rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safePoolName = selectedPool.name.replace(/[\\/:*?"<>|]/g, "_");
    link.href = url;
    link.download = `${safePoolName}_角色清單.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showAdminNotification(`已匯出「${selectedPool.name}」的 ${poolCharacters.length} 位角色。`, "success");
}

function toCsvCell(value) {
    const text = String(value ?? "");
    // Prevent spreadsheet applications from treating imported text as formulas.
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
}

function renderVoteRecords() {
    voteRecordList.innerHTML = "";
    const keyword = voteRecordSearch.value.trim().toLowerCase();
    const filteredRecords = voteRecords.filter((record) => {
        if (!keyword) return true;
        const searchable = [
            record.mimi_id,
            record.user_id,
            ...(record.selections || []).flatMap((selection) => [selection.character_id, selection.character_name])
        ].join(" ").toLowerCase();
        return searchable.includes(keyword);
    });
    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / VOTE_RECORDS_PER_PAGE));
    voteRecordCurrentPage = Math.min(Math.max(voteRecordCurrentPage, 1), totalPages);
    const start = (voteRecordCurrentPage - 1) * VOTE_RECORDS_PER_PAGE;
    const pageRecords = filteredRecords.slice(start, start + VOTE_RECORDS_PER_PAGE);

    voteRecordPage.textContent = `第 ${voteRecordCurrentPage} / ${totalPages} 頁`;
    voteRecordPreviousButton.disabled = voteRecordCurrentPage === 1;
    voteRecordNextButton.disabled = voteRecordCurrentPage === totalPages;

    if (filteredRecords.length === 0) {
        voteRecordList.innerHTML = "<p class=\"empty-state\">目前尚無使用者完成投票。</p>";
        return;
    }

    pageRecords.forEach((record) => {
        const item = document.createElement("article");
        const header = document.createElement("div");
        const mimi = document.createElement("strong");
        const user = document.createElement("span");
        const votedAt = document.createElement("time");
        const choices = document.createElement("div");

        item.className = "admin-vote-record";
        header.className = "admin-vote-record-header";
        mimi.textContent = `米米號 ${record.mimi_id || "未綁定"}`;
        user.textContent = `使用者 ID ${String(record.user_id).slice(0, 8)}`;
        votedAt.textContent = formatDate(record.voted_at);
        choices.className = "admin-vote-choice-list";

        (record.selections || []).forEach((selection) => {
            const choice = document.createElement("span");
            choice.className = "admin-vote-choice";
            choice.textContent = `#${selection.character_id} ${selection.character_name}`;
            choices.append(choice);
        });

        header.append(mimi, user, votedAt);
        item.append(header, choices);
        voteRecordList.append(item);
    });
}

function renderCharacter(character) {
    const item = document.createElement("div");
    const label = document.createElement("span");
    const details = document.createElement("div");
    const avatar = document.createElement("img");
    const text = document.createElement("div");
    const typeIcon = document.createElement("img");
    const deleteButton = document.createElement("button");
    item.className = "admin-character-item";
    details.className = "admin-character-details";
    avatar.className = "admin-character-avatar";
    avatar.src = `https://newseer.61.com/web/monster/head/${character.character_id}.png`;
    avatar.alt = "";
    avatar.loading = "lazy";
    avatar.addEventListener("error", () => { avatar.hidden = true; }, { once: true });
    text.className = "admin-character-text";
    label.textContent = `#${character.character_id}　${character.character_name}`;
    typeIcon.className = "admin-character-type-icon";
    typeIcon.alt = "精靈屬性";
    typeIcon.hidden = true;
    typeIcon.dataset.characterId = String(character.character_id);
    observedCharacterRows.add(item);
    deleteButton.type = "button";
    deleteButton.className = "text-button delete-character-button";
    deleteButton.textContent = "移除";
    deleteButton.hidden = selectedPool.status !== "draft";
    deleteButton.addEventListener("click", async () => {
        if (!await showConfirmDialog(`確定要移除「${character.character_name}」嗎？`, {
            confirmLabel: "移除",
            danger: true
        })) return;
        deleteButton.disabled = true;
        try {
            await deletePoolCharacter(character.id);
            await loadCharacters();
            showAdminNotification(`已移除角色「${character.character_name}」。`, "success");
        } catch (error) {
            console.error("Delete character error:", error);
            characterFormMessage.textContent = `移除失敗：${getAdminErrorMessage(error)}`;
            showAdminNotification(`移除角色失敗：${getAdminErrorMessage(error)}`, "error");
            deleteButton.disabled = false;
        }
    });
    text.append(label, typeIcon);
    details.append(avatar, text);
    item.append(details, deleteButton);
    characterList.append(item);
    characterTypeIconObserver.observe(item);
}

function requestCharacterTypeIcon(characterId, icon) {
    let metadata = characterTypeMetadataCache.get(characterId);
    if (!metadata) {
        let resolveMetadata;
        const promise = new Promise((resolve) => {
            resolveMetadata = resolve;
        });
        metadata = { promise, resolve: resolveMetadata, waiters: new Set() };
        characterTypeMetadataCache.set(characterId, metadata);
        characterTypeMetadataQueue.push({ characterId, metadata });
    }

    metadata.waiters.add(icon);
    metadata.promise.then((iconUrl) => {
        if (iconUrl && icon.isConnected && icon.dataset.visible === "true") {
            icon.src = iconUrl;
            icon.hidden = false;
        }
    });
    processCharacterTypeMetadataQueue();
}

function processCharacterTypeMetadataQueue() {
    while (activeCharacterTypeMetadataRequests < 4 && characterTypeMetadataQueue.length > 0) {
        const { characterId, metadata } = characterTypeMetadataQueue.shift();
        const hasVisibleWaiter = Array.from(metadata.waiters).some((icon) =>
            icon.isConnected && icon.dataset.visible === "true"
        );
        if (!hasVisibleWaiter) {
            if (characterTypeMetadataCache.get(characterId) === metadata) {
                characterTypeMetadataCache.delete(characterId);
            }
            metadata.resolve(null);
            continue;
        }

        activeCharacterTypeMetadataRequests += 1;
        fetchCharacterTypeIconUrl(characterId)
            .catch((error) => {
                console.warn(`Failed to load Seer type for pet ${characterId}:`, error);
                return null;
            })
            .then((iconUrl) => {
                metadata.resolve(iconUrl);
            })
            .finally(() => {
                activeCharacterTypeMetadataRequests -= 1;
                processCharacterTypeMetadataQueue();
            });
    }
}

async function fetchCharacterTypeIconUrl(characterId) {
    const pet = await fetchJson(`https://api.seerapi.com/v1/pet/${characterId}`);
    const typeId = pet && pet.type && pet.type.id;
    if (!typeId) {
        throw new Error("SeerAPI 回傳未包含 type.id。");
    }

    const typeCombination = await fetchJson(`https://api.seerapi.com/v1/element_type_combination/${typeId}`);
    const resolvedTypeId = Number(typeCombination && typeCombination.id ? typeCombination.id : typeId);
    if (!Number.isSafeInteger(resolvedTypeId) || resolvedTypeId <= 0) {
        throw new Error("SeerAPI 回傳的屬性 ID 無效。");
    }
    return `https://img.yuyuqaq.cn/seer-pet/type/${resolvedTypeId}.png`;
}

function toIsoDate(elementId) {
    const date = document.getElementById(elementId).value;
    const time = document.getElementById(`${elementId}-time`).value;
    return date && time ? new Date(`${date}T${time}`).toISOString() : null;
}

function toLocalDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
}

function formatDate(value) {
    return value ? new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" }) : "未設定";
}

initializeTimeSelects();
initializeDateTimePickers();
loadAdminPage();
