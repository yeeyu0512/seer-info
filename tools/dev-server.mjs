import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.wasm': 'application/wasm',
    '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

export function createDevServer(root = ROOT, mintmarkDirectory = resolve(root, 'tmp/mintmarks')) {
    return createServer(async (request, response) => {
        try {
            if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405, { Allow: 'GET, HEAD' }).end();
            const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
            const parts = pathname.split('/').filter(Boolean);
            if (parts.some(part => part.startsWith('.') || part.includes('\\'))) return response.writeHead(403).end();
            const name = parts.length ? parts.join('/') : 'index.html';
            if (!(parts.length <= 1 && /\.(html|ico|txt|xml)$/.test(name))
                && !['css', 'js', 'assets', 'data'].includes(parts[0])) return response.writeHead(403).end();
            const isMintmark = parts[0] === 'data' && parts[1] === 'mintmarks';
            const base = isMintmark ? mintmarkDirectory : root;
            const file = await realpath(resolve(base, isMintmark ? parts.slice(2).join('/') : name));
            const rel = relative(await realpath(base), file);
            if (rel.startsWith('..') || isAbsolute(rel)) return response.writeHead(403).end();
            const body = await readFile(file);
            response.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            response.end(request.method === 'HEAD' ? undefined : body);
        } catch (error) {
            response.writeHead(error instanceof URIError ? 400 : error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 500).end();
        }
    });
}

export function devPort(args = [], fallback = process.env.PORT || 5500) {
    // npm's PowerShell shim can consume --port and forward only the number.
    const value = args.length === 0 ? fallback : args.length === 2 && args[0] === '--port' ? args[1]
        : args.length === 1 ? args[0].replace(/^--port=/, '') : '';
    const port = /^\d+$/.test(String(value)) ? Number(value) : NaN;
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('請使用 npm run dev -- --port 5501 指定有效連接埠。');
    return port;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const port = devPort(process.argv.slice(2));
    const server = createDevServer();
    server.on('error', error => { console.error(`本機網站啟動失敗：${error.message}`); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`本機網站：http://127.0.0.1:${port}/（按 Ctrl+C 停止）`));
}
