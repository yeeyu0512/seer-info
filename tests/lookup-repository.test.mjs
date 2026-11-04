import assert from "node:assert/strict";
import { test } from "node:test";
import { createLookupRepository } from "../js/lookup/repository.js";

const repository = fetchSeerJson => createLookupRepository({
    fetchSeerJson, convertToTraditionalChinese: value => value,
    convertToSimplifiedChinese: value => value
});

test("pet catalog stays separate from full details and duplicate consumers share requests", async () => {
    const calls = [];
    const repo = repository(async url => {
        calls.push(url);
        return new URL(url).pathname.endsWith("/pet")
            ? {count:1,results:[{id:1,name:"精靈",type:{id:2}}]}
            : {id:1,name:"精靈",base_stats:{hp:120}};
    });
    assert.deepEqual(await repo.fetchSeerPetCatalog(() => {}), [{id:1,name:"精靈",typeId:2}]);
    const [first, second] = await Promise.all([repo.fetchSeerPetInfo(1),repo.fetchSeerPetInfo(1)]);
    assert.equal(first, second);
    assert.equal(first.base_stats.hp, 120);
    assert.equal(await repo.fetchSeerPetDetails(1), first, "list names and full info reuse the same pet response");
    assert.equal(calls.length, 2);
});

test("failed details and paginated catalogs can be retried", async () => {
    let failures = 2;
    const repo = repository(async url => {
        if (failures-- > 0) throw new Error("offline");
        return url.includes("pet_skin") ? {results:[],next:null} : {id:1};
    });
    await assert.rejects(repo.fetchSeerPetInfo(1), /offline/);
    await assert.rejects(repo.fetchSeerSkinCatalog(), /offline/);
    assert.equal((await repo.fetchSeerPetInfo(1)).id, 1);
    assert.deepEqual(await repo.fetchSeerSkinCatalog(), []);
});

test("related records deduplicate fetches but preserve reference order and metadata", async () => {
    const calls = [];
    const repo = repository(async url => {
        calls.push(url);
        await new Promise(resolve => setTimeout(resolve, url.endsWith("/1") ? 5 : 1));
        return {id:Number(url.split("/").at(-1))};
    });
    const references = [{skill:{id:2},level:10},{skill:{id:1},level:20},{skill:{id:2},level:30}];
    const result = await repo.fetchSeerPetRelatedRecords(references,"skill");
    assert.deepEqual(result.map(item => item.record.id), [2,1,2]);
    assert.deepEqual(result.map(item => item.reference.level), [10,20,30]);
    assert.equal(calls.length, 2);
    await repo.fetchSeerPetRelatedRecords(references,"skill");
    assert.equal(calls.length, 2);
});

test("each repository instance owns its caches and invalid reference URLs are rejected", async () => {
    let count = 0;
    const fetch = async () => ({id:++count});
    const first = repository(fetch), second = repository(fetch);
    assert.notEqual(await first.fetchSeerPetInfo(1),await second.fetchSeerPetInfo(1));
    await assert.rejects(first.fetchSeerPetRelatedRecords([{id:9,url:"https://example.com/skill/9"}],"skill"), /無效/);
    assert.equal(count, 2);
});

test("886 skins share five catalog requests across concurrent consumers and later reads", async () => {
    const records = Array.from({length:886}, (_, index) => ({id:index+1, name:`皮膚${index}`, pet:{id:5000}}));
    const calls = [];
    const repo = repository(async url => {
        calls.push(url);
        const params = new URL(url).searchParams;
        const offset = Number(params.get('offset'));
        const limit = Number(params.get('limit'));
        return { count:records.length, results:records.slice(offset, offset+limit),
            next:offset+limit < records.length ? `https://api.seerapi.com/v1/pet_skin?offset=${offset+limit}&limit=${limit}&expand=true` : null };
    });
    const [first, second] = await Promise.all([repo.fetchSeerSkinCatalog(), repo.fetchSeerSkinCatalog()]);
    assert.equal(first, second);
    assert.equal(first.length, 886);
    assert.equal(await repo.fetchSeerSkinCatalog(), first);
    assert.equal(calls.length, 5);
    assert(calls.every(url => new URL(url).pathname === '/v1/pet_skin'));
});

test("partial or duplicate skin catalogs are not retained as successful cache entries", async () => {
    let mode = 'partial';
    const repo = repository(async () => {
        const skin = {id:1, pet:{id:2}};
        return {count:mode === 'valid' ? 1 : 2, results:mode === 'duplicate' ? [skin, skin] : [skin], next:null};
    });
    await assert.rejects(repo.fetchSeerSkinCatalog(), /不完整/);
    mode = 'duplicate';
    await assert.rejects(repo.fetchSeerSkinCatalog(), /重複/);
    mode = 'valid';
    assert.equal((await repo.fetchSeerSkinCatalog()).length, 1);
});

test("skin names and preview types reuse the shared pet catalog without fetching pet details", async () => {
    const calls = [];
    const repo = repository(async url => {
        calls.push(url);
        const resource = new URL(url).pathname;
        if (resource === '/v1/pet') return {count:1, results:[{id:7, name:'綁定精靈', type:{id:3}}]};
        if (resource === '/v1/pet_skin') return {count:2, next:null, results:[
            {id:12, name:'甲', pet:{id:7}}, {id:13, name:'乙', pet:{id:7}}
        ]};
        return {id:7, name:'綁定精靈', base_stats:{hp:120}};
    });
    await repo.fetchSeerPetCatalog();
    const [first, second] = await Promise.all([repo.fetchSeerSkinEntries(), repo.fetchSeerSkinEntries()]);
    assert.equal(first, second);
    assert.equal(first.length, 2);
    assert.equal(first[0].pet.name, '綁定精靈');
    assert.equal(first[0].pet.type.id, 3);
    assert.equal(first[0].pet.base_stats, undefined);
    assert.equal(calls.length, 2, 'warm pet catalog is not downloaded again for skins');
    await repo.fetchSeerSkinEntries();
    assert.equal(calls.length, 2);
    await repo.fetchSeerPetInfo(7);
    assert.equal(calls.length, 3, 'full details are fetched only for the info view');
});

test("missing skin-linked pets are filled once and failed joined catalogs can retry", async () => {
    let fail = true, detailsCalls = 0;
    const repo = repository(async url => {
        const resource = new URL(url).pathname;
        if (resource === '/v1/pet') return {count:0, results:[]};
        if (resource === '/v1/pet_skin') return {count:2, next:null, results:[{id:1, pet:{id:9}}, {id:2, pet:{id:9}}]};
        detailsCalls++;
        if (fail) throw new Error('offline');
        return {id:9, name:'補齊精靈', type:{id:1}};
    });
    await assert.rejects(repo.fetchSeerSkinEntries(), /offline/);
    fail = false;
    const entries = await repo.fetchSeerSkinEntries();
    assert.equal(entries.length, 2);
    assert.equal(entries[1].pet.name, '補齊精靈');
    assert.equal(detailsCalls, 2);
});

test("catalogs retry transient failures but do not retry permanent HTTP errors", async () => {
    let calls = 0;
    const transient = repository(async () => {
        if (++calls === 1) throw new TypeError('Failed to fetch');
        return {count:0, results:[], next:null};
    });
    assert.deepEqual(await transient.fetchSeerSkinCatalog(), []);
    assert.equal(calls, 2);
    calls = 0;
    const permanent = repository(async () => { calls++; throw Object.assign(new Error('not found'), {status:404}); });
    await assert.rejects(permanent.fetchSeerSkinCatalog(), /not found/);
    assert.equal(calls, 1);
    calls = 0;
    const limited = repository(async () => { calls++; throw Object.assign(new Error('busy'), {status:429}); });
    await assert.rejects(limited.fetchSeerSkinCatalog(), /busy/);
    assert.equal(calls, 3, 'retries are bounded');
});
