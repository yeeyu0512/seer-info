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
