import { typeIconUrl, skinCategoryIconUrl, genderIconUrl, ASSETS } from "./shared/assets.js";
import { SEER_TYPE_DATA } from "./seer-type-data.js";
const SEER_TYPE_ICON_IDS = SEER_TYPE_DATA.combinations.map(type => type.id);
const SEER_SKIN_CATEGORY_IDS = [
    0, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
];
const SEER_ICON_PATHS = [
    ...SEER_TYPE_ICON_IDS.map(typeIconUrl), ASSETS.attributeSkill,
    ...SEER_SKIN_CATEGORY_IDS.map(skinCategoryIconUrl),
    ...['sexless','male','female'].map(genderIconUrl)
];
const SEER_ICON_PRELOAD_CONCURRENCY = 4;
const preloadedSeerIcons = [];
let seerIconsPreloadScheduled = false;

export function preloadSeerIcons() {
    if (seerIconsPreloadScheduled) return;
    seerIconsPreloadScheduled = true;

    const preload = () => {
        let nextIndex = 0;
        let activeRequests = 0;

        const loadNext = () => {
            while (
                activeRequests < SEER_ICON_PRELOAD_CONCURRENCY &&
                nextIndex < SEER_ICON_PATHS.length
            ) {
                const iconPath = SEER_ICON_PATHS[nextIndex++];
                const image = new Image();
                activeRequests++;
                preloadedSeerIcons.push(image);
                image.decoding = "async";
                image.fetchPriority = "low";

                const settle = () => {
                    activeRequests--;
                    loadNext();
                };
                image.addEventListener("load", settle, { once: true });
                image.addEventListener("error", settle, { once: true });
                image.src = iconPath;
            }
        };

        loadNext();
    };

    if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(preload, { timeout: 2000 });
    } else {
        window.setTimeout(preload, 250);
    }
}
