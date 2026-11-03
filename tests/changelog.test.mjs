import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('public changelog uses one entry per date and titles of at most 18 characters', async () => {
    const { entries } = JSON.parse(await readFile(new URL('../data/changelog.json', import.meta.url), 'utf8'));
    assert.equal(new Set(entries.map(entry => entry.date)).size, entries.length, 'Merge same-day changes into one entry');
    for (const entry of entries) {
        assert.equal(typeof entry.title, 'string');
        const count = [...entry.title].length;
        assert.ok(count > 0 && count <= 18, `${entry.date}: title has ${count} characters: ${entry.title}`);
    }
});
