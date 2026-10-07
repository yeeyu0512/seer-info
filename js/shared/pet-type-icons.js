
export function createPetTypeIcons({ fetchSeerJson }) {
    const characterTypeIconCache = new Map();

    const elementTypeIconCache = new Map();

    const characterTypeIconQueue = [];

    const observedTypeIconElements = new Set();

    let activeTypeIconRequests = 0;

    const TYPE_ICON_REQUEST_LIMIT = 4;

    const typeIconObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const icon = entry.target;
            icon.dataset.visible = String(entry.isIntersecting);
            if (entry.isIntersecting) {
                loadCharacterTypeIcon(icon.dataset.characterId, icon);
            }
        });
    });

    function createCharacterTypeIcon(characterId) {
        const icon = document.createElement("img");
        icon.className = "character-type-icon";
        icon.alt = "";
        icon.setAttribute("aria-hidden", "true");
        icon.title = "精靈屬性";
        icon.dataset.characterId = String(characterId);
        icon.addEventListener("error", () => { icon.hidden = true; }, { once: true });
        observedTypeIconElements.add(icon);
        typeIconObserver.observe(icon);
        return icon;
    }

    function clearObservedTypeIcons(container = document) {
        Array.from(observedTypeIconElements)
            .filter((icon) => container.contains(icon))
            .forEach((icon) => {
                icon.dataset.visible = "false";
                typeIconObserver.unobserve(icon);
                observedTypeIconElements.delete(icon);
            });
    }

    function loadCharacterTypeIcon(characterId, icon) {
        const cacheKey = String(characterId);
        let iconPromise = characterTypeIconCache.get(cacheKey);
        if (!iconPromise) {
            iconPromise = new Promise((resolve) => {
                characterTypeIconQueue.push({ characterId: cacheKey, resolve });
            });
            characterTypeIconCache.set(cacheKey, iconPromise);
        }
        iconPromise.then((url) => {
            if (!url || !icon.isConnected) return;
            icon.src = url;
            icon.classList.add("is-loaded");
        });
        processCharacterTypeIconQueue();
    }

    function processCharacterTypeIconQueue() {
        while (activeTypeIconRequests < TYPE_ICON_REQUEST_LIMIT && characterTypeIconQueue.length > 0) {
            const job = characterTypeIconQueue.shift();
            const hasVisibleIcon = Array.from(observedTypeIconElements).some((icon) =>
                icon.dataset.characterId === job.characterId &&
                icon.dataset.visible === "true" &&
                icon.isConnected
            );
            if (!hasVisibleIcon) {
                characterTypeIconCache.delete(job.characterId);
                job.resolve(null);
                continue;
            }

            activeTypeIconRequests += 1;
            fetchCharacterTypeIconUrl(job.characterId)
                .catch((error) => {
                    console.warn(`Failed to load Seer type for pet ${job.characterId}:`, error);
                    return null;
                })
                .then((url) => {
                    job.resolve(url);
                })
                .finally(() => {
                    activeTypeIconRequests -= 1;
                    processCharacterTypeIconQueue();
                });
        }
    }

    async function fetchCharacterTypeIconUrl(characterId) {
        const pet = await fetchSeerJson(`https://api.seerapi.com/v1/pet/${encodeURIComponent(characterId)}`);
        const typeId = pet && pet.type && pet.type.id;
        if (!typeId) throw new Error("SeerAPI 回傳未包含 type.id。");

        const typeKey = String(typeId);
        let resolvedTypeIdPromise = elementTypeIconCache.get(typeKey);
        if (!resolvedTypeIdPromise) {
            resolvedTypeIdPromise = fetchSeerJson(
                `https://api.seerapi.com/v1/element_type_combination/${encodeURIComponent(typeKey)}`
            ).then((typeCombination) => {
                const resolvedId = Number(typeCombination && typeCombination.id ? typeCombination.id : typeId);
                if (!Number.isSafeInteger(resolvedId) || resolvedId <= 0) {
                    throw new Error("SeerAPI 回傳的屬性 ID 無效。");
                }
                return resolvedId;
            }).catch((error) => {
                elementTypeIconCache.delete(typeKey);
                throw error;
            });
            elementTypeIconCache.set(typeKey, resolvedTypeIdPromise);
        }
        const resolvedTypeId = await resolvedTypeIdPromise;
        if (!Number.isSafeInteger(resolvedTypeId) || resolvedTypeId <= 0) {
            throw new Error("SeerAPI 回傳的屬性 ID 無效。");
        }
        return `./seer_icons/${resolvedTypeId}.png`;
    }
    return { createCharacterTypeIcon, clearObservedTypeIcons, loadCharacterTypeIcon, processCharacterTypeIconQueue, fetchCharacterTypeIconUrl };
}
