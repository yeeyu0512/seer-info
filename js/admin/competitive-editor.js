export function createCompetitiveEditor({
    getAdminCompetitivePools,
    showAdminNotification,
    getAdminErrorMessage,
    formatDate,
    setPoolDateValue,
    competitivePoolNameInput,
    toLocalDateTime,
    toIsoDate,
    updateCompetitivePool,
    createCompetitivePool,
    showConfirmDialog,
    deleteCompetitivePool,
    getCompetitivePoolCharacters,
    toCsvCell,
    fetchJson,
    toTraditionalChinese,
    addCompetitivePoolCharacter,
    competitivePoolImportProgress,
    parseCompetitivePoolPetIds,
    mapWithConcurrency,
    addCompetitivePoolCharacters,
    deleteCompetitivePoolCharacter
}) {
    const competitivePoolAdminList = document.getElementById("competitive-pool-admin-list");
    const competitivePoolEditor = document.getElementById("competitive-pool-editor");
    const competitivePoolEditorTitle = document.getElementById("competitive-pool-editor-title");
    const competitivePoolForm = document.getElementById("competitive-pool-form");
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
    const exportCompetitivePoolCsvButton = document.getElementById("export-competitive-pool-csv-button");
    const competitivePoolImportForm = document.getElementById("competitive-pool-import-form");
    const competitivePoolImportType = document.getElementById("competitive-pool-import-type");
    const competitivePoolImportIds = document.getElementById("competitive-pool-import-ids");
    const competitivePoolImportCount = document.getElementById("competitive-pool-import-count");
    const competitivePoolImportButton = document.getElementById("competitive-pool-import-button");
    const competitivePoolImportProgressText = document.getElementById("competitive-pool-import-progress-text");
    const competitivePoolImportProgressPercent = document.getElementById("competitive-pool-import-progress-percent");
    const competitivePoolImportProgressBar = competitivePoolImportProgress.querySelector("[role='progressbar']");
    const competitivePoolImportProgressFill = document.getElementById("competitive-pool-import-progress-fill");
    const competitivePoolImportMessage = document.getElementById("competitive-pool-import-message");

    let competitivePools = [];

    let selectedCompetitivePool = null;

    let competitivePoolCharacters = [];

    let resolvedCompetitivePet = null;

    let competitivePoolCharacterLoadRequestId = 0;

    createCompetitivePoolButton.addEventListener("click", showNewCompetitivePoolEditor);

    cancelCompetitivePoolButton.addEventListener("click", closeCompetitivePoolEditor);

    competitivePoolForm.addEventListener("submit", saveCompetitivePool);

    deleteCompetitivePoolButton.addEventListener("click", deleteSelectedCompetitivePool);

    competitivePetIdInput.addEventListener("input", clearCompetitivePetPreview);

    lookupCompetitivePetButton.addEventListener("click", lookupCompetitivePet);

    competitivePoolCharacterForm.addEventListener("submit", addSelectedCompetitivePet);

    exportCompetitivePoolCsvButton.addEventListener("click", exportCompetitivePoolCsv);

    competitivePoolImportIds.addEventListener("input", updateCompetitivePoolImportCount);

    competitivePoolImportForm.addEventListener("submit", importCompetitivePoolCharacters);

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
        exportCompetitivePoolCsvButton.disabled = true;
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
        exportCompetitivePoolCsvButton.disabled = true;
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
        exportCompetitivePoolCsvButton.disabled = true;
        competitivePoolCharacterList.innerHTML = "<p class=\"empty-state\">正在載入精靈名單…</p>";
        try {
            const characters = await getCompetitivePoolCharacters(poolId);
            if (requestId !== competitivePoolCharacterLoadRequestId || selectedCompetitivePool?.id !== poolId) return;
            competitivePoolCharacters = characters;
            exportCompetitivePoolCsvButton.disabled = characters.length === 0;
            renderCompetitivePoolCharacters();
        } catch (error) {
            if (requestId !== competitivePoolCharacterLoadRequestId || selectedCompetitivePool?.id !== poolId) return;
            console.error("Load competitive pool characters error:", error);
            competitivePoolCharacters = [];
            exportCompetitivePoolCsvButton.disabled = true;
            competitivePoolCharacterList.innerHTML = "<p class=\"empty-state\">精靈名單載入失敗。</p>";
            showAdminNotification(`載入精靈名單失敗：${getAdminErrorMessage(error)}`, "error");
        }
    }

    function exportCompetitivePoolCsv() {
        if (!selectedCompetitivePool || competitivePoolCharacters.length === 0) return;

        const typeLabels = {
            banned: ["禁止池", "禁止攜帶"],
            restricted: ["限制池", "最多攜帶 2 隻"],
            semi_restricted: ["準限制池", "最多攜帶 3 隻"]
        };
        const rows = [["競技池期間", "開始時間", "結束時間", "池種", "攜帶規則", "精靈 ID", "精靈名稱"]];
        competitivePoolCharacters.forEach((character) => {
            const [typeName, rule] = Object.prototype.hasOwnProperty.call(typeLabels, character.pool_type)
                ? typeLabels[character.pool_type]
                : ["未知", ""];
            rows.push([
                selectedCompetitivePool.name,
                formatDate(selectedCompetitivePool.start_at),
                formatDate(selectedCompetitivePool.end_at),
                typeName,
                rule,
                character.seer_pet_id,
                character.pet_name
            ]);
        });

        const csv = `\ufeff${rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n")}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const safePoolName = selectedCompetitivePool.name.replace(/[\\/:*?"<>|]/g, "_");
        link.href = url;
        link.download = `${safePoolName}_競技池名單.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showAdminNotification(`已匯出「${selectedCompetitivePool.name}」的 ${competitivePoolCharacters.length} 隻競技池精靈。`, "success");
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
    return { loadAdminCompetitivePools, renderAdminCompetitivePools, showNewCompetitivePoolEditor, closeCompetitivePoolEditor, openCompetitivePoolEditor, saveCompetitivePool, deleteSelectedCompetitivePool, loadCompetitivePoolCharacters, exportCompetitivePoolCsv, renderCompetitivePoolCharacters, lookupCompetitivePet, fetchCompetitivePet, clearCompetitivePetPreview, addSelectedCompetitivePet, updateCompetitivePoolImportCount, resetCompetitivePoolImport, importCompetitivePoolCharacters, removeCompetitivePoolCharacter, getPreviewCharacters: () => competitivePoolCharacters };
}
