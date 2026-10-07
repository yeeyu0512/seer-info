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
                return pet ? Number(pet.resource_id) || pet.id : null;
            }).catch(error => { matches.delete(key); throw error; }));
        }
        return matches.get(key);
    }
    function set(image, {id, skin, kind = "head", onUnavailable = () => { image.hidden = true; }}) {
        const token = {}; image.trainingImageToken = token;
        image.hidden = true; image.removeAttribute("src");
        let retried = false;
        const current = () => image.trainingImageToken === token && image.isConnected;
        const show = resource => {
            if (!current()) return;
            image.hidden = false;
            image.src = `https://newseer.61.com/web/monster/${kind}/${resource}.png`;
        };
        image.onerror = async () => {
            if (!current()) return;
            if (!skin || retried) { onUnavailable(); return; }
            retried = true;
            try { const resource = await fallback(skin); if (!current()) return; if (resource && resource !== Number(id)) show(resource); else onUnavailable(); }
            catch { if (current()) onUnavailable(); }
        };
        // Category 0 contains original appearances stored as pets rather than skin PNGs.
        if (skin && Number(skin.category?.id) === 0) {
            fallback(skin).then(resource => { retried = !!resource; show(resource || id); }).catch(() => show(id));
        } else show(id);
    }
    return {set, clear(image) { image.trainingImageToken = null; image.onerror = null; image.hidden = true; image.removeAttribute("src"); }};
}
