import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchSeerJson, fetchAdminJson } from "../js/shared/http.js";
import { createChineseConverters } from "../js/shared/chinese.js";
import { mapWithConcurrency } from "../js/shared/concurrency.js";
import { parseImportedCharacters, parseCompetitivePoolPetIds } from "../js/admin/import-parsers.js";
import { toCsvCell } from "../js/shared/csv.js";

test("public and admin HTTP adapters preserve options and their distinct errors", async () => {
    const original = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({url, options});
        return {ok: false, status: 404, json: async () => ({message: "找不到"})};
    };
    try {
        const signal = new AbortController().signal;
        await assert.rejects(fetchSeerJson("https://wiki.biligame.com/seer/api.php", {signal}), /404/);
        assert.equal(calls[0].options.signal, signal);
        assert.deepEqual(calls[0].options.headers, {Accept: "application/json"});
        await assert.rejects(fetchAdminJson("https://api.seerapi.com/v1/pet/1"), error =>
            error.message === "找不到" && error.status === 404 && error.resource === "/v1/pet/1");
    } finally { globalThis.fetch = original; }
});

test("conversion keeps special names and each caller's trim/null contract", () => {
    const {convertToTraditionalChinese, convertToSimplifiedChinese, toTraditionalChinese} =
        createChineseConverters(() => value => value.toUpperCase());
    assert.equal(convertToTraditionalChinese(null), "");
    assert.equal(convertToTraditionalChinese(" ab岳里背 "), " AB岳里背 ");
    assert.equal(convertToSimplifiedChinese(" ab里 "), " AB里 ");
    assert.equal(toTraditionalChinese(" ab里 "), "AB里");
    assert.equal(toTraditionalChinese(123), "123");
});

test("pool import rejects duplicate lines while competitive import counts duplicate IDs", () => {
    const pool = parseImportedCharacters("1,精靈\n2\n1\nwrong\n");
    assert.deepEqual(pool.invalidLines, [3,4]);
    assert.equal(pool.characters[1].lookupName, true);
    const competitive = parseCompetitivePoolPetIds("1，2 1\n0 wrong\n3");
    assert.deepEqual(competitive.ids, [{id:1,lineNumber:1},{id:2,lineNumber:1},{id:3,lineNumber:3}]);
    assert.equal(competitive.duplicateCount, 1);
    assert.deepEqual(competitive.invalidLines, [2]);
    assert.equal(toCsvCell('a,"b"'), '"a,""b"""');
});

test("concurrent map keeps input order and never exceeds its worker limit", async () => {
    let active = 0, peak = 0;
    const result = await mapWithConcurrency([4,3,2,1], 2, async value => {
        peak = Math.max(peak, ++active);
        await new Promise(resolve => setTimeout(resolve, value));
        active--;
        return value * 2;
    });
    assert.deepEqual(result, [8,6,4,2]);
    assert.equal(peak, 2);
});
