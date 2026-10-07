export function createVotingController({
    publicLoginPrompt,
    mimiBindingPrompt,
    selectionBar,
    alreadyVoted,
    submitButton,
    getActivePool,
    getPoolCharacters,
    hasVoted,
    getMyVote,
    voteMessage,
    clearObservedTypeIcons,
    seerLookup,
    createCharacterTypeIcon,
    resetRanking,
    rankingPagination,
    selectionCount,
    selectionMax,
    submitVote,
    loadRanking,
    getIsAuthenticated,
    getIsAdministrator,
    getHasMiMiBinding
}) {
    const characterList = document.getElementById("character-list");
    const characterPagination = document.getElementById("character-pagination");
    const characterPreviousPageButton = document.getElementById("character-previous-page");
    const characterNextPageButton = document.getElementById("character-next-page");
    const characterPageLabel = document.getElementById("character-page");
    const alreadyVotedMessage = document.getElementById("already-voted-message");
    const poolStatus = document.getElementById("pool-status");

    let currentPool = null;

    let currentCharacters = [];

    let currentCharacterPage = 1;

    let selectedPoolCharacterIds = new Set();

    let isVoteLocked = false;

    const CHARACTERS_PER_PAGE = 28;

    characterPreviousPageButton.addEventListener("click", () => {
        currentCharacterPage -= 1;
        renderCurrentCharacterPage();
    });

    characterNextPageButton.addEventListener("click", () => {
        currentCharacterPage += 1;
        renderCurrentCharacterPage();
    });

    async function loadPool() {
        if (!getIsAdministrator()) return;
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

            if (!getHasMiMiBinding()) {
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
            checkbox.disabled = isVoteLocked || !getHasMiMiBinding();
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
            card.setAttribute("role", "button");
            card.tabIndex = 0;
            card.setAttribute("aria-haspopup", "dialog");
            card.setAttribute("aria-label", `查看${character.character_name}精靈資訊`);
            const openInfo = () => {
                if (getIsAuthenticated()) return;
                card.focus({ preventScroll: true });
                seerLookup.openPetInfo(character.character_id);
            };
            card.addEventListener("click", openInfo);
            card.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openInfo();
                }
            });
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
        if (getIsAuthenticated()) renderCurrentVoteCharacters();
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
        resetRanking();
        rankingPagination.hidden = true;
        selectionBar.hidden = true;
        publicLoginPrompt.hidden = true;
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
        if (!getHasMiMiBinding()) {
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
    return { loadPool, renderVoteCharacters, renderCurrentVoteCharacters, restoreSavedVote, renderPublicCharacterPage, sortCharactersByIdDescending, updateCharacterPagination, renderCurrentCharacterPage, createCharacterPortrait, appendCharacterName, renderPoolMeta, renderNoActivePool, updateSelectionCount, getCurrentPool: () => currentPool, getCharacters: () => currentCharacters, resetPool: () => { currentPool = null; } };
}
