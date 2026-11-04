const loads = new WeakMap();

export function cancelSkinImage(image) {
    loads.get(image)?.cancel();
}

export function hasSkinImageLoad(image) {
    return loads.has(image);
}

// Each image owns its retry and fallback; a failed head must not replace a valid body.
export function loadSkinImage(image, url, { fallback, isCurrent = () => true, retryDelay = 300 } = {}) {
    cancelSkinImage(image);
    let timer;
    let retried = false;
    let findingFallback = false;
    let usingFallback = false;
    let source = url;
    const state = { cancel() {
        clearTimeout(timer);
        image.removeEventListener('load', loaded);
        image.removeEventListener('error', failed);
        if (loads.get(image) === state) loads.delete(image);
    } };
    const current = () => loads.get(image) === state && image.isConnected
        && isCurrent() && image.getAttribute('src') === source;
    function assign(next) {
        source = next;
        image.hidden = false;
        image.src = next;
    }
    function loaded() {
        if (current() && image.naturalWidth > 0) image.hidden = false;
    }
    async function failed() {
        // An event queued for the previous source must not affect a pending/new image.
        if (!current() || !image.complete || image.naturalWidth > 0 || timer || findingFallback) return;
        if (!retried) {
            retried = true;
            timer = setTimeout(() => {
                timer = null;
                if (!current()) return;
                const retry = new URL(url);
                retry.searchParams.set('skin_retry', '1');
                assign(retry.href);
            }, retryDelay);
            return;
        }
        if (!usingFallback && fallback) {
            findingFallback = true;
            try {
                const next = await fallback();
                if (!current()) return;
                if (next && next !== url) {
                    usingFallback = true;
                    assign(next);
                    return;
                }
            } catch (error) {
                console.error('Load skin image fallback error:', error);
            } finally {
                findingFallback = false;
            }
        }
        if (current()) image.hidden = true;
    }
    loads.set(image, state);
    image.addEventListener('load', loaded);
    image.addEventListener('error', failed);
    assign(url);
}
