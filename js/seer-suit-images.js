import { loadRuffleRuntime } from "./seer-mintmark-images.js";

const SIZE = 1000; // 500 game units at 2 pixels/unit, including wide wings and weapons.
const PART_CACHE_LIMIT = 12;
const MAX_BYTES = 2 * 1024 * 1024;
const HEAD_URL = new URL("../assets/seer-head.png", import.meta.url).href;
// Registration points in the game's front-facing ComposeMC, relative to (61, 88.45).
export const SUIT_PARTS = {
    0: { name: "頭部", x: 0, y: -48, layer: 5 },
    1: { name: "眼部", x: -41, y: -48, layer: 6 },
    2: { name: "腰部", x: -41, y: 10, layer: 2 },
    3: { name: "手部", x: -1, y: -4.1, layer: 4 },
    4: { name: "腳部", x: 0, y: 12.95, layer: 1 },
    5: { name: "背景", x: -61, y: -88.45, layer: 0 }
};

export function suitPartSourceUrl(id) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("無效部件 ID");
    return `https://seer.61.com/resource/item/cloth/prev/${id}.swf`;
}

// The game instantiates the exported item at its registration point, not its authoring-stage position.
export async function prepareSuitSwf(data) {
    if (data.length < 8 || !["FWS", "CWS"].includes(String.fromCharCode(...data.slice(0, 3)))) throw new Error("無效 SWF");
    if (new DataView(data.buffer, data.byteOffset).getUint32(4, true) > MAX_BYTES * 8) throw new Error("SWF 解壓大小過大");
    let body = data.slice(8);
    if (data[0] === 67) body = new Uint8Array(await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer());
    if (body.length > MAX_BYTES * 8) throw new Error("SWF 解壓大小過大");
    const oldRectLength = Math.ceil((5 + 4 * (body[0] >> 3)) / 8);
    const bits = [];
    const write = (value, count) => { if (value < 0) value += 2 ** count; for (let i = count - 1; i >= 0; i--) bits.push((value >> i) & 1); };
    write(14, 5);
    [-5000, 5000, -5000, 5000].forEach(value => write(value, 14));
    const rect = new Uint8Array(Math.ceil(bits.length / 8));
    bits.forEach((value, i) => { rect[i >> 3] |= value << (7 - (i & 7)); });
    const chunks = [data.slice(0, 8), rect, body.slice(oldRectLength, oldRectLength + 4)];
    const tags = [];
    let exportedItem;
    const view = new DataView(body.buffer);
    let position = oldRectLength + 4;
    while (position + 2 <= body.length) {
        const start = position;
        const header = view.getUint16(position, true); position += 2;
        const code = header >> 6;
        let length = header & 63;
        if (length === 63) { if (position + 4 > body.length) throw new Error("SWF 標籤無效"); length = view.getUint32(position, true); position += 4; }
        if (position + length > body.length) throw new Error("SWF 標籤無效");
        tags.push({ code, length, start, position });
        if ([56, 76].includes(code) && length >= 2) {
            const end = position + length, count = view.getUint16(position, true);
            let symbol = position + 2;
            for (let i = 0; i < count && symbol + 2 <= end; i++) {
                const id = view.getUint16(symbol, true); symbol += 2;
                const zero = body.indexOf(0, symbol);
                if (zero < symbol || zero >= end) throw new Error("SWF 匯出物件無效");
                if (new TextDecoder().decode(body.slice(symbol, zero)) === "item") exportedItem = id;
                symbol = zero + 1;
            }
        }
        position += length;
        if (code === 0) break;
    }
    for (const tag of tags) {
        const { code, length, start, position } = tag;
        if (code === 26 && length >= 5 && (body[position] & 2)) {
            const id = exportedItem || view.getUint16(position + 3, true);
            chunks.push(new Uint8Array([134, 6, 6, body[position + 1], body[position + 2], id & 255, id >> 8, 0]));
        } else chunks.push(body.slice(start, position + length));
    }
    const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    let offset = 0; chunks.forEach(chunk => { output.set(chunk, offset); offset += chunk.length; });
    output.set([70, 87, 83]);
    new DataView(output.buffer).setUint32(4, output.length, true);
    return output;
}

let head;
async function headImage() {
    if (!head) head = (async () => { const image = new Image(); image.src = HEAD_URL; await image.decode(); return image; })().catch(error => { head = null; throw error; });
    return head;
}

async function renderPart(id, active, report = () => {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let cancelled = false;
    const visibilityCheck = setInterval(() => { if (!active()) { cancelled = true; controller.abort(); } }, 250);
    let player;
    try {
        report("下載部件");
        const response = await fetch(suitPartSourceUrl(id), { credentials: "omit", redirect: "error", signal: controller.signal });
        if ([403, 429].includes(response.status)) { const error = new Error("官方來源暫停提供圖片"); error.pause = true; throw error; }
        if (!response.ok) throw new Error(`官方來源 HTTP ${response.status}`);
        if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("SWF 過大");
        const reader = response.body.getReader();
        const chunks = []; let size = 0;
        try {
            for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX_BYTES) { await reader.cancel(); throw new Error("SWF 過大"); } chunks.push(value); }
        } finally { reader.releaseLock(); }
        const raw = new Uint8Array(size); let offset = 0; chunks.forEach(chunk => { raw.set(chunk, offset); offset += chunk.length; });
        const data = await prepareSuitSwf(raw);
        report("載入渲染工具");
        const runtime = await loadRuffleRuntime();
        if (controller.signal.aborted) throw new Error("圖片載入逾時");
        player = runtime.createPlayer(); player.className = "suit-shared-renderer"; player.setAttribute("aria-hidden", "true"); player.inert = true;
        document.body.append(player);
        report("渲染部件");
        await Promise.race([
            player.ruffle().load({ data, swfFileName: `${id}.swf`, wmode: "transparent", autoplay: "on", unmuteOverlay: "hidden", splashScreen: false, contextMenu: "off", allowScriptAccess: false, allowNetworking: "none", openUrlMode: "deny", preferredRenderer: "canvas" }),
            new Promise((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("圖片載入逾時")), { once: true }))
        ]);
        const output = document.createElement("canvas"); output.width = output.height = SIZE;
        const context = output.getContext("2d", { willReadFrequently: true }); let frames = 0;
        while (!controller.signal.aborted) {
            await new Promise(resolve => setTimeout(resolve, 60));
            const canvas = player.shadowRoot?.querySelector("canvas"); if (!canvas) continue;
            context.clearRect(0, 0, SIZE, SIZE); context.drawImage(canvas, 0, 0, SIZE, SIZE);
            const pixels = context.getImageData(0, 0, SIZE, SIZE).data;
            if (!pixels.some((value, i) => i % 4 === 3 && value > 0)) continue;
            if (++frames < 10) continue;
            player.ruffle().suspend(); return output;
        }
        throw new Error("圖片載入逾時");
    } catch (error) {
        if (cancelled) error.cancelled = true;
        throw error;
    } finally { clearTimeout(timeout); clearInterval(visibilityCheck); controller.abort(); player?.remove(); }
}

function boundedSet(cache, key, value, limit) { cache.set(key, value); while (cache.size > limit) cache.delete(cache.keys().next().value); }

export function createSuitImageService(fetchJson) {
    const equipCache = new Map(), partCache = new Map(), imageCache = new Map(), pending = new Map();
    let tail = Promise.resolve(), paused = false;
    async function equips(record) {
        const result = [];
        for (const ref of record.equips || []) {
            if (!Number.isSafeInteger(ref.id) || ref.id <= 0) throw new Error("部件資料無效");
            if (!equipCache.has(ref.id)) {
                const promise = fetchJson(`https://api.seerapi.com/v1/equip/${ref.id}?expand=true`, { signal: AbortSignal.timeout(15000) });
                boundedSet(equipCache, ref.id, promise, 256);
                promise.catch(() => equipCache.delete(ref.id));
            }
            result.push(await equipCache.get(ref.id));
        }
        return result;
    }
    async function image(record, active = () => true, onProgress = () => {}) {
        if (imageCache.has(record.id)) { onProgress({ completed: 1, total: 1, label: "圖片已暫存" }); return imageCache.get(record.id); }
        if (pending.has(record.id)) {
            const task = pending.get(record.id); task.checks.push(active); task.listeners.push(onProgress);
            if (task.progress) onProgress(task.progress);
            return task.promise;
        }
        const task = { checks: [active], listeners: [onProgress] };
        const report = progress => { task.progress = progress; task.listeners.forEach(listener => { try { listener(progress); } catch (error) { console.warn("套裝進度顯示失敗", error); } }); };
        report({ completed: 0, total: null, label: "等候圖片載入…" });
        const wanted = () => task.checks.some(check => check());
        task.promise = tail.then(async () => {
            if (!wanted()) return undefined;
            if (paused) return null;
            try {
                report({ completed: 0, total: null, label: "讀取部件資料…" });
                const pieces = await equips(record);
                if (!pieces.length || pieces.some(piece => !SUIT_PARTS[piece.part_type?.id])) throw new Error("此套裝尚不支援組裝預覽");
                // Missing defaults are loaded only for a suit that actually needs them.
                if (!pieces.some(piece => piece.part_type.id === 4)) pieces.push({ id: 100003, part_type: { id: 4 } });
                const total = pieces.length + 2;
                let completed = 1;
                const layers = [];
                for (const piece of pieces) {
                    if (!wanted()) return undefined;
                    const partLabel = `${SUIT_PARTS[piece.part_type.id].name}（${completed}/${pieces.length}）`;
                    report({ completed, total, label: `載入${partLabel}` });
                    if (!partCache.has(piece.id)) {
                        let canvas = null;
                        try { canvas = await renderPart(piece.id, wanted, stage => report({ completed, total, label: `${stage}：${partLabel}` })); }
                        catch (error) { if (error.cancelled) return undefined; boundedSet(partCache, piece.id, null, PART_CACHE_LIMIT); if (error.pause) paused = true; throw error; }
                        finally { await new Promise(resolve => setTimeout(resolve, 500)); }
                        boundedSet(partCache, piece.id, canvas, PART_CACHE_LIMIT);
                    }
                    if (!partCache.get(piece.id)) throw new Error("部件圖片暫時無法載入");
                    layers.push({ canvas: partCache.get(piece.id), ...SUIT_PARTS[piece.part_type.id] });
                    completed++;
                    report({ completed, total, label: `部件已完成 ${completed - 1}/${pieces.length}` });
                }
                if (!wanted()) return undefined;
                report({ completed, total, label: "組裝套裝圖片…" });
                const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1000;
                const context = canvas.getContext("2d", { willReadFrequently: true });
                const base = await headImage();
                layers.push({ base, layer: 3 });
                layers.sort((a, b) => a.layer - b.layer).forEach(part => {
                    if (part.base) context.drawImage(base, 500 - 174, 478 - 148);
                    else context.drawImage(part.canvas, (1000 - SIZE) / 2 + part.x * 2, (1000 - SIZE) / 2 + part.y * 2);
                });
                const pixels = context.getImageData(0, 0, 1000, 1000).data;
                let x0 = 1000, y0 = 1000, x1 = 0, y1 = 0;
                for (let y = 0; y < 1000; y++) for (let x = 0; x < 1000; x++) if (pixels[(y * 1000 + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
                if (x0 > x1) throw new Error("無可見圖片");
                x0 = Math.max(0, x0 - 20); y0 = Math.max(0, y0 - 20); x1 = Math.min(999, x1 + 20); y1 = Math.min(999, y1 + 20);
                const output = document.createElement("canvas"); output.width = x1 - x0 + 1; output.height = y1 - y0 + 1;
                output.getContext("2d").drawImage(canvas, x0, y0, output.width, output.height, 0, 0, output.width, output.height);
                const result = output.toDataURL("image/png"); boundedSet(imageCache, record.id, result, 48);
                report({ completed: total, total, label: "圖片載入完成" }); return result;
            } catch (error) {
                console.warn(`套裝 ${record.id} 圖片無法載入`, error);
                boundedSet(imageCache, record.id, null, 48); return null;
            }
        }).finally(() => pending.delete(record.id));
        pending.set(record.id, task); tail = task.promise.catch(() => {}); return task.promise;
    }
    return { image, equips };
}
