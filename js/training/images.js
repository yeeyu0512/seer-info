import { cancelSkinImage, loadMonsterImage, monsterImageUrl, skinThumbnailPetId } from "../lookup/skin-image.js";

const API = "https://api.seerapi.com/v1/";

export function createTrainingImages({fetchCached, simplified}) {
    const matches = new Map();
    function fallback(skin) {
        const key = `${skin.name}:${skin.pet?.id}`;
        if (!matches.has(key)) {
            const params = new URLSearchParams({name:simplified(skin.name),limit:"20",expand:"true"});
            matches.set(key, fetchCached(`${API}pet?${params}`).then(data => {
                const exact = (data.results || []).filter(pet => simplified(pet.name).trim() === simplified(skin.name).trim());
                const pet = exact.find(pet => Number(pet.id) === Number(skin.pet?.id)) || exact.sort((a,b) => b.id-a.id)[0];
                return pet?.id ?? null;
            }).catch(error => { matches.delete(key); throw error; }));
        }
        return matches.get(key);
    }
    function clear(image) {
        cancelSkinImage(image);
        image.trainingImageToken = null;
        image.hidden = true;
        image.removeAttribute("src");
    }
    function set(image, {id, skin, kind = "head", onUnavailable}) {
        clear(image);
        const token = {}; image.trainingImageToken = token;
        const current = () => image.trainingImageToken === token && image.isConnected;
        const show = (resource, resolveFallback) => {
            if (!current()) return;
            loadMonsterImage(image, resource, {kind, isCurrent:current, onUnavailable, fallback:resolveFallback});
        };
        const resolveFallback = skin && (async () => {
            const resource = await fallback(skin);
            return resource ? monsterImageUrl(resource, kind) : null;
        });
        const thumbnailPetId = kind === "head" ? skinThumbnailPetId(skin) : null;
        // Category 0 contains original appearances stored as pets rather than skin PNGs.
        if (thumbnailPetId !== null) {
            show(thumbnailPetId, resolveFallback);
        } else if (skin && Number(skin.category?.id) === 0) {
            fallback(skin).then(resource => show(resource || id, resource ? null : resolveFallback))
                .catch(() => show(id, resolveFallback));
        } else show(id, resolveFallback);
    }
    return {set, clear};
}
