export function createSuitEyeDetector(fetchCached) {
    const cache = new Map();
    return async function hasEye(suit) {
        if (!cache.has(suit.id)) {
            const pending = Promise.all((suit.equips || []).map(async reference => {
                const part = reference.equip || reference;
                if (part.part_type?.id != null) return Number(part.part_type.id) === 1;
                const record = await fetchCached(`https://api.seerapi.com/v1/equip/${encodeURIComponent(part.id)}`);
                if (Number(record.id) !== Number(part.id) || record.part_type?.id == null) throw new Error("套裝部件資料不完整");
                return Number(record.part_type.id) === 1;
            })).then(parts => parts.some(Boolean)).catch(error => {cache.delete(suit.id); throw error;});
            cache.set(suit.id,pending);
        }
        return cache.get(suit.id);
    };
}
