const SEER_TYPE_ICON_IDS = [
    ...Array.from({ length: 132 }, (_, index) => index + 1),
    221, 222, 223, 224, 225, 226
];
const SEER_SKIN_CATEGORY_IDS = [
    0, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
];
const SEER_ICON_PATHS = [
    ...SEER_TYPE_ICON_IDS.map((id) => `${id}.png`),
    "prop.png",
    ...SEER_SKIN_CATEGORY_IDS.map((id) => `common_pet_skin_icon_${id}.png`),
    "sex_sexless.png",
    "sex_male.png",
    "sex_female.png"
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
                image.src = new URL(`../seer_icons/${iconPath}`, import.meta.url).href;
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
