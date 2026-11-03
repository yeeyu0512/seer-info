export function hasPetTypeFilter({ category, typeId }) {
    return typeId !== null || category !== "all";
}

export function matchesPetTypeFilter(pet, { category, typeId }, combinations) {
    const petTypeId = Number(pet?.type?.id ?? pet?.typeId);
    if (typeId !== null) return petTypeId === typeId;
    if (category === "all") return true;
    const combination = combinations.find(type => type.id === petTypeId);
    return Boolean(combination) && combination.isDouble === (category === "double");
}

export function matchesPetSearchQuery(pet, query, normalize) {
    const text = normalize(String(query || "")).trim().toLowerCase();
    return !text || normalize(String(pet.name || "")).toLowerCase().includes(text);
}

export function sortPetResults(pets, order, traditional = value => value) {
    if (order === "name") {
        const collator = new Intl.Collator("zh-Hant", { numeric: true, sensitivity: "base" });
        return pets.map(pet => ({ pet, name: traditional(String(pet.name || "")) }))
            .sort((a, b) => collator.compare(a.name, b.name) || a.pet.id - b.pet.id)
            .map(item => item.pet);
    }
    return pets.slice().sort((a, b) => order === "id-asc" ? a.id - b.id : b.id - a.id);
}
