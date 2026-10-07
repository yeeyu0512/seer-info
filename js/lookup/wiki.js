export function createSoulmarkImageResolver(fetchSeerJson) {
    const seerSoulmarkImageCache = new Map();
    function resolveSeerWikiSoulmarkImage(soulmarkId) {
        const key = String(soulmarkId);
        let promise = seerSoulmarkImageCache.get(key);
        if (!promise) {
            const query = new URLSearchParams({
                action: "parse",
                page: `魂印:${key}`,
                prop: "text",
                format: "json",
                origin: "*"
            });
            promise = fetchSeerJson(`https://wiki.biligame.com/seer/api.php?${query}`)
                .then((response) => {
                    const html = response && response.parse && response.parse.text &&
                        response.parse.text["*"];
                    if (typeof html !== "string") {
                        throw new Error(`魂印 Wiki 頁面 ${key} 沒有可解析的內容。`);
                    }
                    const document = new DOMParser().parseFromString(html, "text/html");
                    const soulmarkImage = document.querySelector(
                        ".mw-parser-output > table.wikitable td[rowspan] img"
                    );
                    const candidates = [
                        soulmarkImage && soulmarkImage.getAttribute("src"),
                        ...(soulmarkImage && soulmarkImage.getAttribute("srcset") || "")
                            .split(",")
                            .map((candidate) => candidate.trim().split(/\s+/)[0])
                            .filter(Boolean),
                    ].filter(Boolean);
                    const imageUrl = candidates[candidates.length - 1];
                    if (!imageUrl) {
                        throw new Error(`魂印 Wiki 頁面 ${key} 找不到魂印圖片。`);
                    }
                    const parsedImageUrl = new URL(imageUrl, "https://wiki.biligame.com");
                    if (parsedImageUrl.hostname !== "patchwiki.biligame.com" ||
                        !parsedImageUrl.pathname.startsWith("/images/seer/")) {
                        throw new Error(`魂印 Wiki 頁面 ${key} 回傳了無效圖片網址。`);
                    }
                    return parsedImageUrl.href;
                })
                .catch((error) => {
                    seerSoulmarkImageCache.delete(key);
                    throw error;
                });
            seerSoulmarkImageCache.set(key, promise);
        }
        return promise;
    }
    return resolveSeerWikiSoulmarkImage;
}
