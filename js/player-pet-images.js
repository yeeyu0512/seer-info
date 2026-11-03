import { skinImageId } from './seer-training-selectors.js';
import { createTrainingImages } from './training/images.js';

async function fetchImageData(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('無法取得皮膚圖片資料');
    return response.json();
}

// Reuse the site's skin resource overrides and original-appearance fallback.
// This cache contains public image metadata only, never player query results.
export function createPlayerPetImages({ fetchJson = fetchImageData } = {}) {
    const requests = new Map();
    function fetchCached(url) {
        if (!requests.has(url)) {
            const pending = Promise.resolve().then(() => fetchJson(url)).catch(error => {
                requests.delete(url);
                throw error;
            });
            requests.set(url, pending);
        }
        return requests.get(url);
    }
    const images = createTrainingImages({ fetchCached, simplified: value => value });

    return {
        async set(image, pet) {
            const id = Number(pet?.id);
            const skinId = pet?.skin_id;
            const token = {};
            image.playerPetImageToken = token;
            const current = () => image.playerPetImageToken === token && image.isConnected;
            const original = () => {
                if (current()) images.set(image, { id });
            };
            original();
            if (!Number.isSafeInteger(skinId) || skinId <= 0 || skinId > 0xffffffff) return;
            try {
                const skin = await fetchCached(`https://api.seerapi.com/v1/pet_skin/${skinId}`);
                if (!current() || Number(skin?.id) !== skinId || Number(skin?.pet?.id) !== id) return;
                images.set(image, { id: skinImageId(skin), skin, onUnavailable: original });
            } catch {
                // The original image remains available when skin metadata fails.
            }
        }
    };
}
