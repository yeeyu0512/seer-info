import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {typeIconUrl,skinCategoryIconUrl,genderIconUrl} from '../js/shared/assets.js';
test('asset IDs distinguish invalid types from valid category zero',()=>{
    assert.equal(typeIconUrl(0),'');assert.equal(typeIconUrl(null),'');assert.equal(typeIconUrl('../1'),'');
    assert.equal(new URL(typeIconUrl(1)).pathname.endsWith('/assets/icons/types/1.png'),true);
    assert.equal(new URL(skinCategoryIconUrl(0)).pathname.endsWith('/assets/icons/skin-categories/0.png'),true);
    assert.equal(genderIconUrl('unknown'),'');
});
test('asset helpers preserve project subdirectory deployments',async()=>{
    const text = (await readFile(new URL('../js/shared/assets.js',import.meta.url),'utf8')).replaceAll('import.meta.url',JSON.stringify('https://example.test/seervote/js/shared/assets.js'));
    const assets = await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
    assert.equal(assets.typeIconUrl(221),'https://example.test/seervote/assets/icons/types/221.png');
    assert.equal(assets.skinCategoryIconUrl(0),'https://example.test/seervote/assets/icons/skin-categories/0.png');
    assert.equal(assets.ASSETS.seerHead,'https://example.test/seervote/assets/seer/head.png');
});
