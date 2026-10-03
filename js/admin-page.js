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
    deletePool,
    getPoolVoteDetails
} from "./admin.js";

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
const characterImportForm = document.getElementById("character-import-form");
const characterImportText = document.getElementById("character-import-text");
const characterImportCount = document.getElementById("character-import-count");
const characterImportMessage = document.getElementById("character-import-message");
const characterList = document.getElementById("admin-character-list");
const characterCount = document.getElementById("admin-character-count");
const characterSearch = document.getElementById("admin-character-search");
const startPoolButton = document.getElementById("start-pool-button");
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

let pools = [];
let selectedPool = null;
let poolCharacters = [];
let loadedCharacterPoolId = null;
let voteRecords = [];
let voteRecordCurrentPage = 1;
const VOTE_RECORDS_PER_PAGE = 20;

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
        return;
    }
    window.location.href = "./index.html";
});

document.getElementById("show-create-pool-button").addEventListener("click", showCreatePoolEditor);
document.getElementById("close-editor-button").addEventListener("click", () => { editor.hidden = true; });

poolForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("pool-form-name").value.trim();
    const startAt = toIsoDate("pool-form-start");
    const endAt = toIsoDate("pool-form-end");
    const maxVotes = Number(document.getElementById("pool-form-max-votes").value);
    if (!name || !startAt || !endAt || !maxVotes) return;
    if (new Date(endAt) <= new Date(startAt)) {
        poolFormMessage.textContent = "結束時間必須晚於開始時間。";
        return;
    }

    const saveButton = document.getElementById("save-pool-button");
    saveButton.disabled = true;
    poolFormMessage.textContent = "儲存中…";
    try {
        if (selectedPool) {
            await updatePoolDraft(selectedPool.id, name, startAt, endAt, maxVotes);
            poolFormMessage.textContent = "Pool 設定已更新。";
        } else {
            await createPool(name, startAt, endAt, maxVotes);
            poolFormMessage.textContent = "Pool 已建立。";
        }
        await loadPools();
    } catch (error) {
        console.error("Save pool error:", error);
        poolFormMessage.textContent = `儲存失敗：${error.message}`;
    } finally {
        saveButton.disabled = false;
    }
});

characterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedPool) return;
    const characterId = Number(document.getElementById("character-id").value);
    const characterName = document.getElementById("character-name").value.trim();
    if (!characterName || Number.isNaN(characterId)) return;

    const addButton = document.getElementById("add-character-button");
    addButton.disabled = true;
    characterFormMessage.textContent = "新增中…";
    try {
        await addPoolCharacter(selectedPool.id, characterId, characterName);
        characterForm.reset();
        characterFormMessage.textContent = "角色已新增。";
        await loadCharacters();
    } catch (error) {
        console.error("Add character error:", error);
        characterFormMessage.textContent = `新增失敗：${error.message}`;
    } finally {
        addButton.disabled = false;
    }
});

characterImportText.addEventListener("input", () => {
    const { characters, invalidLines } = parseImportedCharacters(characterImportText.value);
    characterImportCount.textContent = invalidLines.length > 0
        ? `辨識 ${characters.length} 位；${invalidLines.length} 行格式有誤。`
        : characters.length > 0
            ? `已辨識 ${characters.length} 位角色。`
            : "尚未輸入角色。";
});

characterSearch.addEventListener("input", renderCharacters);

characterImportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedPool || selectedPool.status !== "draft") return;

    const { characters, invalidLines } = parseImportedCharacters(characterImportText.value);
    if (characters.length === 0) {
        characterImportMessage.textContent = "請輸入至少一筆正確格式的角色資料。";
        return;
    }
    if (invalidLines.length > 0) {
        characterImportMessage.textContent = `第 ${invalidLines.join("、")} 行格式有誤，請修正後再匯入。`;
        return;
    }

    const importButton = document.getElementById("import-characters-button");
    importButton.disabled = true;
    characterImportText.disabled = true;
    characterImportMessage.textContent = `正在匯入 ${characters.length} 位角色…`;

    const results = [];
    for (const character of characters) {
        try {
            await addPoolCharacter(selectedPool.id, character.characterId, character.characterName);
            results.push({ character, ok: true });
        } catch (error) {
            results.push({ character, ok: false, error });
        }
    }

    const failed = results.filter((result) => !result.ok);
    const successCount = results.length - failed.length;
    if (failed.length === 0) {
        characterImportMessage.textContent = `已成功匯入 ${successCount} 位角色。`;
        characterImportText.value = "";
        characterImportCount.textContent = "尚未輸入角色。";
    } else {
        const failedIds = failed.slice(0, 5).map((result) => result.character.characterId).join("、");
        characterImportMessage.textContent = `成功 ${successCount} 位；失敗 ${failed.length} 位（${failedIds}${failed.length > 5 ? "…" : ""}）。`;
    }
    characterImportText.disabled = false;
    importButton.disabled = false;
    await loadCharacters();
});

startPoolButton.addEventListener("click", () => changePoolStatus("start"));
closePoolButton.addEventListener("click", () => changePoolStatus("close"));
deletePoolButton.addEventListener("click", deleteSelectedPool);
refreshVoteRecordsButton.addEventListener("click", loadVoteRecords);
exportVoteRecordsButton.addEventListener("click", exportVoteRecords);
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
    const label = action === "start" ? "啟動" : "關閉";
    if (!window.confirm(`確定要${label}「${selectedPool.name}」嗎？此操作無法復原。`)) return;

    const button = action === "start" ? startPoolButton : closePoolButton;
    button.disabled = true;
    poolFormMessage.textContent = `${label}中…`;
    try {
        if (action === "start") await startPool(selectedPool.id);
        else await closePool(selectedPool.id);
        poolFormMessage.textContent = `Pool 已${label}。`;
        await loadPools();
        await selectPool(selectedPool.id);
    } catch (error) {
        console.error(`${label} pool error:`, error);
        poolFormMessage.textContent = `${label}失敗：${error.message}`;
    } finally {
        button.disabled = false;
    }
}

async function deleteSelectedPool() {
    if (!selectedPool || selectedPool.status !== "draft") return;
    if (!window.confirm(`確定要永久刪除 draft Pool「${selectedPool.name}」及其所有角色嗎？此操作無法復原。`)) return;

    deletePoolButton.disabled = true;
    poolFormMessage.textContent = "刪除中…";
    try {
        await deletePool(selectedPool.id);
        selectedPool = null;
        editor.hidden = true;
        await loadPools();
    } catch (error) {
        console.error("Delete pool error:", error);
        poolFormMessage.textContent = `刪除失敗：${error.message}`;
        deletePoolButton.disabled = false;
    }
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
    } catch (error) {
        console.error("Load admin page error:", error);
        adminWorkspace.hidden = false;
        poolList.innerHTML = "<p class=\"empty-state\">載入管理資料失敗，請重新整理後再試。</p>";
    }
}

async function loadPools() {
    pools = await getAdminPools();
    renderPools();
}

function renderPools() {
    poolList.innerHTML = "";
    if (pools.length === 0) {
        poolList.innerHTML = "<p class=\"empty-state\">目前沒有任何 Pool。</p>";
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

async function selectPool(poolId) {
    selectedPool = pools.find((pool) => pool.id === poolId) ?? null;
    if (!selectedPool) return;
    editor.hidden = false;
    document.getElementById("editor-title").textContent = selectedPool.name;
    document.getElementById("editor-description").textContent = `Pool ID：${selectedPool.id}`;
    document.getElementById("pool-form-name").value = selectedPool.name;
    setPoolDateValue("pool-form-start", toLocalDateTime(selectedPool.start_at));
    setPoolDateValue("pool-form-end", toLocalDateTime(selectedPool.end_at));
    document.getElementById("pool-form-max-votes").value = selectedPool.max_votes;
    document.getElementById("save-pool-button").textContent = "儲存 draft 設定";
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
    deletePoolButton.hidden = !isDraft;
    await loadCharacters();
    await loadVoteRecords();
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showCreatePoolEditor() {
    selectedPool = null;
    editor.hidden = false;
    document.getElementById("editor-title").textContent = "建立 Pool";
    document.getElementById("editor-description").textContent = "設定投票期間與每位玩家必選的角色數。";
    poolForm.reset();
    setPoolDateValue("pool-form-start", "");
    setPoolDateValue("pool-form-end", "");
    poolForm.querySelectorAll("input, select").forEach((input) => { input.disabled = false; });
    setPoolDatePickersDisabled(false);
    document.getElementById("save-pool-button").hidden = false;
    document.getElementById("save-pool-button").textContent = "建立 Pool";
    poolFormMessage.textContent = "";
    characterManager.hidden = true;
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function parseImportedCharacters(value) {
    const characters = [];
    const invalidLines = [];
    const seenIds = new Set();

    value.split(/\r?\n/).forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const match = trimmed.match(/^\s*(\d+)\s*[,\t]\s*(.+?)\s*$/);
        if (!match || seenIds.has(match[1])) {
            invalidLines.push(index + 1);
            return;
        }
        seenIds.add(match[1]);
        characters.push({
            characterId: Number(match[1]),
            characterName: match[2]
        });
    });

    return { characters, invalidLines };
}

async function loadCharacters() {
    if (!selectedPool) return;
    characterList.innerHTML = "<p class=\"empty-state\">正在載入角色…</p>";
    characterCount.textContent = "正在載入角色…";
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
    }
}

function renderCharacters() {
    const keyword = characterSearch.value.trim().toLowerCase();
    const filteredCharacters = poolCharacters.filter((character) => {
        const searchable = `${character.character_id} ${character.character_name}`.toLowerCase();
        return searchable.includes(keyword);
    });

    characterCount.textContent = keyword
        ? `顯示 ${filteredCharacters.length} / ${poolCharacters.length} 位角色`
        : `共 ${poolCharacters.length} 位角色`;
    characterList.innerHTML = "";

    if (filteredCharacters.length === 0) {
        characterList.innerHTML = `<p class="empty-state">${poolCharacters.length === 0 ? "此 Pool 尚未加入角色。" : "找不到符合的角色。"}</p>`;
        return;
    }

    filteredCharacters.forEach((character) => renderCharacter(character));
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
    } finally {
        refreshVoteRecordsButton.disabled = false;
        exportVoteRecordsButton.disabled = voteRecords.length === 0;
    }
}

function exportVoteRecords() {
    if (!selectedPool || voteRecords.length === 0) return;

    const rows = [["米米號", "使用者 ID", "投票時間", "角色編號", "角色名稱"]];
    voteRecords.forEach((record) => {
        const choices = record.selections?.length ? record.selections : [{}];
        choices.forEach((choice) => {
            rows.push([
                record.mimi_id || "未綁定",
                record.user_id || "",
                record.voted_at ? formatDate(record.voted_at) : "",
                choice.character_id ?? "",
                choice.character_name ?? ""
            ]);
        });
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
}

function toCsvCell(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
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
    const deleteButton = document.createElement("button");
    item.className = "admin-character-item";
    label.textContent = `#${character.character_id}　${character.character_name}`;
    deleteButton.type = "button";
    deleteButton.className = "text-button delete-character-button";
    deleteButton.textContent = "移除";
    deleteButton.hidden = selectedPool.status !== "draft";
    deleteButton.addEventListener("click", async () => {
        if (!window.confirm(`確定要移除「${character.character_name}」嗎？`)) return;
        deleteButton.disabled = true;
        try {
            await deletePoolCharacter(character.id);
            await loadCharacters();
        } catch (error) {
            console.error("Delete character error:", error);
            characterFormMessage.textContent = `移除失敗：${error.message}`;
            deleteButton.disabled = false;
        }
    });
    item.append(label, deleteButton);
    characterList.append(item);
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
