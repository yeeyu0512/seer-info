import { mkdir, writeFile, rename } from 'node:fs/promises';

const source = 'https://www.61.com.tw/seer_df/news/more';
const clean = text => text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
const items = new Map();
const visited = new Set();
let page = source;
// Collect a bounded recent archive, following the site's actual pagination.
while (page && visited.size < 20 && items.size < 12) {
    const address = new URL(page);
    if (address.origin !== 'https://www.61.com.tw' || !address.pathname.startsWith('/seer_df/news/more')) throw new Error('Invalid pagination URL');
    if (visited.has(page)) throw new Error('Repeated pagination URL');
    visited.add(page);
    const response = await fetch(page, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Official news HTTP ${response.status}`);
    const html = await response.text();
    const rows = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>\s*<h1>([\s\S]*?)<\/h1>\s*<h4>([\s\S]*?)<\/h4>\s*<\/a>/g)];
    if (!rows.length) throw new Error('Official list layout changed; preserving previous data.');
    for (const row of rows) {
        const title = clean(row[2]);
        if (!/^\d{1,2}月\d{1,2}日維護與活動更新公告$/.test(title.replace(/\s+/g, ''))) continue;
        const url = new URL(row[1], page);
        const published = clean(row[3]).match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)?.[0];
        if (url.origin !== address.origin || !url.pathname.startsWith('/seer_df/news/page/') || !published) throw new Error('Invalid announcement');
        items.set(url.href, { title, url: url.href, date: published.slice(5, 10).replace('-', '/'), publishedAt: published.replace(' ', 'T') + '+08:00' });
    }
    const next = html.match(/<a\b[^>]*href="([^"]+)"[^>]*>\s*下一頁\s*<\/a>/)?.[1];
    page = next ? new URL(next, page).href : null;
}
if (!items.size) throw new Error('No maintenance announcements found; preserving previous data.');
const sorted = [...items.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 12);
const file = new URL('../data/official-news.json', import.meta.url);
const temporary = new URL('../data/official-news.json.tmp', import.meta.url);
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(temporary, JSON.stringify({ source, fetchedAt: new Date().toISOString(), items: sorted }, null, 2) + '\n');
await rename(temporary, file);
console.log(`Saved ${sorted.length} maintenance announcements from ${visited.size} pages.`);
