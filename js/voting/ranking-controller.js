export function createRankingController({
    clearObservedTypeIcons,
    rankingPagination,
    getPoolRanking,
    createCharacterTypeIcon,
    seerLookup,
    getCurrentPool,
    getCharacters,
    getIsAdministrator
}) {
    const rankingPreviousPageButton = document.getElementById("ranking-previous-page");
    const rankingNextPageButton = document.getElementById("ranking-next-page");
    const rankingPageLabel = document.getElementById("ranking-page");

    let rankingTimer = null;

    let currentRanking = [];

    let currentRankingPage = 1;

    const RANKINGS_PER_PAGE = 10;

    rankingPreviousPageButton.addEventListener("click", () => {
        currentRankingPage -= 1;
        renderRanking(currentRanking);
    });

    rankingNextPageButton.addEventListener("click", () => {
        currentRankingPage += 1;
        renderRanking(currentRanking);
    });

    async function loadRanking() {
        const rankingList = document.getElementById("ranking-list");
        if (!getCurrentPool()) {
            clearObservedTypeIcons(rankingList);
            rankingList.innerHTML = "<p class=\"empty-state\">目前沒有可顯示的排名。</p>";
            currentRanking = [];
            currentRankingPage = 1;
            rankingPagination.hidden = true;
            return;
        }
        try {
            currentRanking = await getPoolRanking(getCurrentPool().id);
            renderRanking(currentRanking);
        } catch (error) {
            console.error("Ranking error:", error);
            clearObservedTypeIcons(rankingList);
            rankingList.textContent = `讀取排名失敗：${error.message}`;
            rankingPagination.hidden = true;
        }
    }

    function renderRanking(ranking) {
        const rankingList = document.getElementById("ranking-list");
        clearObservedTypeIcons(rankingList);
        rankingList.innerHTML = "";
        if (ranking.length === 0) {
            rankingList.innerHTML = "<p class=\"empty-state\">尚無投票資料，排名將在第一張票送出後顯示。</p>";
            rankingPageLabel.textContent = "第 1 / 1 頁";
            rankingPagination.hidden = true;
            currentRankingPage = 1;
            return;
        }

        const totalPages = Math.ceil(ranking.length / RANKINGS_PER_PAGE);
        currentRankingPage = Math.min(Math.max(currentRankingPage, 1), totalPages);
        const start = (currentRankingPage - 1) * RANKINGS_PER_PAGE;
        const pageRanking = ranking.slice(start, start + RANKINGS_PER_PAGE);
        rankingPageLabel.textContent = `第 ${currentRankingPage} / ${totalPages} 頁`;
        rankingPreviousPageButton.disabled = currentRankingPage === 1;
        rankingNextPageButton.disabled = currentRankingPage === totalPages;
        rankingPagination.hidden = totalPages <= 1;

        for (const item of pageRanking) {
            const row = document.createElement("button");
            const character = findRankingCharacter(item);
            const characterId = item.character_id ?? character?.character_id ?? "—";
            row.className = "ranking-item";
            row.type = "button";
            row.setAttribute("aria-label", `查看${item.character_name}精靈資訊`);
            row.innerHTML = `<span class="ranking-rank">${String(item.rank).padStart(2, "0")}</span><img class="ranking-portrait" alt="" loading="lazy"><span class="ranking-character"><span class="ranking-character-id"></span><span class="ranking-name"></span></span><span class="ranking-votes">${item.vote_count} 票</span>`;
            const portrait = row.querySelector(".ranking-portrait");
            if (characterId !== "—") {
                portrait.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(characterId)}.png`;
                portrait.alt = `${item.character_name} 縮圖`;
                portrait.addEventListener("error", () => { portrait.hidden = true; }, { once: true });
            } else {
                portrait.hidden = true;
            }
            row.querySelector(".ranking-character-id").textContent = characterId === "—" ? "" : `#${characterId}`;
            const rankingName = row.querySelector(".ranking-name");
            rankingName.textContent = item.character_name;
            if (characterId !== "—") {
                const typeIcon = createCharacterTypeIcon(characterId);
                const nameLine = document.createElement("span");
                nameLine.className = "ranking-name-line";
                rankingName.replaceWith(nameLine);
                nameLine.append(rankingName, typeIcon);
                row.addEventListener("click", () => seerLookup.openPetInfo(characterId));
            } else {
                row.disabled = true;
            }
            rankingList.appendChild(row);
        }
    }

    function findRankingCharacter(item) {
        if (item.pool_character_id) {
            return getCharacters().find((character) => character.id === item.pool_character_id);
        }
        if (item.character_id) {
            return getCharacters().find((character) => String(character.character_id) === String(item.character_id));
        }
        return getCharacters().find((character) => character.character_name === item.character_name);
    }

    function startRankingRefresh() {
        if (!getIsAdministrator()) return;
        if (rankingTimer === null) rankingTimer = setInterval(() => loadRanking(), 5000);
    }

    function stopRankingRefresh() {
        if (rankingTimer !== null) clearInterval(rankingTimer);
        rankingTimer = null;
    }
    return { loadRanking, renderRanking, findRankingCharacter, startRankingRefresh, stopRankingRefresh, resetRanking: () => { currentRanking = []; currentRankingPage = 1; } };
}
