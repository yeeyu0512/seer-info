// Single-file probe only; does not crawl IDs or start an image service.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { inflateSync, deflateSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const OUT = new URL('../tmp/', import.meta.url);
const MAX_BYTES = 8 * 1024 * 1024;
const TAG_NAMES = { 0: 'End', 1: 'ShowFrame', 2: 'DefineShape', 4: 'PlaceObject', 6: 'DefineBitsJPEG', 8: 'JPEGTables', 9: 'SetBackgroundColor', 12: 'DoAction', 20: 'DefineBitsLossless', 21: 'DefineBitsJPEG2', 22: 'DefineShape2', 26: 'PlaceObject2', 32: 'DefineShape3', 35: 'DefineBitsJPEG3', 36: 'DefineBitsLossless2', 39: 'DefineSprite', 59: 'DoInitAction', 69: 'FileAttributes', 70: 'PlaceObject3', 76: 'SymbolClass', 82: 'DoABC', 83: 'DefineShape4', 90: 'DefineBitsJPEG4' };

function rect(buffer, start) {
    let bit = start * 8;
    const bits = count => {
        let value = 0;
        for (let i = 0; i < count; i++, bit++) {
            if ((bit >> 3) >= buffer.length) throw Error('Truncated RECT');
            value = value * 2 + ((buffer[bit >> 3] >> (7 - (bit & 7))) & 1);
        }
        return value;
    };
    const n = bits(5);
    const signed = () => { const value = bits(n); return n && value >= 2 ** (n - 1) ? value - 2 ** n : value; };
    const [xMin, xMax, yMin, yMax] = [signed(), signed(), signed(), signed()];
    return { xMin, xMax, yMin, yMax, width: (xMax - xMin) / 20, height: (yMax - yMin) / 20, end: Math.ceil(bit / 8) };
}

export function inspectSwf(input) {
    if (input.length < 8) throw Error('Truncated SWF header');
    const signature = input.toString('ascii', 0, 3);
    const declaredBytes = input.readUInt32LE(4);
    if (declaredBytes > MAX_BYTES) throw Error('SWF decompressed size exceeds limit');
    let buffer;
    if (signature === 'FWS') buffer = input;
    else if (signature === 'CWS') buffer = Buffer.concat([input.subarray(0, 8), inflateSync(input.subarray(8), { maxOutputLength: MAX_BYTES - 8 })]);
    else throw Error(`Unsupported SWF signature: ${signature} (ZWS requires LZMA)`);
    if (buffer.length !== declaredBytes) throw Error('SWF length mismatch');
    const stage = rect(buffer, 8);
    const frameRate = buffer.readUInt16LE(stage.end) / 256;
    const frameCount = buffer.readUInt16LE(stage.end + 2);
    const tags = [];
    function scan(start, end, scope = 'root', depth = 0) {
        if (depth > 32) throw Error('Sprite nesting limit exceeded');
        let offset = start;
        while (offset < end) {
            if (offset + 2 > end) throw Error('Truncated tag header');
            const header = buffer.readUInt16LE(offset); offset += 2;
            const code = header >> 6;
            let length = header & 63;
            if (length === 63) {
                if (offset + 4 > end) throw Error('Truncated long tag header');
                length = buffer.readUInt32LE(offset); offset += 4;
            }
            if (offset + length > end) throw Error('Truncated tag');
            const data = buffer.subarray(offset, offset + length);
            const tag = { code, name: TAG_NAMES[code] || `Tag${code}`, length, scope, data };
            if ([2, 22, 32, 83].includes(code)) tag.bounds = rect(data, 2);
            if ([6, 20, 21, 35, 36, 39, 90].includes(code)) tag.characterId = data.readUInt16LE(0);
            tags.push(tag);
            if (code === 39) {
                tag.frameCount = data.readUInt16LE(2);
                scan(offset + 4, offset + length, `sprite:${tag.characterId}`, depth + 1);
            }
            offset += length;
            if (code === 0) break;
        }
    }
    scan(stage.end + 4, buffer.length);
    return { signature, version: input[3], declaredBytes, stage, frameRate, frameCount, tags };
}

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
    const payload = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(payload));
    return Buffer.concat([length, payload, checksum]);
}
export function extractLossless(tag) {
    const data = tag.data;
    const format = data[2], width = data.readUInt16LE(3), height = data.readUInt16LE(5);
    if (!width || !height || width > 2048 || height > 2048) throw Error('Bitmap dimensions exceed limit');
    const alpha = tag.code === 36;
    if (![3, 5].includes(format)) throw Error(`Bitmap format ${format} not implemented in this probe`);
    const paletteSize = format === 3 ? data[7] + 1 : 0;
    const bytes = inflateSync(data.subarray(format === 3 ? 8 : 7), { maxOutputLength: 2048 * 2048 * 4 + 1024 });
    const paletteBytes = paletteSize * (alpha ? 4 : 3);
    const stride = format === 3 ? (width + 3) & ~3 : width * 4;
    if (bytes.length !== paletteBytes + stride * height) throw Error('Bitmap byte length mismatch');
    const rgba = Buffer.alloc(width * height * 4);
    let transparent = 0, partial = 0, opaque = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const pixel = (y * width + x) * 4;
        let r, g, b, a;
        if (format === 5) {
            const offset = y * stride + x * 4;
            a = alpha ? bytes[offset] : 255;
            [r, g, b] = [bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]];
        } else {
            const index = bytes[paletteBytes + y * stride + x];
            if (index >= paletteSize) throw Error('Invalid palette index');
            const offset = index * (alpha ? 4 : 3);
            [r, g, b] = [bytes[offset], bytes[offset + 1], bytes[offset + 2]];
            a = alpha ? bytes[offset + 3] : 255;
        }
        // SWF Lossless2 stores premultiplied RGB; PNG stores straight alpha.
        const straight = value => a ? Math.min(255, Math.round(value * 255 / a)) : 0;
        rgba.set([alpha ? straight(r) : r, alpha ? straight(g) : g, alpha ? straight(b) : b, a], pixel);
        if (a === 0) transparent++; else if (a === 255) opaque++; else partial++;
    }
    const rows = Buffer.alloc(height * (width * 4 + 1));
    for (let y = 0; y < height; y++) rgba.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
    const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
    const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', Buffer.alloc(0))]);
    return { png, width, height, format, alpha: { transparent, partial, opaque } };
}

async function main() {
    const useLocal = process.argv.includes('--local');
    const url = 'https://seer.61.com/resource/countermark/icon/42415.swf';
    await mkdir(OUT, { recursive: true });
    let input, http = null;
    if (useLocal) input = await readFile(new URL('42415.swf', OUT));
    else {
        const started = performance.now();
        const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
        http = { url, status: response.status, contentType: response.headers.get('content-type'), contentLength: response.headers.get('content-length') };
        console.log(JSON.stringify(http));
        if (!response.ok) throw Error(`Upstream HTTP ${response.status}`);
        const chunks = []; let size = 0;
        for await (const chunk of response.body) {
            size += chunk.length;
            if (size > MAX_BYTES) { await response.body.cancel().catch(() => {}); throw Error('Download exceeds limit'); }
            chunks.push(chunk);
        }
        input = Buffer.concat(chunks);
        http.downloadMs = Math.round(performance.now() - started);
        await writeFile(new URL('42415.swf', OUT), input);
    }
    const swf = inspectSwf(input);
    const report = { http, bytes: input.length, ...swf, tags: swf.tags.map(({ data, ...tag }) => tag) };
    const counts = {};
    swf.tags.forEach(tag => { counts[tag.name] = (counts[tag.name] || 0) + 1; });
    report.tagCounts = counts;
    const bitmaps = swf.tags.filter(tag => [20, 36].includes(tag.code));
    report.extracted = [];
    for (const [index, tag] of bitmaps.entries()) {
        const started = performance.now();
        const { png, ...details } = extractLossless(tag);
        const filename = bitmaps.length === 1 ? '42415.png' : `42415-bitmap-${tag.characterId}.png`;
        await writeFile(new URL(filename, OUT), png);
        report.extracted.push({ filename, characterId: tag.characterId, ...details, pngBytes: png.length, conversionMs: +(performance.now() - started).toFixed(2) });
    }
    if (!bitmaps.length) report.conversion = 'No lossless bitmap found; inspect JPEG/vector tags before selecting another converter.';
    await writeFile(new URL('42415-report.json', OUT), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error); process.exitCode = 1; });
