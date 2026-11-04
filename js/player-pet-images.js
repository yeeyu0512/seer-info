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
            const setImage = options => {
                images.set(image, options);
                const fallback = image.onerror;
                let corrected = false;
                image.onerror = async event => {
                    if (!current()) return;
                    const match = String(image.src).match(/^(https:\/\/newseer\.61\.com\/web\/monster\/head\/)1500(\d+)(\.png)$/);
                    if (!corrected && match) {
                        corrected = true;
                        image.hidden = false;
                        image.src = `${match[1]}1400${match[2]}${match[3]}`;
                        return;
                    }
                    return fallback?.call(image, event);
                };
            };
            const original = () => {
                if (current()) setImage({ id });
            };
            original();
            if (!Number.isSafeInteger(skinId) || skinId <= 0 || skinId > 0xffffffff) return;
            // Player queries encode 1500xxx appearances as 100000 + the skin catalog ID.
            const variantSkin = skinId > 100000 && skinId < 101000;
            const catalogSkinId = variantSkin ? skinId - 100000 : skinId;
            try {
                const skin = await fetchCached(`https://api.seerapi.com/v1/pet_skin/${catalogSkinId}`);
                if (!current() || Number(skin?.id) !== catalogSkinId || Number(skin?.pet?.id) !== id) return;
                const resource = String(skinImageId(skin));
                setImage({ id: variantSkin ? resource.replace(/^1400/, '1500') : resource, skin, onUnavailable: original });
            } catch {
                // The original image remains available when skin metadata fails.
            }
        }
    };
}
