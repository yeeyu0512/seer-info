export function createLookupDialogs({
    seerRelatedSkinsModal,
    updateSeerModalScrollLock,
    getTaiwanProgressSettings,
    fetchSeerSkinCatalog,
    matchesTaiwanSkinProgress,
    loadSeerSkinEntry,
    getSeerSkinImageResourceId,
    convertToTraditionalChinese,
    findSeerPetForSkinThumbnailFallback,
    skinCategoryIconUrl,
    openSeerSkinInSearch,
    seerPetInfoModal,
    loadSeerPetInfo,
    seerExternalLinkModal,
    seerPetInfoRetry,
    getCurrentPetId,
    getCurrentPetData,
    getCurrentInfoUrl,
    getTaiwanOnlyEnabled
}) {
    const seerPetInfoClose = document.getElementById("seer-pet-info-close");
    const seerRelatedSkinsClose = document.getElementById("seer-related-skins-close");
    const seerRelatedSkinsMessage = document.getElementById("seer-related-skins-message");
    const seerRelatedSkinsResults = document.getElementById("seer-related-skins-results");
    const seerExternalLinkCancel = document.getElementById("seer-external-link-cancel");
    const seerExternalLinkOpen = document.getElementById("seer-external-link-open");

    let seerPetInfoOpener = null;

    let seerPetInfoPointerStartedOnBackdrop = false;

    let seerRelatedSkinsRequestId = 0;

    let seerRelatedSkinsOpener = null;

    let seerRelatedSkinsPointerStartedOnBackdrop = false;

    let externalLinkOpener = null;

    let externalLinkPointerStartedOnBackdrop = false;

    function openSeerRelatedSkinsModal() {
            if (!getCurrentPetId()) return;
            seerRelatedSkinsOpener = document.activeElement;
            const requestId = ++seerRelatedSkinsRequestId;
            seerRelatedSkinsModal.classList.remove("is-closing");
            seerRelatedSkinsModal.hidden = false;
            seerRelatedSkinsResults.replaceChildren();
            seerRelatedSkinsMessage.textContent = "正在載入關聯皮膚…";
            updateSeerModalScrollLock();
            seerRelatedSkinsClose.focus();
            void loadSeerRelatedSkins(getCurrentPetId(), requestId);
        }

    async function loadSeerRelatedSkins(petId, requestId) {
            try {
                const settings = await getTaiwanProgressSettings();
                if (requestId !== seerRelatedSkinsRequestId || seerRelatedSkinsModal.hidden) return;
                const skins = await fetchSeerSkinCatalog();
                if (requestId !== seerRelatedSkinsRequestId || seerRelatedSkinsModal.hidden) return;
                const matchingSkins = skins
                    .filter((skin) =>
                        String(skin && skin.pet && skin.pet.id) === String(petId)
                        && matchesTaiwanSkinProgress(skin, getCurrentPetData(), settings)
                    )
                    .sort((first, second) => Number(second.id) - Number(first.id));
                if (!matchingSkins.length) {
                    seerRelatedSkinsMessage.textContent = getTaiwanOnlyEnabled()
                        ? "找不到符合台服目前進度的關聯皮膚。"
                        : "找不到這隻精靈的關聯皮膚。";
                    return;
                }
                const entries = await Promise.all(matchingSkins.map((skin) => loadSeerSkinEntry(skin)));
                if (requestId !== seerRelatedSkinsRequestId || seerRelatedSkinsModal.hidden) return;
                renderSeerRelatedSkins(entries, requestId);
                seerRelatedSkinsMessage.textContent = `找到 ${entries.length} 款關聯皮膚，點選即可前往查看。`;
            } catch (error) {
                if (requestId !== seerRelatedSkinsRequestId || seerRelatedSkinsModal.hidden) return;
                console.error(`Load related Seer skins for pet ${petId} error:`, error);
                seerRelatedSkinsMessage.textContent = `關聯皮膚載入失敗：${error.message}`;
            }
        }

    function renderSeerRelatedSkins(entries, requestId) {
            seerRelatedSkinsResults.replaceChildren();
            entries.forEach(({ skin, pet }) => {
                const button = document.createElement("button");
                button.className = "seer-related-skin-item";
                button.type = "button";
                const thumbnail = document.createElement("img");
                thumbnail.className = "seer-related-skin-thumbnail";
                thumbnail.src =
                    `https://newseer.61.com/web/monster/head/${encodeURIComponent(getSeerSkinImageResourceId(skin))}.png`;
                thumbnail.alt = `${convertToTraditionalChinese(skin.name || "皮膚")}縮圖`;
                thumbnail.loading = "lazy";
                thumbnail.addEventListener("error", async () => {
                    if (thumbnail.dataset.fallbackAttempted === "true") {
                        thumbnail.hidden = true;
                        return;
                    }
                    thumbnail.dataset.fallbackAttempted = "true";
                    try {
                        const fallbackPet = await findSeerPetForSkinThumbnailFallback(skin, pet);
                        if (!thumbnail.isConnected || requestId !== seerRelatedSkinsRequestId) return;
                        if (!fallbackPet) {
                            thumbnail.hidden = true;
                            return;
                        }
                        thumbnail.src =
                            `https://newseer.61.com/web/monster/head/${encodeURIComponent(fallbackPet.id)}.png`;
                        thumbnail.alt = `${convertToTraditionalChinese(fallbackPet.name || "精靈")}頭像`;
                    } catch (error) {
                        console.error(`Load fallback thumbnail for related Seer skin ${skin.id} error:`, error);
                        thumbnail.hidden = true;
                    }
                });
                const categoryId = Number(skin && skin.category && skin.category.id);
                const categoryIcon = document.createElement("img");
                categoryIcon.className = "seer-related-skin-category-icon";
                categoryIcon.alt = "";
                categoryIcon.setAttribute("aria-hidden", "true");
                categoryIcon.loading = "lazy";
                if (Number.isSafeInteger(categoryId) && categoryId >= 0) {
                    categoryIcon.src =
                        skinCategoryIconUrl(categoryId);
                    categoryIcon.addEventListener("error", () => categoryIcon.remove(), { once: true });
                } else {
                    categoryIcon.remove();
                }
                const details = document.createElement("span");
                details.className = "seer-related-skin-details";
                const name = document.createElement("strong");
                name.className = "seer-related-skin-name";
                name.textContent = convertToTraditionalChinese(skin.name || "未命名皮膚");
                details.append(name);
                const id = document.createElement("span");
                id.className = "seer-related-skin-id";
                id.textContent = `#${skin.id}`;
                button.append(thumbnail, categoryIcon, details, id);
                button.addEventListener("click", () => openSeerSkinInSearch(skin.id));
                seerRelatedSkinsResults.append(button);
            });
        }

    function openSeerPetInfoModal(opener = document.activeElement) {
            if (!getCurrentPetData() || !getCurrentPetId() || !seerPetInfoModal.hidden) return;
            seerPetInfoOpener = opener;
            seerPetInfoModal.classList.remove("is-closing");
            seerPetInfoModal.hidden = false;
            updateSeerModalScrollLock();
            seerPetInfoClose.focus();
            void loadSeerPetInfo(getCurrentPetData());
        }

    function closeSeerPetInfoModal(restoreFocus = true) {
            if (seerPetInfoModal.hidden || seerPetInfoModal.classList.contains("is-closing")) return;
            seerPetInfoModal.classList.add("is-closing");
            window.setTimeout(() => {
                if (!seerPetInfoModal.classList.contains("is-closing")) return;
                seerPetInfoModal.hidden = true;
                seerPetInfoModal.classList.remove("is-closing");
                updateSeerModalScrollLock();
                if (restoreFocus && seerPetInfoOpener && seerPetInfoOpener.isConnected && !seerPetInfoOpener.hidden) {
                    seerPetInfoOpener.focus();
                }
                seerPetInfoOpener = null;
            }, 180);
        }

    function closeSeerRelatedSkinsModal(restoreFocus = true) {
            if (seerRelatedSkinsModal.hidden || seerRelatedSkinsModal.classList.contains("is-closing")) return;
            seerRelatedSkinsRequestId += 1;
            seerRelatedSkinsModal.classList.add("is-closing");
            window.setTimeout(() => {
                if (!seerRelatedSkinsModal.classList.contains("is-closing")) return;
                seerRelatedSkinsModal.hidden = true;
                seerRelatedSkinsModal.classList.remove("is-closing");
                updateSeerModalScrollLock();
                if (restoreFocus && seerRelatedSkinsOpener && seerRelatedSkinsOpener.isConnected) {
                    seerRelatedSkinsOpener.focus();
                }
                seerRelatedSkinsOpener = null;
            }, 180);
        }

    function openSeerExternalLinkModal(url = getCurrentInfoUrl()) {
            if (!url) return;
            externalLinkOpener = document.activeElement;
            seerExternalLinkOpen.href = url;
            seerExternalLinkModal.classList.remove("is-closing");
            seerExternalLinkModal.hidden = false;
            updateSeerModalScrollLock();
            seerExternalLinkCancel.focus();
        }

    function closeSeerExternalLinkModal() {
            if (seerExternalLinkModal.hidden || seerExternalLinkModal.classList.contains("is-closing")) return;
            seerExternalLinkModal.classList.add("is-closing");
            window.setTimeout(() => {
                seerExternalLinkModal.hidden = true;
                seerExternalLinkModal.classList.remove("is-closing");
                updateSeerModalScrollLock();
                if (externalLinkOpener && typeof externalLinkOpener.focus === "function") {
                    externalLinkOpener.focus();
                }
                externalLinkOpener = null;
            }, 180);
        }

    seerRelatedSkinsClose.addEventListener("click", closeSeerRelatedSkinsModal);

    seerPetInfoClose.addEventListener("click", closeSeerPetInfoModal);

    seerPetInfoRetry.addEventListener("click", () => {
                if (getCurrentPetData()) void loadSeerPetInfo(getCurrentPetData());
            });

    seerPetInfoModal.addEventListener("pointerdown", (event) => {
                seerPetInfoPointerStartedOnBackdrop = event.target === seerPetInfoModal;
            });

    seerPetInfoModal.addEventListener("click", (event) => {
                if (seerPetInfoPointerStartedOnBackdrop && event.target === seerPetInfoModal) {
                    closeSeerPetInfoModal();
                }
                seerPetInfoPointerStartedOnBackdrop = false;
            });

    seerPetInfoModal.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeSeerPetInfoModal();
                    return;
                }
                if (event.key !== "Tab") return;
                const focusable = seerPetInfoModal.querySelectorAll("button:not([disabled]):not([hidden])");
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            });

    seerRelatedSkinsModal.addEventListener("pointerdown", (event) => {
                seerRelatedSkinsPointerStartedOnBackdrop = event.target === seerRelatedSkinsModal;
            });

    seerRelatedSkinsModal.addEventListener("click", (event) => {
                if (seerRelatedSkinsPointerStartedOnBackdrop && event.target === seerRelatedSkinsModal) {
                    closeSeerRelatedSkinsModal();
                }
                seerRelatedSkinsPointerStartedOnBackdrop = false;
            });

    seerRelatedSkinsModal.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeSeerRelatedSkinsModal();
                    return;
                }
                if (event.key !== "Tab") return;
                const focusable = seerRelatedSkinsModal.querySelectorAll("button:not([disabled]):not([hidden])");
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            });

    seerExternalLinkCancel.addEventListener("click", closeSeerExternalLinkModal);

    seerExternalLinkOpen.addEventListener("click", closeSeerExternalLinkModal);

    seerExternalLinkModal.addEventListener("pointerdown", (event) => {
                externalLinkPointerStartedOnBackdrop = event.target === seerExternalLinkModal;
            });

    seerExternalLinkModal.addEventListener("click", (event) => {
                if (externalLinkPointerStartedOnBackdrop && event.target === seerExternalLinkModal) {
                    closeSeerExternalLinkModal();
                }
                externalLinkPointerStartedOnBackdrop = false;
            });

    seerExternalLinkModal.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    closeSeerExternalLinkModal();
                    return;
                }
                if (event.key !== "Tab") return;
                const focusable = seerExternalLinkModal.querySelectorAll("button:not([disabled]), a[href]");
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            });
    return { openSeerRelatedSkinsModal, loadSeerRelatedSkins, renderSeerRelatedSkins, openSeerPetInfoModal, closeSeerPetInfoModal, closeSeerRelatedSkinsModal, openSeerExternalLinkModal, closeSeerExternalLinkModal };
}
