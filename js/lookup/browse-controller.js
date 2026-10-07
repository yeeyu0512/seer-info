export function createLookupBrowseController({
    seerLookupResults,
    seerLookupIdInput,
    resetSeerPetInfo,
    seerLookupMessage,
    seerLookupPreview,
    getTaiwanProgressSettings,
    fetchSeerJson,
    getPetSearchMethod,
    fetchSeerElementTypeCombinations,
    convertToTraditionalChinese,
    renderSeerPetTypeOptions,
    fetchSeerPetCatalog,
    getPetTypeCategory,
    matchesTaiwanPetProgress,
    renderSeerPetSearchResults,
    matchesSelectedSkinCategory,
    loadSeerSkinEntry,
    matchesTaiwanSkinProgress,
    renderSeerSkinSearchResults,
    loadSeerPetSearchTypeDetails,
    getLookupRequestId,
    getLookupMode,
    getSkinSearchMode,
    getSelectedPetTypeId,
    getSelectedSkinCategoryId,
    getTaiwanOnlyEnabled
}) {

    let seerBrowseState = null;

    let seerBrowseSentinel = null;

    let seerPetTypeFilterState = null;

    const SEER_BROWSE_PAGE_SIZE = 20;

    const seerBrowseObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && seerBrowseState) {
                    void loadMoreSeerBrowseResults(seerBrowseState.requestId);
                }
            });
        }, { root: seerLookupResults, rootMargin: "100px" });

    async function startLatestSeerBrowse(requestId) {
            if (requestId !== getLookupRequestId() || seerLookupIdInput.value.trim()) return;
            resetSeerPetInfo();
            const isSkinResource = getLookupMode() === "skin" && ["skin", "category"].includes(getSkinSearchMode());
            const resource = isSkinResource ? "pet_skin" : "pet";
            if (getLookupMode() === "skin" && getSkinSearchMode() === "pet") {
                seerBrowseState = null;
                clearSeerBrowseSentinel();
                seerLookupMessage.textContent = "輸入精靈 ID 或名稱以查詢綁定皮膚。";
                seerLookupResults.replaceChildren();
                seerLookupResults.hidden = true;
                return;
            }

            seerBrowseState = {
                requestId,
                resource,
                nextOffset: 0,
                hasMore: false,
                loading: true,
                seenIds: new Set(),
                browseStartOffset: 0,
                taiwanSettings: null,
                categoryId: isSkinResource && getSkinSearchMode() === "category"
                    ? getSelectedSkinCategoryId()
                    : null
            };
            seerLookupPreview.hidden = true;
            seerLookupResults.replaceChildren();
            seerLookupResults.scrollTop = 0;
            seerLookupResults.hidden = false;
            seerLookupMessage.textContent = "正在載入最新編號資料…";
            try {
                const state = seerBrowseState;
                state.taiwanSettings = await getTaiwanProgressSettings();
                if (requestId !== getLookupRequestId()) return;
                const firstPage = await fetchSeerJson(
                    `https://api.seerapi.com/v1/${resource}?offset=0&limit=1&expand=true`
                );
                if (requestId !== getLookupRequestId() || !Array.isArray(firstPage.results)) return;
                const count = Number(firstPage.count);
                if (!Number.isSafeInteger(count) || count < 0) throw new Error("SeerAPI 回傳的資料筆數無效。");
                if (count === 0) {
                    seerBrowseState = null;
                    seerLookupResults.hidden = true;
                    seerLookupMessage.textContent = "目前沒有可顯示的資料。";
                    return;
                }
                const offset = Math.max(0, count - SEER_BROWSE_PAGE_SIZE);
                state.browseStartOffset = offset;
                await loadSeerBrowsePage(state, offset);
                if (requestId !== getLookupRequestId()) return;
                const loadedCount = state.seenIds.size;
                seerLookupMessage.textContent = `顯示最新 ${loadedCount} 筆${state.hasMore ? "；繼續向下捲動載入更早編號" : ""}。`;
            } catch (error) {
                if (requestId !== getLookupRequestId()) return;
                console.error("Load latest Seer browse results error:", error);
                seerBrowseState = null;
                seerLookupResults.hidden = true;
                seerLookupMessage.textContent = `載入最新資料失敗：${error.message}`;
            }
        }

    async function startSeerPetTypeFilter(requestId) {
            if (requestId !== getLookupRequestId() || getLookupMode() !== "pet" || getPetSearchMethod() !== "type") return;
            resetSeerPetInfo();
            seerBrowseState = null;
            clearSeerBrowseSentinel();
            seerLookupPreview.hidden = true;
            seerLookupResults.replaceChildren();
            seerLookupResults.scrollTop = 0;
            seerLookupResults.hidden = false;
            seerLookupMessage.textContent = "正在載入屬性資料…";
            const state = { requestId, pets: [], nextIndex: 0, loading: true, typeDetailsById: new Map() };
            seerPetTypeFilterState = state;

            try {
                const combinations = await fetchSeerElementTypeCombinations();
                if (requestId !== getLookupRequestId()) return;
                combinations.forEach((combination) => {
                    state.typeDetailsById.set(String(combination.id), {
                        id: combination.id,
                        name: convertToTraditionalChinese(combination.name)
                    });
                });
                renderSeerPetTypeOptions(combinations);

                const settings = await getTaiwanProgressSettings();
                if (requestId !== getLookupRequestId()) return;
                const catalog = await fetchSeerPetCatalog((loaded, total) => {
                    if (requestId === getLookupRequestId()) {
                        seerLookupMessage.textContent = `正在載入精靈資料… ${loaded}／${total}`;
                    }
                });
                if (requestId !== getLookupRequestId()) return;

                const matchingTypeIds = new Set(combinations
                    .filter((combination) => combination.isDouble === (getPetTypeCategory() === "double"))
                    .filter((combination) => getSelectedPetTypeId() === null || combination.id === getSelectedPetTypeId())
                    .map((combination) => String(combination.id)));
                state.pets = catalog.filter((pet) =>
                    pet.typeId !== null
                    && matchingTypeIds.has(String(pet.typeId))
                    && matchesTaiwanPetProgress(pet, settings)
                );
                state.loading = false;
                if (state.pets.length === 0) {
                    seerLookupResults.hidden = true;
                    seerLookupMessage.textContent = getTaiwanOnlyEnabled()
                        ? "目前篩選條件沒有符合台服進度的精靈。"
                        : "目前沒有符合篩選條件的精靈。";
                    return;
                }
                loadMoreSeerPetTypeFilterResults(state);
                const selectedType = getSelectedPetTypeId() === null
                    ? ""
                    : `「${state.typeDetailsById.get(String(getSelectedPetTypeId()))?.name || "所選屬性"}」`;
                seerLookupMessage.textContent = `找到 ${state.pets.length} 隻${selectedType}精靈，已顯示 ${Math.min(state.pets.length, SEER_BROWSE_PAGE_SIZE)} 隻。`;
            } catch (error) {
                if (requestId !== getLookupRequestId()) return;
                console.error("Load Seer pets by type error:", error);
                seerPetTypeFilterState = null;
                seerLookupResults.hidden = true;
                seerLookupMessage.textContent = `載入屬性篩選失敗：${error.message}`;
            }
        }

    function loadMoreSeerPetTypeFilterResults(state) {
            if (
                state !== seerPetTypeFilterState
                || state.requestId !== getLookupRequestId()
                || state.loading
                || state.nextIndex >= state.pets.length
            ) return;
            const nextPets = state.pets.slice(state.nextIndex, state.nextIndex + SEER_BROWSE_PAGE_SIZE);
            state.nextIndex += nextPets.length;
            renderSeerPetSearchResults(nextPets, state.typeDetailsById, state.nextIndex > nextPets.length);
            clearSeerBrowseSentinel();
            if (state.nextIndex < state.pets.length) {
                const sentinel = document.createElement("button");
                sentinel.type = "button";
                sentinel.className = "seer-lookup-browse-sentinel";
                sentinel.textContent = `點擊載入更多精靈（${state.nextIndex}／${state.pets.length}）`;
                sentinel.addEventListener("click", () => loadMoreSeerPetTypeFilterResults(state));
                seerBrowseSentinel = sentinel;
                seerLookupResults.append(sentinel);
            }
        }

    async function loadMoreSeerBrowseResults(requestId) {
            const state = seerBrowseState;
            if (!state || state.requestId !== requestId || state.loading || !state.hasMore) return;
            state.loading = true;
            const offset = state.nextOffset;
            updateSeerBrowseLoadingProgress(state, offset);
            try {
                await loadSeerBrowsePage(state, offset);
                if (seerBrowseState !== state || requestId !== getLookupRequestId()) return;
                seerLookupMessage.textContent = `已載入 ${state.seenIds.size} 筆${state.hasMore ? "；繼續向下捲動載入更早編號" : "，已到最早編號"}。`;
            } catch (error) {
                if (seerBrowseState !== state || requestId !== getLookupRequestId()) return;
                console.error("Load more Seer browse results error:", error);
                if (seerBrowseSentinel) {
                    seerBrowseSentinel.textContent = "載入失敗，點此重試";
                    seerBrowseSentinel.disabled = false;
                }
                seerLookupMessage.textContent = `載入更多資料失敗：${error.message}`;
            } finally {
                if (seerBrowseState === state) {
                    state.loading = false;
                    updateSeerBrowseSentinel(state);
                }
            }
        }

    function updateSeerBrowseLoadingProgress(state, offset) {
            if (!seerBrowseSentinel) return;
            const progress = state.browseStartOffset > 0
                ? Math.min(100, Math.max(1, Math.ceil(
                    ((state.browseStartOffset - offset) / state.browseStartOffset) * 100
                )))
                : 100;
            const label = document.createElement("span");
            label.textContent = "正在載入更早編號";
            const progressBar = document.createElement("progress");
            progressBar.className = "seer-lookup-browse-progress";
            progressBar.max = 100;
            progressBar.value = progress;
            progressBar.setAttribute("aria-label", "已搜尋較早編號範圍");
            progressBar.setAttribute("aria-valuetext", `${progress}%`);
            const percentage = document.createElement("span");
            percentage.className = "seer-lookup-browse-progress-value";
            percentage.textContent = `${progress}%`;
            seerBrowseSentinel.classList.add("is-loading");
            seerBrowseSentinel.replaceChildren(label, progressBar, percentage);
            seerBrowseSentinel.disabled = true;
        }

    async function loadSeerBrowsePage(state, offset) {
            const page = await fetchSeerJson(
                `https://api.seerapi.com/v1/${state.resource}?offset=${offset}&limit=${SEER_BROWSE_PAGE_SIZE}&expand=true`
            );
            if (state.requestId !== getLookupRequestId()) return;
            if (!Array.isArray(page.results)) throw new Error("SeerAPI 回傳的分頁資料格式無效。");

            let orderedResults = page.results.slice().sort((first, second) => Number(second.id) - Number(first.id));
            if (state.resource === "pet_skin") {
                const matchingSkins = orderedResults.filter((skin) => matchesSelectedSkinCategory(skin, state.categoryId));
                const pending = matchingSkins.slice();
                const entries = [];
                const workers = Array.from({ length: Math.min(4, pending.length) }, async () => {
                    while (pending.length > 0) {
                        const skin = pending.shift();
                        entries.push(await loadSeerSkinEntry(skin));
                    }
                });
                await Promise.all(workers);
                if (state.requestId !== getLookupRequestId()) return;
                const uniqueEntries = entries
                    .filter(({ skin, pet }) =>
                        !state.seenIds.has(String(skin.id))
                        && matchesTaiwanSkinProgress(skin, pet, state.taiwanSettings)
                    )
                    .sort((first, second) => Number(second.skin.id) - Number(first.skin.id));
                uniqueEntries.forEach(({ skin }) => state.seenIds.add(String(skin.id)));
                renderSeerSkinSearchResults(uniqueEntries, true);
            } else {
                orderedResults = orderedResults.filter((pet) =>
                    !state.seenIds.has(String(pet.id))
                    && matchesTaiwanPetProgress(pet, state.taiwanSettings)
                );
                orderedResults.forEach((pet) => state.seenIds.add(String(pet.id)));
                const typeDetailsById = await loadSeerPetSearchTypeDetails(orderedResults);
                if (state.requestId !== getLookupRequestId()) return;
                renderSeerPetSearchResults(orderedResults, typeDetailsById, true);
            }

            state.nextOffset = Math.max(0, offset - SEER_BROWSE_PAGE_SIZE);
            state.hasMore = offset > 0 && page.results.length > 0;
            state.loading = false;
            updateSeerBrowseSentinel(state);
        }

    function updateSeerBrowseSentinel(state) {
            clearSeerBrowseSentinel();
            if (!state.hasMore || state.requestId !== getLookupRequestId()) return;
            const sentinel = document.createElement("button");
            sentinel.type = "button";
            sentinel.className = "seer-lookup-browse-sentinel";
            sentinel.textContent = state.loading ? "正在載入更早編號…" : "向下捲動或點此載入更早編號";
            sentinel.disabled = state.loading;
            sentinel.classList.toggle("is-loading", state.loading);
            sentinel.addEventListener("click", () => void loadMoreSeerBrowseResults(state.requestId));
            seerBrowseSentinel = sentinel;
            seerLookupResults.append(sentinel);
            seerBrowseObserver.observe(sentinel);
        }

    function clearSeerBrowseSentinel() {
            if (!seerBrowseSentinel) return;
            seerBrowseObserver.unobserve(seerBrowseSentinel);
            seerBrowseSentinel.remove();
            seerBrowseSentinel = null;
        }
    return { startLatestSeerBrowse, startSeerPetTypeFilter, loadMoreSeerPetTypeFilterResults, loadMoreSeerBrowseResults, updateSeerBrowseLoadingProgress, loadSeerBrowsePage, updateSeerBrowseSentinel, clearSeerBrowseSentinel, getBrowseState: () => seerBrowseState, resetBrowseState: () => { seerBrowseState = null; seerPetTypeFilterState = null; } };
}
