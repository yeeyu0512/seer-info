import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('./asset-manifest.json',import.meta.url),'utf8'));
for (const entry of manifest) {
    const bytes = await readFile(new URL(entry.next,root));
    if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha) throw new Error('Asset content changed: '+entry.next);
}
console.log('Verified '+manifest.length+' assets: original bytes and SHA-256.');
