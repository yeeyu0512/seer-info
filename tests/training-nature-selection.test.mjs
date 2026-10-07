import { test } from "node:test";
import assert from "node:assert/strict";
import { createTrainingResultView } from "../js/training/result-view.js";
import { zeroStats } from "../js/seer-training-core.js";

test("an unselected nature is not substituted with a neutral nature; ID zero remains selectable",()=>{
    const nodes=new Map();
    const query=selector=>{
        if(!nodes.has(selector))nodes.set(selector,{value:"0",checked:false,textContent:"",classList:{toggle(){}},querySelectorAll:()=>[],replaceChildren(){},append(){},setAttribute(){}});
        return nodes.get(selector);
    };
    query("[data-iv]").value="31";
    query("[data-nature]").value="";
    const natures=[{id:0,attributes:{atk:10,def:-10}},{id:24,attributes:zeroStats()}];
    const {recalculate}=createTrainingResultView({query,vector:zeroStats,selected:new Map([["pet",{id:1,name:"測試精靈"}]]),name:record=>record.name,
        source:()=>null,description:()=>"",activeRace:()=>Object.fromEntries(Object.keys(zeroStats()).map(key=>[key,100])),
        getNatures:()=>natures,getAdvancedStats:()=>null,getResultMode:()=>"base"});
    recalculate();
    assert.equal(query("[data-error]").textContent,"請先選擇個性。");
    assert.equal(query('[data-result="atk"]').textContent,"—");
    query("[data-nature]").value="24";recalculate();
    assert.equal(query('[data-result="atk"]').textContent,236);
    query("[data-nature]").value="0";recalculate();
    assert.equal(query('[data-result="atk"]').textContent,259);
    query("[data-nature]").value="";recalculate();
    assert.equal(query('[data-result="atk"]').textContent,"—");
});
