export function createCompetitiveView({
    getCurrentCompetitivePool,
    clearObservedTypeIcons,
    createCharacterTypeIcon,
    seerLookup
}) {
    const competitivePoolPeriod = document.getElementById("competitive-pool-period");
    const competitivePoolMessage = document.getElementById("competitive-pool-message");
    const competitivePoolGroups = document.getElementById("competitive-pool-groups");
    const competitivePoolTypeTabs = document.getElementById("competitive-pool-type-tabs");
    const competitivePoolTypeTabButtons = Array.from(document.querySelectorAll(".competitive-pool-type-tab"));
    const refreshCompetitivePoolButton = document.getElementById("refresh-competitive-pool-button");

    let competitivePoolRequestId = 0;

    let currentCompetitivePoolCharacters = [];

    let selectedCompetitivePoolType = "banned";

    refreshCompetitivePoolButton.addEventListener("click", loadCurrentCompetitivePool);

    competitivePoolTypeTabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            selectedCompetitivePoolType = button.dataset.poolType;
            updateCompetitivePoolTypeTabs();
            renderCompetitivePoolCharacters();
        });
        button.addEventListener("keydown", (event) => {
            const index = competitivePoolTypeTabButtons.indexOf(button);
            let nextIndex = null;
            if (event.key === "ArrowRight") nextIndex = (index + 1) % competitivePoolTypeTabButtons.length;
            if (event.key === "ArrowLeft") nextIndex = (index - 1 + competitivePoolTypeTabButtons.length) % competitivePoolTypeTabButtons.length;
            if (event.key === "Home") nextIndex = 0;
            if (event.key === "End") nextIndex = competitivePoolTypeTabButtons.length - 1;
            if (nextIndex === null) return;
            event.preventDefault();
            competitivePoolTypeTabButtons[nextIndex].focus();
            competitivePoolTypeTabButtons[nextIndex].click();
        });
    });

    async function loadCurrentCompetitivePool() {
        const requestId = ++competitivePoolRequestId;
        competitivePoolMessage.textContent = "正在載入競技池資料…";
        competitivePoolPeriod.textContent = "";
        competitivePoolTypeTabs.hidden = true;
        competitivePoolGroups.hidden = true;
        competitivePoolGroups.replaceChildren();
        refreshCompetitivePoolButton.disabled = true;

        try {
            const pool = await getCurrentCompetitivePool();
            if (requestId !== competitivePoolRequestId) return;
            if (!pool) {
                currentCompetitivePoolCharacters = [];
                competitivePoolMessage.textContent = "目前沒有進行中的競技池。";
                return;
            }

            competitivePoolPeriod.textContent = `${formatCompetitivePoolDate(pool.start_at)} 至 ${formatCompetitivePoolDate(pool.end_at)}`;
            currentCompetitivePoolCharacters = pool.competitive_pool_characters || [];
            const availableTypes = new Set(currentCompetitivePoolCharacters.map((character) => character.pool_type));
            if (!availableTypes.has(selectedCompetitivePoolType)) {
                selectedCompetitivePoolType = ["banned", "restricted", "semi_restricted"]
                    .find((type) => availableTypes.has(type)) || "banned";
            }
            competitivePoolTypeTabs.hidden = false;
            updateCompetitivePoolTypeTabs();
            renderCompetitivePoolCharacters();
            competitivePoolMessage.textContent = pool.name;
            competitivePoolGroups.hidden = false;
            competitivePoolGroups.setAttribute("aria-labelledby", competitivePoolTypeTabButtons
                .find((button) => button.dataset.poolType === selectedCompetitivePoolType)?.id || "");
        } catch (error) {
            if (requestId !== competitivePoolRequestId) return;
            console.error("Load competitive pool error:", error);
            competitivePoolMessage.textContent = "競技池資料載入失敗，請稍後重新整理。";
        } finally {
            if (requestId === competitivePoolRequestId) refreshCompetitivePoolButton.disabled = false;
        }
    }

    function updateCompetitivePoolTypeTabs() {
        const counts = currentCompetitivePoolCharacters.reduce((result, character) => {
            result[character.pool_type] = (result[character.pool_type] || 0) + 1;
            return result;
        }, {});

        competitivePoolTypeTabButtons.forEach((button) => {
            const isSelected = button.dataset.poolType === selectedCompetitivePoolType;
            button.classList.toggle("is-active", isSelected);
            button.setAttribute("aria-selected", String(isSelected));
            button.tabIndex = isSelected ? 0 : -1;
            button.querySelector("[data-pool-type-count]").textContent = String(counts[button.dataset.poolType] || 0);
        });
        const selectedTab = competitivePoolTypeTabButtons.find((button) => button.dataset.poolType === selectedCompetitivePoolType);
        if (selectedTab) competitivePoolGroups.setAttribute("aria-labelledby", selectedTab.id);
    }

    function renderCompetitivePoolCharacters() {
        const types = {
            banned: { marker: "⊘", className: "is-banned", title: "禁止池：禁止攜帶" },
            restricted: { marker: "2", className: "is-restricted", title: "限制池：最多攜帶 2 隻" },
            semi_restricted: { marker: "3", className: "is-semi-restricted", title: "準限制池：最多攜帶 3 隻" }
        };
        const type = types[selectedCompetitivePoolType];
        const characters = currentCompetitivePoolCharacters.filter((character) => character.pool_type === selectedCompetitivePoolType);
        clearObservedTypeIcons(competitivePoolGroups);
        competitivePoolGroups.replaceChildren();
        competitivePoolGroups.setAttribute("aria-label", type.title);

        if (characters.length === 0) {
            const empty = document.createElement("p");
            empty.className = "competitive-pool-empty";
            empty.textContent = "此池目前沒有精靈";
            competitivePoolGroups.append(empty);
            return;
        }

        characters.forEach((character) => {
            const item = document.createElement("button");
            const avatar = document.createElement("img");
            const typeIcon = createCharacterTypeIcon(character.seer_pet_id);
            const marker = document.createElement("span");
            const petId = document.createElement("span");
            const petName = document.createElement("strong");

            item.className = `character-card public-character-card competitive-pool-pet ${type.className}`;
            item.type = "button";
            item.setAttribute("aria-label", `查看${character.pet_name}精靈資訊`);
            avatar.className = "character-portrait";
            avatar.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(character.seer_pet_id)}.png`;
            avatar.alt = `${character.pet_name} 精靈頭像`;
            avatar.loading = "lazy";
            avatar.addEventListener("error", () => { avatar.classList.add("is-unavailable"); }, { once: true });
            marker.className = `character-check competitive-pool-limit-indicator ${type.className}`;
            marker.textContent = type.marker;
            marker.title = type.title;
            marker.setAttribute("aria-label", type.title);
            marker.setAttribute("role", "img");
            petId.className = "character-id";
            petId.textContent = `#${character.seer_pet_id}`;
            petName.className = "character-name";
            petName.textContent = character.pet_name;
            petName.title = character.pet_name;
            item.append(avatar, typeIcon, marker, petId, petName);
            item.addEventListener("click", () => seerLookup.openPetInfo(character.seer_pet_id));
            competitivePoolGroups.append(item);
        });
    }

    function formatCompetitivePoolDate(value) {
        return new Date(value).toLocaleString("zh-TW", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Taipei"
        });
    }
    return { loadCurrentCompetitivePool, updateCompetitivePoolTypeTabs, renderCompetitivePoolCharacters, formatCompetitivePoolDate };
}
