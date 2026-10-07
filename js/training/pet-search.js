export function normalizePetQuery(value, simplified) {
    return simplified(String(value).normalize("NFKC")).toLocaleLowerCase().replace(/[\s·・•．.\-—_]+/g, "");
}

export async function searchTrainingPets(term, {fetchCached, simplified}) {
    const cleaned = String(term).normalize("NFKC").trim();
    const api = "https://api.seerapi.com/v1/pet";
    if (/^\d+$/.test(cleaned)) return {records:[await fetchCached(`${api}/${encodeURIComponent(cleaned)}`)], count:1};
    const parts = simplified(cleaned).split(/[\s·・•．.\-—_]+/).filter(Boolean);
    const searchTerm = parts.sort((a,b) => b.length-a.length)[0] || simplified(cleaned);
    const params = new URLSearchParams({name:searchTerm,limit:"100",expand:"true"});
    const data = await fetchCached(`${api}?${params}`);
    const needle = normalizePetQuery(cleaned,simplified);
    const records = (data.results || []).filter(pet => parts.every(part => normalizePetQuery(pet.name,simplified).includes(normalizePetQuery(part,simplified))))
        .sort((a,b) => Number(normalizePetQuery(b.name,simplified) === needle)-Number(normalizePetQuery(a.name,simplified) === needle) || b.id-a.id);
    return {records, count:data.count};
}
