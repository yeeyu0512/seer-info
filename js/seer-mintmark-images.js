import { loadRuffleRuntime } from "./shared/ruffle-runtime.js";
export { loadRuffleRuntime } from "./shared/ruffle-runtime.js";
// One on-demand renderer for the whole page. No ID crawling or persistent image storage.
const SOURCE = "https://seer.61.com/resource/countermark/icon/";
const MAX_SWF_BYTES = 1024 * 1024;
const CACHE_LIMIT = 256;
const OUTPUT_SIZE = 150; // Render vectors at 3x, then display in the existing 50px slot.

export function mintmarkSourceUrl(id) {
    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0 || !/^\d+$/.test(String(id))) throw new Error("無效刻印 ID");
    return `${SOURCE}${Number(id)}.swf`;
}

export class MintmarkImageQueue {
    constructor(convert, { delay = 500, limit = CACHE_LIMIT } = {}) {
        this.convert = convert;
        this.delay = delay;
        this.limit = limit;
        this.cache = new Map();
        this.pending = new Map();
        this.tail = Promise.resolve();
    }
    get(id, active = () => true) {
        mintmarkSourceUrl(id);
        id = Number(id);
        if (this.cache.has(id)) {
            const result = this.cache.get(id);
            this.cache.delete(id); this.cache.set(id, result);
            return Promise.resolve(result);
        }
        if (this.pending.has(id)) {
            this.pending.get(id).checks.push(active);
            return this.pending.get(id).promise;
        }
        const task = { checks: [active] };
        task.promise = this.tail.then(async () => {
            if (!task.checks.some(check => check())) return undefined;
            let result;
            try { result = await this.convert(id); }
            catch (error) { console.warn(`刻印圖片 ${id} 無法載入：`, error); result = null; }
            this.cache.set(id, result);
            while (this.cache.size > this.limit) this.cache.delete(this.cache.keys().next().value);
            await new Promise(resolve => setTimeout(resolve, this.delay));
            return result;
        }).finally(() => this.pending.delete(id));
        this.pending.set(id, task);
        this.tail = task.promise.catch(() => {});
        return task.promise;
    }
}

let player;


async function downloadSwf(id, signal) {
    const response = await fetch(mintmarkSourceUrl(id), { signal, redirect: "error", credentials: "omit" });
    if (!response.ok) throw new Error(`官方來源 HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > MAX_SWF_BYTES) throw new Error("SWF 檔案過大");
    const reader = response.body.getReader();
    const chunks = []; let length = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.length;
            if (length > MAX_SWF_BYTES) { await reader.cancel(); throw new Error("SWF 檔案過大"); }
            chunks.push(value);
        }
    } finally { reader.releaseLock(); }
    const data = new Uint8Array(length);
    let offset = 0;
    chunks.forEach(chunk => { data.set(chunk, offset); offset += chunk.length; });
    if (length < 8 || !["FWS", "CWS"].includes(String.fromCharCode(...data.slice(0, 3)))) throw new Error("來源不是支援的 SWF");
    const expanded = new DataView(data.buffer).getUint32(4, true);
    if (expanded > 8 * MAX_SWF_BYTES) throw new Error("SWF 解壓大小過大");
    return data;
}

async function convert(id) {
    const engine = await loadRuffleRuntime();
    // Keep the player in the document so it renders, but never show its controls.
    if (!player) {
        player = engine.createPlayer();
        player.className = "seal-shared-renderer";
        player.style.width = player.style.height = `${OUTPUT_SIZE}px`;
        player.setAttribute("aria-hidden", "true");
        player.inert = true;
        document.body.append(player);
    }
    const controller = new AbortController();
    const current = player;
    let timeout;
    try {
        return await Promise.race([
            (async () => {
                const downloadStarted = performance.now();
                const data = await downloadSwf(id, controller.signal);
                const downloadMs = performance.now() - downloadStarted;
                const renderStarted = performance.now();
                await current.ruffle().load({ data, swfFileName: `${id}.swf`, wmode: "transparent", autoplay: "on", unmuteOverlay: "hidden", splashScreen: false, contextMenu: "off", allowScriptAccess: false, allowNetworking: "none", openUrlMode: "deny", preferredRenderer: "canvas" });
                const output = document.createElement("canvas");
                output.width = output.height = OUTPUT_SIZE;
                const context = output.getContext("2d", { willReadFrequently: true });
                let stable = 0;
                for (;;) {
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    if (controller.signal.aborted) throw new Error("圖片載入逾時");
                    const canvas = current.shadowRoot?.querySelector("canvas");
                    if (!canvas) continue;
                    context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
                    context.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
                    const pixels = context.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE).data;
                    if (!pixels.some((value, index) => index % 4 === 3 && value > 0)) continue;
                    if (++stable < 3) continue;
                    current.ruffle().suspend();
                    const png = output.toDataURL("image/png");
                    console.debug(`[mintmark] id=${id} swf=${data.length} signature=${String.fromCharCode(...data.slice(0, 3))} download=${Math.round(downloadMs)}ms render=${Math.round(performance.now() - renderStarted)}ms`);
                    return png;
                }
            })(),
            new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("圖片載入逾時")), 15000); })
        ]);
    } catch (error) {
        current.remove();
        if (player === current) player = null;
        throw error;
    } finally { clearTimeout(timeout); controller.abort(); }
}

const queue = new MintmarkImageQueue(convert);
// Export only explicitly selected marks, reusing both cached and pending renders.
export function getMintmarkImage(id) {
    return queue.get(id);
}
let observer;
const waiting = new Set();
export function observeMintmarkImage(slot, id) {
    slot.dataset.mintmarkImageId = id;
    slot.setAttribute("aria-label", "刻印圖片待載入");
    if (!observer) observer = new IntersectionObserver(entries => {
        entries.forEach(async entry => {
            if (!entry.isIntersecting) return;
            const target = entry.target;
            observer.unobserve(target);
            const active = () => {
                const rect = target.getBoundingClientRect();
                return !document.hidden && target.isConnected && target.getClientRects().length > 0
                    && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
            };
            const result = await queue.get(target.dataset.mintmarkImageId, active);
            if (!target.isConnected) return;
            if (result === undefined) {
                if (document.hidden) waiting.add(target);
                else observer.observe(target);
                return;
            }
            if (!result) { target.setAttribute("aria-label", "刻印圖片暫時無法取得"); return; }
            const image = document.createElement("img");
            image.src = result;
            image.alt = "";
            image.width = image.height = 50;
            target.replaceChildren(image);
            target.setAttribute("aria-label", "刻印圖片");
        });
    }, { threshold: 0.1 });
    observer.observe(slot);
}

export function unobserveMintmarkImages(root) {
    root.querySelectorAll("[data-mintmark-image-id]").forEach(slot => { observer?.unobserve(slot); waiting.delete(slot); });
}

if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    waiting.forEach(slot => { if (slot.isConnected) observer?.observe(slot); });
    waiting.clear();
});
