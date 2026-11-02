import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { ABNORMAL_FILTERS, ABNORMAL_PAGE_SIZE, getAbnormalPage, filterAbnormals, abnormalUrl, validateAbnormalCatalog } from "../js/seer-abnormal.js";

const catalog = JSON.parse(readFileSync(new URL("../data/abnormal.json", import.meta.url), "utf8"));
const numberedNames = "麻痺 中毒 燒傷 寄生對手 寄生 凍傷 害怕 疲憊 睡眠 石化 混亂 衰弱 山神守護 易燃 狂暴 冰封 流血 神話 免疫 癱瘓 失明 異常免疫 焚燼 詛咒 烈焰詛咒 致命詛咒 虛弱詛咒 感染 束縛 失神 沉默 臣服 凝滯 星賜 星哲 超頻 砥礪 沸湧 星贖 神遊 空定 狂信 雷解 漸凍 魘昧".split(" ");

test("abnormal pagination covers each result once with 12 per page and clamps filtered pages", () => {
    assert.equal(ABNORMAL_PAGE_SIZE, 12);
    const sorted = filterAbnormals(catalog.abnormals);
    const pages = [1,2,3,4].map(page => getAbnormalPage(sorted, page));
    assert.deepEqual(pages.map(page => page.items.length), [12,12,12,9]);
    assert.deepEqual(pages.flatMap(page => page.items.map(item => item.id)), Array.from({ length: 45 }, (_, index) => 44 - index));
    assert.equal(getAbnormalPage(catalog.abnormals, 99).page, 4);
    assert.equal(getAbnormalPage(catalog.abnormals, 0).page, 1);
    const filtered = getAbnormalPage(filterAbnormals(catalog.abnormals, "", "其他"), 4);
    assert.equal(filtered.page, 1);
    assert.equal(filtered.pages, 1);
    assert.deepEqual(filtered.items.map(item => item.id), [18,17,12,3]);
    assert.deepEqual(getAbnormalPage([], 4), { items: [], page: 1, pages: 1, start: 0, end: 0 });
});

test("status catalog covers all candidates with valid references, sources and local icons", () => {
    assert.equal(validateAbnormalCatalog(catalog), catalog);
    assert.deepEqual(catalog.abnormals.map(item => item.name), numberedNames);
    assert.deepEqual(catalog.abnormals.map(item => item.id), Array.from({ length: 45 }, (_, index) => index));
    for (const item of catalog.abnormals) {
        assert.equal(item.id, numberedNames.indexOf(item.name));
        assert(item.relatedStatuses.every(Number.isSafeInteger));
        assert(item.transformations.every(edge => Number.isSafeInteger(edge.targetId)));
        assert(existsSync(new URL(`../${item.icon}`, import.meta.url)));
        assert(item.sources.length > 0);
        for (const source of item.sources) {
            if (source.type === "userProvided") {
                assert.equal(source.url, null);
                assert(source.title.includes("使用者"));
            } else assert.equal(new URL(source.url).protocol, "https:");
            assert.match(source.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
        }
        assert(item.verificationNotes.some(note => note.includes("待確認")));
    }
    const duplicate = structuredClone(catalog);
    duplicate.abnormals[1].id = duplicate.abnormals[0].id;
    assert.throws(() => validateAbnormalCatalog(duplicate), /ID/);
    for (const id of [-1, "0", "paralysis", null, 1.5]) {
        const invalid = structuredClone(catalog);
        invalid.abnormals[0].id = id;
        assert.throws(() => validateAbnormalCatalog(invalid), /ID/);
    }
    const broken = structuredClone(catalog);
    broken.abnormals[0].relatedStatuses.push("missing");
    assert.throws(() => validateAbnormalCatalog(broken), /關聯/);
});

test("status search combines effect keywords and overlapping classification filters", () => {
    assert.equal(filterAbnormals(catalog.abnormals).length, 45);
    assert(ABNORMAL_FILTERS.includes("其他"));
    assert(!ABNORMAL_FILTERS.includes("PVE"));
    assert(!ABNORMAL_FILTERS.includes("特殊"));
    assert.deepEqual(catalog.abnormals.find(item => item.id === 21).tags, ["特殊"]);
    for (const [category, count] of [["控制",13],["弱化",16],["附屬",12],["限制",3],["衍化",6],["其他",4]]) {
        assert.equal(filterAbnormals(catalog.abnormals, "", category).length, count);
    }
    assert.deepEqual(filterAbnormals(catalog.abnormals, "真實傷害").map(item => item.name), ["雷解", "砥礪"]);
    assert.deepEqual(filterAbnormals(catalog.abnormals, " 冰封 ", "控制").map(item => item.name), ["冰封"]);
    assert.equal(filterAbnormals(catalog.abnormals, "不存在的狀態").length, 0);
    const normalize = text => text.replaceAll("冻", "凍");
    assert(filterAbnormals(catalog.abnormals, "冻傷", "全部", normalize).some(item => item.name === "凍傷"));
    assert.deepEqual(filterAbnormals(catalog.abnormals, "", "其他").map(item => item.id), [18,17,12,3]);
    assert(filterAbnormals(catalog.abnormals, "異常免疫", "附屬").some(item => item.id === 21));
});

test("transformation durations belong to results and curse outcomes are alternatives", () => {
    const byId = id => catalog.abnormals.find(item => item.id === id);
    assert.deepEqual(byId(43).transformations.map(edge => [edge.targetId, edge.duration]), [[15, "3 回合"]]);
    assert.deepEqual(byId(15).transformations.map(edge => [edge.targetId, edge.duration]), [[5, null]]);
    assert.equal(byId(40).transformations[0].duration, "2 回合");
    assert.equal(byId(35).transformations[0].duration, "1～2 回合");
    assert.equal(byId(23).transformations.length, 3);
    assert(byId(23).transformations.every(edge => edge.note.includes("隨機擇一")));
    assert.equal(byId(13).transformations[0].condition, "受到火系攻擊後");
});

test("status sharing preserves GitHub Pages paths and isolates existing resource parameters", () => {
    const url = abnormalUrl(15, "https://example.com/project/?tab=pet&id=12&build=old&server=cn&keep=1");
    assert.equal(url.pathname, "/project/");
    assert.equal(url.searchParams.get("abnormal"), "15");
    assert.equal(abnormalUrl(0, url.href).searchParams.get("abnormal"), "0");
    assert.equal(url.searchParams.get("keep"), "1");
    for (const key of ["id", "build", "server"]) assert.equal(url.searchParams.has(key), false);
    assert.equal(abnormalUrl(null, url.href).searchParams.has("abnormal"), false);
});

test("entry page has unique IDs and exposes status navigation and modal", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal((html.match(/data-lookup-mode="abnormal"/g) || []).length, 2);
    assert(ids.includes("abnormal-encyclopedia-section"));
    assert(ids.includes("abnormal-detail-dialog"));
});
