import assert from "node:assert/strict";
import { test } from "node:test";
import { SEER_TYPE_DATA } from "../js/seer-type-data.js";
import {
    calculateTypeMultiplier,
    getTypeMatchupAnalysis,
    getSkillStoneMatchupAnalysis,
    SeerTypeCalculatorController,
    getRelatedTypeOptions,
} from "../js/seer-type-calculator.js";

test("related attribute choices include the single type and every matching dual type", () => {
    assert.deepEqual(getRelatedTypeOptions(null), []);
    for (const base of SEER_TYPE_DATA.singleTypes) {
        const choices = getRelatedTypeOptions(base);
        assert.equal(choices[0].name, base);
        assert.equal(choices[0].types.length, 1);
        assert(choices.every(type => type.types.includes(base)));
        assert.equal(choices.length, SEER_TYPE_DATA.combinations.filter(type => type.types.includes(base)).length);
    }
});

test("search spans all attributes rather than the selected base", () => {
    const results = getRelatedTypeOptions("火", "聖靈超能");
    assert(results.length > 0);
    assert(results.every(type => type.types.includes("聖靈") && type.types.includes("超能")));
    assert.deepEqual(getRelatedTypeOptions(null, " 聖靈 · 超能 "), results);
    assert.deepEqual(getRelatedTypeOptions("火", "不存在的屬性"), []);
});

test("related filtering can use the encyclopedia API catalog", () => {
    const catalog = [
        { id: 1001, name: "火", types: ["火"] },
        { id: 1002, name: "火 飛行", types: ["火", "飛行"] },
        { id: 1003, name: "水", types: ["水"] },
    ];
    assert.deepEqual(getRelatedTypeOptions("火", "", catalog).map(type => type.id), [1001, 1002]);
    assert.deepEqual(getRelatedTypeOptions("水", "火飛行", catalog).map(type => type.id), [1002]);
});

// Regression cases from https://www.bilibili.com/opus/393640212312106869
const examples = [
    [["次元"], ["暗影"], 0],
    [["聖靈"], ["電", "火"], 4],
    [["次元", "電"], ["地面"], 0.25],
    [["聖靈", "超能"], ["電"], 1.5],
    [["聖靈", "超能"], ["電", "火"], 1.5],
    [["次元", "電"], ["地面", "暗影"], 0.375],
    [["戰鬥", "龍"], ["冰", "龍"], 4],
];

test("both features start without selected attributes", () => {
    class InitialState extends SeerTypeCalculatorController {
        initDOMElements() {}
        bindEvents() {}
        render() {}
    }
    const view = new InitialState({});
    assert.equal(view.selectedTypeId, null);
    assert.equal(view.vsTypeAId, null);
    assert.equal(view.vsTypeBId, null);
});

test("opening a pet attribute resets stale lookup filters and selects the exact type ID", () => {
    const view = Object.create(SeerTypeCalculatorController.prototype);
    view.currentFeature = "vs";
    view.searchQuery = "火";
    view.targetSearchInput = { value: "火" };
    view.currentMode = "defense";
    view.currentFilter = "zero";
    view.setFeature = feature => { view.currentFeature = feature; };
    view.setMode = mode => { view.currentMode = mode; };
    view.setFilter = filter => { view.currentFilter = filter; };
    view.render = () => {};
    for (const type of SEER_TYPE_DATA.combinations) {
        assert.equal(view.openLookup(type.id), true);
        assert.equal(view.selectedTypeId, type.id);
    }
    assert.equal(view.currentFeature, "lookup");
    assert.equal(view.currentMode, "attack");
    assert.equal(view.currentFilter, "all");
    assert.equal(view.searchQuery, "");
    assert.equal(view.targetSearchInput.value, "");
    const previousType = view.selectedTypeId;
    assert.equal(view.openLookup(-1), false);
    assert.equal(view.selectedTypeId, previousType);
});

test("partial matchup selection hides results and never substitutes a default", (t) => {
    const previousDocument = globalThis.document;
    globalThis.document = { createElement: () => ({ append(...children) { this.children = children; } }) };
    t.after(() => { globalThis.document = previousDocument; });
    const view = Object.create(SeerTypeCalculatorController.prototype);
    for (const key of ["vsIconA", "vsIconB", "vsNameA", "vsNameB", "vsBtnA", "vsBtnB", "vsResults", "vsEmpty", "vsStoneSelect", "vsStoneResult"]) {
        view[key] = { replaceChildren(...children) { this.children = children; } };
    }
    view.vsTypeAId = null;
    view.vsTypeBId = null;
    view.selectedSkillStoneId = null;
    view.renderVs();
    assert.equal(view.vsResults.hidden, true);
    assert.equal(view.vsIconA.hidden, true);
    assert.equal(view.vsNameB.textContent, "尚未選擇");
    view.vsTypeAId = SEER_TYPE_DATA.combinations.find(t => t.name === "草").id;
    view.renderVs();
    assert.equal(view.vsNameA.textContent, "草");
    assert.equal(view.vsResults.hidden, true);
    assert.equal(view.vsEmpty.textContent, "請選擇對方屬性。");
    view.swapVsTypes();
    assert.equal(view.vsTypeAId, null);
    assert.equal(view.vsNameB.textContent, "草");
    assert.equal(view.vsResults.hidden, true);
    assert.equal(view.vsEmpty.textContent, "請選擇我方屬性。");
    view.selectedSkillStoneId = SEER_TYPE_DATA.combinations.find(t => t.name === "火").id;
    view.vsTypeBId = null;
    view.renderSkillStones();
    assert.equal(view.vsStoneResult.hidden, true);
    assert.equal(view.vsStoneSelect.children[0].children[1], "火系技能石");
    assert.equal(view.vsStoneSelect.children[0].children[0].src, `./seer_icons/${view.selectedSkillStoneId}.png`);
});

for (const [attack, defense, expected] of examples) {
    test(`${attack.join("·")} → ${defense.join("·")} = ${expected}`, () => {
        assert.equal(calculateTypeMultiplier(attack, defense), expected);
    });
}

test("single versus dual: zero and normal/weak cases", () => {
    assert.equal(calculateTypeMultiplier(["電"], ["地面", "水"]), 0.5);
    assert.equal(calculateTypeMultiplier(["電"], ["地面", "草"]), 0.125);
    assert.equal(calculateTypeMultiplier(["普通"], ["草", "水"]), 1);
});

test("dual versus dual never applies the zero penalty again", () => {
    // Repeated components exercise the zero intermediate coefficient boundary.
    assert.equal(calculateTypeMultiplier(["電", "電"], ["地面", "水"]), 2);
    assert.equal(calculateTypeMultiplier(["次元", "次元"], ["暗影", "暗影"]), 0);
});

test("all supported matchups stay within 0–4 and ignore component order", () => {
    for (const attack of SEER_TYPE_DATA.combinations) {
        for (const defense of SEER_TYPE_DATA.combinations) {
            const value = calculateTypeMultiplier(attack.types, defense.types);
            assert(Number.isFinite(value) && value >= 0 && value <= 4);
            assert.equal(calculateTypeMultiplier([...attack.types].reverse(), defense.types), value);
            assert.equal(calculateTypeMultiplier(attack.types, [...defense.types].reverse()), value);
        }
    }
});

test("lookup and skill stone calculations use the corrected formula", () => {
    const holy = SEER_TYPE_DATA.combinations.find(t => t.name === "聖靈");
    const target = SEER_TYPE_DATA.combinations.find(t =>
        t.types.length === 2 && t.types.includes("電") && t.types.includes("火"));
    const lookup = getTypeMatchupAnalysis(holy.id);
    assert.equal(lookup.attackResults.find(r => r.type.id === target.id).multiplier, 4);
    const reverse = getTypeMatchupAnalysis(target.id);
    assert.equal(reverse.defenseResults.find(r => r.type.id === holy.id).multiplier, 4);
    const stones = getSkillStoneMatchupAnalysis(target.id);
    assert.equal(stones.length, 21);
    assert.equal(stones.find(r => r.type.id === holy.id).multiplier, 4);

    const view = Object.create(SeerTypeCalculatorController.prototype);
    view.vsTypeBId = target.id;
    view.selectedSkillStoneId = holy.id;
    for (const key of ["vsStoneSelect", "vsStoneResult", "vsStoneTitle", "vsStoneMult", "vsStoneBadge"]) {
        view[key] = { replaceChildren(...children) { this.children = children; } };
    }
    const previousDocument = globalThis.document;
    globalThis.document = { createElement: () => ({ append(...children) { this.children = children; } }) };
    try {
        view.renderSkillStones();
        assert.equal(view.vsStoneMult.textContent, "4×");
        assert.equal(view.vsStoneResult.hidden, false);
        assert.equal(view.vsStoneTitle.children[0].children[0].src, `./seer_icons/${holy.id}.png`);
        assert.equal(view.vsStoneTitle.children[2].children[0].src, `./seer_icons/${target.id}.png`);
    } finally {
        globalThis.document = previousDocument;
    }
});
