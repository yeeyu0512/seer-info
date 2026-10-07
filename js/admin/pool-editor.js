export function createPoolEditor({
    toIsoDate,
    showAdminNotification,
    updatePoolDraft,
    createPool,
    getAdminErrorMessage,
    showConfirmDialog,
    startPool,
    closePool,
    returnPoolToDraft,
    deletePool,
    getAdminPools,
    poolList,
    formatDate,
    deleteAllCharactersProgress,
    characterForm,
    clearSeerPreview,
    setPoolDateValue,
    toLocalDateTime,
    setPoolDatePickersDisabled,
    characterImportForm,
    loadCharacters,
    loadVoteRecords
}) {
    const editor = document.getElementById("pool-editor");
    const poolForm = document.getElementById("pool-form");
    const poolFormMessage = document.getElementById("pool-form-message");
    const characterManager = document.getElementById("character-manager");
    const characterEditControls = document.getElementById("character-edit-controls");
    const startPoolButton = document.getElementById("start-pool-button");
    const draftPoolButton = document.getElementById("draft-pool-button");
    const closePoolButton = document.getElementById("close-pool-button");
    const deletePoolButton = document.getElementById("delete-pool-button");

    let pools = [];

    let selectedPool = null;

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

    startPoolButton.addEventListener("click", () => changePoolStatus("start"));

    draftPoolButton.addEventListener("click", () => changePoolStatus("draft"));

    closePoolButton.addEventListener("click", () => changePoolStatus("close"));

    deletePoolButton.addEventListener("click", deleteSelectedPool);

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

    async function selectPool(poolId) {
        selectedPool = pools.find((pool) => pool.id === poolId) ?? null;
        if (!selectedPool) return;
        deleteAllCharactersProgress.hidden = true;
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
    return { changePoolStatus, deleteSelectedPool, loadPools, renderPools, selectPool, showCreatePoolEditor, getSelectedPool: () => selectedPool };
}
