import { test } from "node:test";
import assert from "node:assert/strict";
import { mintmarkFinalStats } from "../js/seer-mintmark-stats.js";
import { selectMintmarks } from "../js/seer-mintmarks.js";
import { calculateTraining, zeroStats } from "../js/seer-training-core.js";

const mark = {id:42046,name:"窮奇之邪",type:{id:3},
    max_attr_value:{atk:46,sp_atk:0,def:26,sp_def:26,spd:36,hp:85,total:219},
    extra_attr_value:{atk:5,sp_atk:0,def:2,sp_def:2,spd:5,hp:2,total:16}};

test("hidden mintmark stats are added once without mutating API data",() => {
    assert.deepEqual(mintmarkFinalStats(mark),{atk:51,sp_atk:0,def:28,sp_def:28,spd:41,hp:87,total:235,percent:false});
    assert.equal(mark.max_attr_value.atk,46);
    assert.equal(mintmarkFinalStats({...mark,extra_attr_value:null}).atk,46);
    assert.equal(mintmarkFinalStats({}),null);
});
test("mintmark sorting includes hidden stats",() => {
    const other = {...mark,id:42047,extra_attr_value:null,max_attr_value:{atk:49,total:230}};
    assert.deepEqual(selectMintmarks([other,mark],{sort:"atk"}).map(m=>m.id),[42046,42047]);
    assert.deepEqual(selectMintmarks([other,mark],{sort:"total"}).map(m=>m.id),[42046,42047]);
});
test("three selected mintmarks include hidden stats before suit scaling",() => {
    const result = calculateTraining({race:{...zeroStats(),atk:100},ev:zeroStats(),
        sources:[0,1,2].map(() => ({stats:mintmarkFinalStats(mark),modes:["PVE","PVP"]})),
        suit:{stats:{...zeroStats(),atk:8,percent:true},modes:["PVE"]}});
    assert.equal(result.base.atk,236);
    assert.equal(result.PVP.atk,389);
    assert.equal(result.PVE.atk,420);
});
