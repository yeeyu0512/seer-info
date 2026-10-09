import { typeIconUrl } from "../js/shared/assets.js";
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

test("ancient water is selectable, searchable, and included in matchup analysis", () => {
    const type = SEER_TYPE_DATA.combinations.find(type => type.id === 133);
    assert.deepEqual(type.types, ["遠古", "水"]);
    for (const base of type.types) {
        assert(getRelatedTypeOptions(base).some(option => option.id === 133));
    }
    assert(getRelatedTypeOptions(null, "遠古水").some(option => option.id === 133));
    const analysis = getTypeMatchupAnalysis(133);
    assert.equal(analysis.activeType, type);
    assert.equal(analysis.attackResults.length, SEER_TYPE_DATA.combinations.length);
    assert.equal(analysis.defenseResults.length, SEER_TYPE_DATA.combinations.length);
    assert.equal(analysis.attackResults.find(result => result.type.name === "火").multiplier, 1.5);
    assert.equal(typeIconUrl(type.id), new URL("../assets/icons/types/133.png", import.meta.url).href);
});

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
test("single type relations contain only known targets with no duplicate or conflicting multipliers", () => {
    const types = SEER_TYPE_DATA.singleTypes;
    assert.equal(new Set(types).size, types.length);
    assert.deepEqual(Object.keys(SEER_TYPE_DATA.singleRelations).sort(), [...types].sort());
    for (const [attacker, relations] of Object.entries(SEER_TYPE_DATA.singleRelations)) {
        const seen = new Set();
        for (const key of ["eff_2x", "eff_05x", "eff_0x"]) {
            for (const target of relations[key]) {
                assert(types.includes(target), `${attacker}: unknown target ${target}`);
                assert(!seen.has(target), `${attacker} → ${target}: duplicate or conflicting multiplier`);
                seen.add(target);
            }
        }
    }
});

// https://wiki.biligame.com/seer/次元系
test("dimension matchups distinguish evil spirit from divine spirit in lookup and skill stones", () => {
    const id = name => SEER_TYPE_DATA.combinations.find(type => type.name === name).id;
    const dimension = id("次元");
    for (const [target, expected] of [["邪靈", 2], ["神靈", 0.5]]) {
        assert.equal(calculateTypeMultiplier(["次元"], [target]), expected);
        assert.equal(getTypeMatchupAnalysis(dimension).attackResults.find(row => row.type.id === id(target)).multiplier, expected);
        assert.equal(getTypeMatchupAnalysis(id(target)).defenseResults.find(row => row.type.id === dimension).multiplier, expected);
        assert.equal(getSkillStoneMatchupAnalysis(id(target)).find(row => row.type.id === dimension).multiplier, expected);
    }
    assert.equal(calculateTypeMultiplier(["次元", "電"], ["神靈"]), 0.5);
    assert.equal(calculateTypeMultiplier(["次元"], ["邪靈", "神靈"]), 1.25);
});

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
    assert.equal(view.vsStoneSelect.children[0].children[0].src, typeIconUrl(view.selectedSkillStoneId));
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

test("skill stone picker renders all choices and supports selecting, changing, and clearing", (t) => {
    const previousDocument = globalThis.document;
    function element() {
        return {
            children: [], attributes: {}, events: {},
            classList: { toggle() {}, remove() {} },
            append(...children) { this.children.push(...children); },
            replaceChildren(...children) { this.children = children; },
            setAttribute(name, value) { this.attributes[name] = value; },
            addEventListener(name, handler) { this.events[name] = handler; },
        };
    }
    globalThis.document = { createElement: element, createDocumentFragment: element };
    t.after(() => { globalThis.document = previousDocument; });
    const view = Object.create(SeerTypeCalculatorController.prototype);
    for (const key of ["pickerOptionsContainer", "vsStoneSelect", "vsStoneResult", "vsStoneTitle", "vsStoneMult", "vsStoneBadge"]) {
        view[key] = element();
    }
    view.currentPickerTarget = "stone";
    view.selectedSkillStoneId = null;
    view.vsTypeBId = SEER_TYPE_DATA.combinations.find(type => type.name === "草").id;
    let closeCount = 0;
    view.closePickerModal = () => { closeCount++; };
    const choices = () => {
        view.renderPickerOptions();
        return view.pickerOptionsContainer.children[0].children;
    };
    const initial = choices();
    assert.equal(initial.length, 22);
    assert.equal(initial[0].textContent, "不攜帶");
    assert.equal(initial[0].attributes["aria-pressed"], "true");
    assert.deepEqual(initial.slice(1).map(button => button.children[1].textContent),
        ["草", "水", "火", "飛行", "電", "機械", "地面", "普通", "冰", "超能", "戰鬥", "光", "暗影", "神秘", "龍", "聖靈", "次元", "遠古", "邪靈", "自然", "蟲"]);
    for (const [name, multiplier] of [["火", "2×"], ["水", "0.5×"]]) {
        choices().find(button => button.children[1]?.textContent === name).events.click();
        assert.equal(view.selectedSkillStoneId, SEER_TYPE_DATA.combinations.find(type => type.name === name).id);
        assert.equal(view.vsStoneMult.textContent, multiplier);
        assert.equal(view.vsStoneResult.hidden, false);
        const selected = choices().filter(button => button.attributes["aria-pressed"] === "true");
        assert.equal(selected.length, 1);
        assert.equal(selected[0].children[1].textContent, name);
    }
    choices()[0].events.click();
    assert.equal(view.selectedSkillStoneId, null);
    assert.equal(view.vsStoneSelect.textContent, "不攜帶 ▾");
    assert.equal(view.vsStoneResult.hidden, true);
    assert.equal(choices()[0].attributes["aria-pressed"], "true");
    assert.equal(closeCount, 3);
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
        assert.equal(view.vsStoneTitle.children[0].children[0].src, typeIconUrl(holy.id));
        assert.equal(view.vsStoneTitle.children[2].children[0].src, typeIconUrl(target.id));
    } finally {
        globalThis.document = previousDocument;
    }
});
