import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SEARCH_CATEGORIES, searchHomeCategory } from "../js/app/home-search.js";

const catalog = JSON.parse(readFileSync(new URL("../data/abnormal.json", import.meta.url), "utf8"));
const abnormal = SEARCH_CATEGORIES.find(category => category.key === "abnormal");
const localFetch = async url => {
    assert.equal(url.pathname.endsWith("/data/abnormal.json"), true);
    return { ok: true, json: async () => structuredClone(catalog) };
};

test("global search includes abnormal names, effect keywords and numeric ID zero", async () => {
    assert(abnormal);
    for (const [query, ids] of [["麻痺", [0]], ["0", [0]], ["１５", [15]], ["真實傷害", [42, 36]], ["山神守護", [12]], ["神話", [17]], ["21", [21]], ["不存在的異常", []], ["", []]]) {
        const result = await searchHomeCategory(abnormal, query, { fetchImpl: localFetch });
        assert.deepEqual(result.records.map(item => item.id), ids);
        assert.equal(result.more, false);
    }
    const simplified = value => value.replaceAll("凍", "冻");
    const result = await searchHomeCategory(abnormal, "冻傷", { fetchImpl: localFetch, simplified });
    assert.equal(result.records[0].id, 5);
});

test("abnormal search ranks exact names and reports additional matches", async () => {
    const result = await searchHomeCategory(abnormal, "無法行動", { fetchImpl: localFetch });
    assert.equal(result.records.length, 4);
    assert.equal(result.more, true);
    const exact = await searchHomeCategory(abnormal, "燒傷", { fetchImpl: localFetch });
    assert.equal(exact.records[0].id, 2);
});

test("abnormal search forwards cancellation and reports unavailable local data", async () => {
    const controller = new AbortController();
    await assert.rejects(searchHomeCategory(abnormal, "冰封", { signal: controller.signal, fetchImpl: async (_url, options) => {
        assert.equal(options.signal, controller.signal);
        return { ok: false, status: 503 };
    } }), /503/);
});

test("existing API categories retain their endpoints and reject invalid records", async () => {
    for (const category of SEARCH_CATEGORIES.filter(item => item.key !== "abnormal")) {
        const result = await searchHomeCategory(category, "雷伊", { fetchImpl: async url => {
            assert.equal(new URL(url).pathname, `/v1/${category.endpoint}`);
            return { ok: true, json: async () => ({ results: [{ id: 1, name: "雷伊" }, { id: 0, name: "錯誤" }, { id: 2, name: "隱藏", is_hidden: true }], next: null }) };
        } });
        assert.deepEqual(result.records.map(item => item.id), [1]);
    }
});
