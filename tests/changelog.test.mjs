import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('public changelog titles contain at most 18 characters including punctuation and spaces', async () => {
    const { entries } = JSON.parse(await readFile(new URL('../data/changelog.json', import.meta.url), 'utf8'));
    for (const entry of entries) {
        assert.equal(typeof entry.title, 'string');
        const count = [...entry.title].length;
        assert.ok(count > 0 && count <= 18, `${entry.date}: title has ${count} characters: ${entry.title}`);
    }
});
