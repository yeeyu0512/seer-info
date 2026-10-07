export function createCompetitivePreview({
    competitivePoolNameInput,
    toIsoDate,
    requestCharacterTypeIcon,
    getPreviewCharacters
}) {
    const previewCompetitivePoolButton = document.getElementById("preview-competitive-pool-button");
    const competitivePoolPreviewModal = document.getElementById("competitive-pool-preview-modal");
    const competitivePoolPreviewTitle = document.getElementById("competitive-pool-preview-title");
    const competitivePoolPreviewPeriod = document.getElementById("competitive-pool-preview-period");
    const closeCompetitivePoolPreviewButton = document.getElementById("close-competitive-pool-preview-button");
    const competitivePoolPreviewTabs = Array.from(document.querySelectorAll("[data-preview-pool-type]"));
    const competitivePoolPreviewList = document.getElementById("competitive-pool-preview-list");

    let selectedCompetitivePoolPreviewType = "banned";

    let competitivePoolPreviewReturnFocus = null;

    previewCompetitivePoolButton.addEventListener("click", openCompetitivePoolPreview);

    closeCompetitivePoolPreviewButton.addEventListener("click", closeCompetitivePoolPreview);

    competitivePoolPreviewModal.addEventListener("click", (event) => {
        if (event.target === competitivePoolPreviewModal) closeCompetitivePoolPreview();
    });

    competitivePoolPreviewModal.addEventListener("keydown", handleCompetitivePoolPreviewKeydown);

    competitivePoolPreviewTabs.forEach((tab) => {
        tab.addEventListener("click", () => selectCompetitivePoolPreviewType(tab.dataset.previewPoolType));
        tab.addEventListener("keydown", handleCompetitivePoolPreviewTabKeydown);
    });

    function openCompetitivePoolPreview() {
        const poolName = competitivePoolNameInput.value.trim() || "未命名競技池";
        competitivePoolPreviewTitle.textContent = `${poolName}｜首頁預覽`;
        const startAt = toIsoDate("competitive-pool-start");
        const endAt = toIsoDate("competitive-pool-end");
        competitivePoolPreviewPeriod.textContent = `${formatCompetitivePoolPreviewDate(startAt)} 至 ${formatCompetitivePoolPreviewDate(endAt)}`;

        const counts = getPreviewCharacters().reduce((result, character) => {
            result[character.pool_type] = (result[character.pool_type] || 0) + 1;
            return result;
        }, {});
        competitivePoolPreviewTabs.forEach((tab) => {
            tab.querySelector("[data-preview-pool-count]").textContent = String(counts[tab.dataset.previewPoolType] || 0);
        });
        selectedCompetitivePoolPreviewType = ["banned", "restricted", "semi_restricted"]
            .find((type) => counts[type] > 0) || "banned";
        selectCompetitivePoolPreviewType(selectedCompetitivePoolPreviewType);

        competitivePoolPreviewReturnFocus = document.activeElement;
        competitivePoolPreviewModal.hidden = false;
        document.body.classList.add("has-competitive-pool-preview");
        closeCompetitivePoolPreviewButton.focus();
    }

    function closeCompetitivePoolPreview() {
        if (competitivePoolPreviewModal.hidden) return;
        competitivePoolPreviewModal.hidden = true;
        document.body.classList.remove("has-competitive-pool-preview");
        if (competitivePoolPreviewReturnFocus instanceof HTMLElement && competitivePoolPreviewReturnFocus.isConnected) {
            competitivePoolPreviewReturnFocus.focus();
        }
    }

    function selectCompetitivePoolPreviewType(poolType) {
        const types = {
            banned: { marker: "⊘", className: "is-banned", title: "禁止池：禁止攜帶" },
            restricted: { marker: "2", className: "is-restricted", title: "限制池：最多攜帶 2 隻" },
            semi_restricted: { marker: "3", className: "is-semi-restricted", title: "準限制池：最多攜帶 3 隻" }
        };
        if (!Object.prototype.hasOwnProperty.call(types, poolType)) return;
        selectedCompetitivePoolPreviewType = poolType;
        competitivePoolPreviewTabs.forEach((tab) => {
            const selected = tab.dataset.previewPoolType === poolType;
            tab.classList.toggle("is-active", selected);
            tab.setAttribute("aria-selected", String(selected));
            tab.tabIndex = selected ? 0 : -1;
        });

        const type = types[poolType];
        const entries = getPreviewCharacters().filter((character) => character.pool_type === poolType);
        competitivePoolPreviewList.replaceChildren();
        competitivePoolPreviewList.setAttribute("aria-labelledby", `competitive-pool-preview-tab-${poolType.replace("_", "-")}`);
        if (entries.length === 0) {
            const empty = document.createElement("p");
            empty.className = "competitive-pool-empty";
            empty.textContent = "此池目前沒有精靈";
            competitivePoolPreviewList.append(empty);
            return;
        }

        entries.forEach((character) => {
            const item = document.createElement("article");
            const avatar = document.createElement("img");
            const typeIcon = document.createElement("img");
            const marker = document.createElement("span");
            const petId = document.createElement("span");
            const petName = document.createElement("strong");
            const characterId = String(character.seer_pet_id);

            item.className = `character-card public-character-card competitive-pool-pet ${type.className}`;
            avatar.className = "character-portrait";
            avatar.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(characterId)}.png`;
            avatar.alt = `${character.pet_name} 精靈頭像`;
            avatar.loading = "lazy";
            avatar.addEventListener("error", () => avatar.classList.add("is-unavailable"), { once: true });
            typeIcon.className = "admin-character-type-icon character-type-icon";
            typeIcon.alt = "";
            typeIcon.setAttribute("aria-hidden", "true");
            typeIcon.dataset.characterId = characterId;
            typeIcon.dataset.visible = "true";
            typeIcon.hidden = true;
            requestCharacterTypeIcon(Number(characterId), typeIcon);
            marker.className = `character-check competitive-pool-limit-indicator ${type.className}`;
            marker.textContent = type.marker;
            marker.title = type.title;
            marker.setAttribute("aria-label", type.title);
            marker.setAttribute("role", "img");
            petId.className = "character-id";
            petId.textContent = `#${characterId}`;
            petName.className = "character-name";
            petName.textContent = character.pet_name;
            petName.title = character.pet_name;
            item.append(avatar, typeIcon, marker, petId, petName);
            competitivePoolPreviewList.append(item);
        });
    }

    function handleCompetitivePoolPreviewKeydown(event) {
        if (event.key === "Escape") {
            event.preventDefault();
            closeCompetitivePoolPreview();
            return;
        }
        if (event.key !== "Tab") return;
        const focusable = Array.from(competitivePoolPreviewModal.querySelectorAll("button:not([disabled]):not([tabindex='-1'])"));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function handleCompetitivePoolPreviewTabKeydown(event) {
        const currentIndex = competitivePoolPreviewTabs.indexOf(event.currentTarget);
        let nextIndex = null;
        if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % competitivePoolPreviewTabs.length;
        if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + competitivePoolPreviewTabs.length) % competitivePoolPreviewTabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = competitivePoolPreviewTabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        competitivePoolPreviewTabs[nextIndex].focus();
        selectCompetitivePoolPreviewType(competitivePoolPreviewTabs[nextIndex].dataset.previewPoolType);
    }

    function formatCompetitivePoolPreviewDate(value) {
        return value
            ? new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei" })
            : "未設定";
    }
    return { openCompetitivePoolPreview, closeCompetitivePoolPreview, selectCompetitivePoolPreviewType, handleCompetitivePoolPreviewKeydown, handleCompetitivePoolPreviewTabKeydown, formatCompetitivePoolPreviewDate };
}
