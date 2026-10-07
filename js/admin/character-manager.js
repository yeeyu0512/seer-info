import { typeIconUrl } from "../shared/assets.js";
export function createCharacterManager({
    characterForm,
    showAdminNotification,
    addPoolCharacter,
    getAdminErrorMessage,
    parseImportedCharacters,
    characterImportForm,
    mapWithConcurrency,
    fetchJson,
    toTraditionalChinese,
    getPoolCharacters,
    showConfirmDialog,
    deleteAllCharactersProgress,
    deletePoolCharacter,
    toCsvCell,
    getSelectedPool
}) {
    const characterFormMessage = document.getElementById("character-form-message");
    const lookupSeerPetButton = document.getElementById("lookup-seer-pet-button");
    const seerPetIdInput = document.getElementById("seer-pet-id");
    const seerPetPreview = document.getElementById("seer-pet-preview");
    const seerPetIcon = document.getElementById("seer-pet-icon");
    const seerPetTypeIcon = document.getElementById("seer-pet-type-icon");
    const seerPetTypeName = document.getElementById("seer-pet-type-name");
    const seerPetName = document.getElementById("seer-pet-name");
    const seerPetIdPreview = document.getElementById("seer-pet-id-preview");
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
    const deleteAllCharactersButton = document.getElementById("delete-all-characters-button");
    const deleteAllCharactersProgressText = document.getElementById("delete-all-characters-progress-text");
    const deleteAllCharactersProgressPercent = document.getElementById("delete-all-characters-progress-percent");
    const deleteAllCharactersProgressBar = document.getElementById("delete-all-characters-progress-bar");
    const deleteAllCharactersProgressFill = document.getElementById("delete-all-characters-progress-fill");
    const exportCharactersButton = document.getElementById("export-characters-button");
    const characterPreviousPageButton = document.getElementById("admin-character-previous-page");
    const characterNextPageButton = document.getElementById("admin-character-next-page");
    const characterPage = document.getElementById("admin-character-page");

    let resolvedSeerPetId = null;

    const characterTypeMetadataCache = new Map();

    const characterTypeMetadataQueue = [];

    const observedCharacterRows = new Set();

    let activeCharacterTypeMetadataRequests = 0;

    let poolCharacters = [];

    let loadedCharacterPoolId = null;

    let characterCurrentPage = 1;

    const CHARACTERS_PER_PAGE = 5;

    lookupSeerPetButton.addEventListener("click", lookupSeerPet);

    seerPetIdInput.addEventListener("input", () => {
        if (resolvedSeerPetId !== null && seerPetIdInput.value.trim() !== String(resolvedSeerPetId)) {
            clearSeerPreview(false);
        }
    });

    characterForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!getSelectedPool()) return;
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
            await addPoolCharacter(getSelectedPool().id, characterId, characterName);
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

    deleteAllCharactersButton.addEventListener("click", deleteAllPoolCharacters);

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
        if (!getSelectedPool() || getSelectedPool().status !== "draft") return;

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
                await addPoolCharacter(getSelectedPool().id, character.characterId, character.characterName);
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

    exportCharactersButton.addEventListener("click", exportCharacters);

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
                typeIconUrl: typeIconUrl(resolvedTypeId)
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

    async function loadCharacters() {
        if (!getSelectedPool()) return;
        characterList.innerHTML = "<p class=\"empty-state\">正在載入角色…</p>";
        characterCount.textContent = "正在載入角色…";
        deleteAllCharactersButton.disabled = true;
        exportCharactersButton.disabled = true;
        if (loadedCharacterPoolId !== getSelectedPool().id) characterSearch.value = "";
        try {
            poolCharacters = await getPoolCharacters(getSelectedPool().id);
            loadedCharacterPoolId = getSelectedPool().id;
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
        deleteAllCharactersButton.hidden = getSelectedPool()?.status !== "draft";
        deleteAllCharactersButton.disabled = getSelectedPool()?.status !== "draft" || poolCharacters.length === 0;
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

    async function deleteAllPoolCharacters() {
        if (!getSelectedPool() || getSelectedPool().status !== "draft" || poolCharacters.length === 0) return;
        const poolId = getSelectedPool().id;
        const poolName = getSelectedPool().name;
        const charactersToDelete = [...poolCharacters];
        if (!await showConfirmDialog(
            `確定要從「${poolName}」移除全部 ${charactersToDelete.length} 位角色嗎？此操作無法復原。`,
            { confirmLabel: "全部刪除", danger: true }
        )) return;

        deleteAllCharactersButton.disabled = true;
        characterSearch.disabled = true;
        const updateDeleteProgress = (label, completed) => {
            if (getSelectedPool()?.id !== poolId) return;
            const percent = Math.floor(completed / charactersToDelete.length * 100);
            deleteAllCharactersProgress.hidden = false;
            deleteAllCharactersProgressText.textContent = `${label}（${completed}/${charactersToDelete.length}）`;
            deleteAllCharactersProgressPercent.textContent = `${percent}%`;
            deleteAllCharactersProgressBar.setAttribute("aria-valuenow", String(percent));
            deleteAllCharactersProgressBar.setAttribute(
                "aria-valuetext",
                `${label}，${completed}/${charactersToDelete.length}，${percent}%`
            );
            deleteAllCharactersProgressFill.style.width = `${percent}%`;
        };
        let deletedCount = 0;
        let processedCount = 0;
        const failures = [];
        updateDeleteProgress("正在移除角色", 0);
        try {
            for (const character of charactersToDelete) {
                try {
                    await deletePoolCharacter(character.id);
                    deletedCount += 1;
                } catch (error) {
                    failures.push({ character, error });
                } finally {
                    processedCount += 1;
                    updateDeleteProgress("正在移除角色", processedCount);
                }
            }
            if (getSelectedPool()?.id === poolId) await loadCharacters();
            if (failures.length > 0) {
                const failedNames = failures.slice(0, 3)
                    .map(({ character }) => `${character.character_name}（#${character.character_id}）`)
                    .join("、");
                const message = `已移除 ${deletedCount} 位；${failures.length} 位失敗${failedNames ? `：${failedNames}${failures.length > 3 ? "…" : ""}` : ""}。`;
                updateDeleteProgress(`處理完成：成功 ${deletedCount} 位、失敗 ${failures.length} 位`, processedCount);
                showAdminNotification(message, "error");
                failures.forEach(({ character, error }) => {
                    console.error(`Delete pool character ${character.id} error:`, error);
                });
            } else {
                updateDeleteProgress("刪除完成", processedCount);
                showAdminNotification(`已從「${poolName}」移除全部 ${deletedCount} 位角色。`, "success");
            }
        } catch (error) {
            console.error("Delete all pool characters error:", error);
            updateDeleteProgress("刪除中斷", processedCount);
            showAdminNotification(`批次移除角色失敗：${getAdminErrorMessage(error)}`, "error");
        } finally {
            characterSearch.disabled = false;
            if (getSelectedPool()?.id === poolId) renderCharacters();
        }
    }

    function exportCharacters() {
        if (!getSelectedPool() || poolCharacters.length === 0) return;

        const rows = [["精靈 ID", "精靈名稱"]];
        poolCharacters.forEach((character) => {
            rows.push([character.character_id, character.character_name]);
        });

        const csv = `\ufeff${rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n")}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const safePoolName = getSelectedPool().name.replace(/[\\/:*?"<>|]/g, "_");
        link.href = url;
        link.download = `${safePoolName}_角色清單.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showAdminNotification(`已匯出「${getSelectedPool().name}」的 ${poolCharacters.length} 位角色。`, "success");
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
        deleteButton.hidden = getSelectedPool().status !== "draft";
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
                if (icon.classList.contains("character-type-icon")) icon.classList.add("is-loaded");
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
        return typeIconUrl(resolvedTypeId);
    }
    return { renderSeerPreview, clearSeerPreview, lookupSeerPet, loadCharacters, renderCharacters, deleteAllPoolCharacters, exportCharacters, renderCharacter, requestCharacterTypeIcon, processCharacterTypeMetadataQueue, fetchCharacterTypeIconUrl };
}
