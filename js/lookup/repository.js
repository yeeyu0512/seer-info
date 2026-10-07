const sharedRepositories = new WeakMap();
export function getSharedLookupRepository(dependencies) {
    const key = dependencies.fetchSeerJson;
    if (!sharedRepositories.has(key)) sharedRepositories.set(key,createLookupRepository(dependencies));
    return sharedRepositories.get(key);
}

// Data caches belong to this instance; no UI or DOM dependency.
export function createLookupRepository({ fetchSeerJson, convertToTraditionalChinese, convertToSimplifiedChinese }) {
    const elementTypeDetailsCache = new Map();
    const seerPetDetailsCache = new Map();
    const seerPetInfoCache = new Map();
    const seerSkillDetailsCache = new Map();
    const seerSkillActivationItemCache = new Map();
    const seerSoulmarkDetailsCache = new Map();
    const seerPetAdvanceCache = new Map();
    let seerSkinCatalogPromise = null;
    let seerPetCatalogPromise = null;
    let seerElementTypeCombinationsPromise = null;
    let seerElementTypeCombinations = [];
    const relatedCaches = { skill: seerSkillDetailsCache, skill_activation_item: seerSkillActivationItemCache, soulmark: seerSoulmarkDetailsCache, pet_advance: seerPetAdvanceCache };

    function fetchSeerElementTypeCombinations() {
        if (!seerElementTypeCombinationsPromise) {
            seerElementTypeCombinationsPromise = fetchSeerJson(
                "https://api.seerapi.com/v1/element_type_combination?offset=0&limit=200&expand=true"
            ).then((page) => {
                if (!Array.isArray(page.results)) throw new Error("SeerAPI 回傳的屬性清單格式無效。");
                const combinations = page.results.map((item) => {
                    const id = Number(item && item.id);
                    const name = String(item && item.name || "").trim();
                    if (
                        !Number.isSafeInteger(id) || id <= 0
                        || !name
                        || typeof (item && item.is_double) !== "boolean"
                    ) {
                        throw new Error("SeerAPI 回傳了不完整的屬性資料。");
                    }
                    return { id, name, isDouble: item.is_double };
                });
                const count = Number(page.count);
                if (!Number.isSafeInteger(count) || count !== combinations.length) {
                    throw new Error("SeerAPI 回傳的屬性清單筆數不完整。");
                }
                if (combinations.length === 0) throw new Error("SeerAPI 沒有提供可用的屬性資料。");
                seerElementTypeCombinations = combinations;
                return combinations;
            }).catch((error) => {
                seerElementTypeCombinationsPromise = null;
                seerElementTypeCombinations = [];
                throw error;
            });
        }
        return seerElementTypeCombinationsPromise;
    }

    function fetchSeerPetCatalog(onProgress) {
        if (!seerPetCatalogPromise) {
            seerPetCatalogPromise = (async () => {
                const firstPage = await fetchSeerJson(
                    "https://api.seerapi.com/v1/pet?offset=0&limit=200&expand=true"
                );
                if (!Array.isArray(firstPage.results)) throw new Error("SeerAPI 回傳的精靈清單格式無效。");
                const count = Number(firstPage.count);
                if (!Number.isSafeInteger(count) || count < 0 || count > 20000) {
                    throw new Error("SeerAPI 回傳的精靈筆數無效。");
                }
                const pets = firstPage.results.map(toSeerPetCatalogEntry);
                onProgress(pets.length, count);
                const offsets = [];
                for (let offset = 200; offset < count; offset += 200) offsets.push(offset);
                const workers = Array.from({ length: Math.min(4, offsets.length) }, async () => {
                    while (offsets.length > 0) {
                        const offset = offsets.shift();
                        const page = await fetchSeerJson(
                            `https://api.seerapi.com/v1/pet?offset=${offset}&limit=200&expand=true`
                        );
                        if (!Array.isArray(page.results)) throw new Error("SeerAPI 回傳的精靈分頁格式無效。");
                        pets.push(...page.results.map(toSeerPetCatalogEntry));
                        onProgress(pets.length, count);
                    }
                });
                await Promise.all(workers);
                if (pets.length !== count) {
                    throw new Error(`SeerAPI 精靈資料不完整（收到 ${pets.length}／${count} 筆）。`);
                }
                pets.sort((first, second) => second.id - first.id);
                return pets;
            })().catch((error) => {
                seerPetCatalogPromise = null;
                throw error;
            });
        }
        return seerPetCatalogPromise;
    }

    function toSeerPetCatalogEntry(pet) {
        const id = Number(pet && pet.id);
        const typeId = Number(pet && pet.type && pet.type.id);
        if (!Number.isSafeInteger(id) || id < 1) throw new Error("SeerAPI 回傳了無效的精靈 ID。");
        return {
            id,
            name: String(pet && pet.name || ""),
            ...(pet.advance?.id != null ? {advance:pet.advance} : {}),
            typeId: Number.isSafeInteger(typeId) && typeId > 0 ? typeId : null
        };
    }

    function fetchSeerSkinCatalog() {
        if (!seerSkinCatalogPromise) {
            seerSkinCatalogPromise = (async () => {
                const skins = [];
                let nextUrl = "https://api.seerapi.com/v1/pet_skin?offset=0&limit=200&expand=true";
                const visitedPageUrls = new Set();
                while (nextUrl) {
                    const parsedUrl = new URL(nextUrl);
                    if (parsedUrl.origin !== "https://api.seerapi.com") {
                        throw new Error("SeerAPI 回傳了無效的皮膚分頁網址。");
                    }
                    if (visitedPageUrls.has(parsedUrl.href)) {
                        throw new Error("SeerAPI 回傳重複的皮膚分頁網址。");
                    }
                    visitedPageUrls.add(parsedUrl.href);
                    const page = await fetchSeerJson(parsedUrl.href);
                    if (!Array.isArray(page.results)) {
                        throw new Error("SeerAPI 回傳的皮膚清單格式無效。");
                    }
                    skins.push(...page.results);
                    if (skins.length > 5000) {
                        throw new Error("SeerAPI 皮膚清單超出可處理筆數。");
                    }
                    nextUrl = page.next || null;
                }
                return skins;
            })().catch((error) => {
                seerSkinCatalogPromise = null;
                throw error;
            });
        }
        return seerSkinCatalogPromise;
    }

    function fetchSeerPetDetails(petId) {
        const key = String(petId);
        let petPromise = seerPetDetailsCache.get(key);
        if (!petPromise) {
            petPromise = fetchSeerJson(`https://api.seerapi.com/v1/pet/${encodeURIComponent(key)}`)
                .catch((error) => {
                    seerPetDetailsCache.delete(key);
                    throw error;
                });
            seerPetDetailsCache.set(key, petPromise);
        }
        return petPromise;
    }

    async function fetchSeerPetsByName(query) {
        const searchTerms = [...new Set([query, convertToSimplifiedChinese(query)].filter(Boolean))];
        const responses = await Promise.all(searchTerms.map((term) => {
            const params = new URLSearchParams({ name: term, offset: "0", limit: "10", expand: "true" });
            return fetchSeerJson(`https://api.seerapi.com/v1/pet?${params}`);
        }));
        const petsById = new Map();
        responses.forEach((response) => {
            (response.results || []).forEach((pet) => {
                if (pet && pet.id !== undefined && !petsById.has(String(pet.id))) {
                    petsById.set(String(pet.id), pet);
                }
            });
        });
        return { pets: Array.from(petsById.values()), responses };
    }

    function fetchSeerElementTypeDetails(typeId) {
        const key = String(typeId);
        let detailsPromise = elementTypeDetailsCache.get(key);
        if (!detailsPromise) {
            detailsPromise = fetchSeerJson(
                `https://api.seerapi.com/v1/element_type_combination/${encodeURIComponent(key)}`
            ).then((details) => {
                const resolvedId = Number(details && details.id ? details.id : typeId);
                if (!Number.isSafeInteger(resolvedId) || resolvedId <= 0) {
                    throw new Error("SeerAPI 回傳的屬性 ID 無效。");
                }
                return {
                    id: resolvedId,
                    name: convertToTraditionalChinese(details && details.name ? String(details.name).trim() : "")
                };
            }).catch((error) => {
                elementTypeDetailsCache.delete(key);
                throw error;
            });
            elementTypeDetailsCache.set(key, detailsPromise);
        }
        return detailsPromise;
    }

    function fetchSeerPetInfo(petId) {
        const key = String(petId);
        let promise = seerPetInfoCache.get(key);
        if (!promise) {
            promise = fetchSeerJson(`https://api.seerapi.com/v1/pet/${encodeURIComponent(key)}`)
                .catch((error) => {
                    seerPetInfoCache.delete(key);
                    throw error;
                });
            seerPetInfoCache.set(key, promise);
        }
        return promise;
    }

    async function fetchSeerPetRelatedRecords(references, resource) {
        const cache = relatedCaches[resource];
        if (!cache) throw new Error(`Unknown related resource: ${resource}`);
        const getRelatedReference = (item) => item && (item[resource] || item);
        const uniqueIds = [...new Set(references
            .map((item) => getRelatedReference(item) && getRelatedReference(item).id)
            .filter((id) => id !== undefined && id !== null)
            .map(String))];
        const pendingIds = uniqueIds.slice();
        const recordsById = new Map();
        const workers = Array.from({ length: Math.min(4, pendingIds.length) }, async () => {
            while (pendingIds.length) {
                const id = pendingIds.shift();
                let promise = cache.get(id);
                if (!promise) {
                    const reference = references.find((item) =>
                        getRelatedReference(item) && String(getRelatedReference(item).id) === id
                    );
                    const relatedUrl = reference && getRelatedReference(reference).url;
                    const endpoint = relatedUrl || `https://api.seerapi.com/v1/${resource}/${encodeURIComponent(id)}`;
                    const parsedUrl = new URL(endpoint);
                    if (parsedUrl.origin !== "https://api.seerapi.com") {
                        throw new Error(`SeerAPI 回傳了無效的 ${resource} 資料網址。`);
                    }
                    promise = fetchSeerJson(parsedUrl.href)
                        .catch((error) => {
                            cache.delete(id);
                            throw error;
                        });
                    cache.set(id, promise);
                }
                recordsById.set(id, await promise);
            }
        });
        await Promise.all(workers);
        return references.map((reference) => {
            const relatedReference = getRelatedReference(reference);
            const id = relatedReference && String(relatedReference.id);
            return { reference, record: id ? recordsById.get(id) : null };
        });
    }
    return { fetchSeerElementTypeCombinations, fetchSeerPetCatalog, fetchSeerSkinCatalog, fetchSeerPetDetails, fetchSeerPetsByName, fetchSeerElementTypeDetails, fetchSeerPetInfo, fetchSeerPetRelatedRecords,
        getElementTypeCombinations: () => seerElementTypeCombinations,
        getCachedElementTypeDetails: id => elementTypeDetailsCache.get(String(id))
    };
}
