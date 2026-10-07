import { test } from "node:test";
import assert from "node:assert/strict";
import { drawTrainingExport } from "../js/training/export-layout.js";
import { createTrainingExportData } from "../js/training/export-data.js";

function render(overrides={}) {
    const texts=[];
    const ctx={font:"",fillRect(){},fillText(value,x,y,size){texts.push({value:String(value),x,y,size,color:this.fillStyle,font:this.font});},drawImage(){},
        beginPath(){},roundRect(){},fill(){},stroke(){},moveTo(){},lineTo(){},
        measureText(value){return {width:Array.from(String(value)).length*(parseFloat(this.font.match(/(\d+)px/)[1]))};},
        createLinearGradient(){return {addColorStop(){}};}};
    const canvas={getContext:()=>ctx};
    const data={petName:"測試精靈",petId:1,mode:"PVP",appearance:"原始外觀",nature:"開朗",iv:31,hpTraining:20,year:true,
        stats:{},ev:{},team:{atk:15,def:15,sp_atk:0,sp_def:15,spd:10,hp:30},mintmarks:[],suit:"晨曦之星戰甲",eye:"漫遊者-AH",title:"神話",...overrides};
    drawTrainingExport(canvas,data,{portrait:{naturalWidth:100,naturalHeight:100},marks:[]});
    return {canvas,texts,data};
}
test("export labels and columns are compact and include zero team bonuses",()=>{
    const {canvas,texts}=render();
    assert.equal(canvas.height,956);
    assert.ok(texts.some(item=>item.value==="天賦"));
    assert.ok(!texts.some(item=>/種族值|個體值|神諭覺醒/.test(item.value)));
    const find=value=>texts.find(item=>item.value===value);
    assert.equal(find("裝備").y,find("戰隊加成").y);
    assert.equal(find("個性").y,find("天賦").y);
    assert.equal(find("體力上限").y,find("年費加成").y);
    for (const value of ["個性","天賦","體力上限","年費加成"]) {
        assert.equal(find(value).color,"#c8d5ea");assert.ok(find(value).font.startsWith("700 "));
        assert.ok(find(value).font.includes("22px"));
    }
    assert.ok(!find("開朗").font.startsWith("700 "));
    assert.ok(!texts.some(item=>item.value.includes("體力上限培養")));
    assert.ok(render({year:false}).texts.some(item=>item.value==="關"));
    assert.ok(find("+0"));
});
test("long names wrap fully, retain an awakening badge, and grow the canvas only as needed",()=>{
    const petName="超級長名稱測試精靈".repeat(4),suit="超級長套裝名稱".repeat(5);
    const {canvas,texts}=render({petName,suit,awakened:true});
    assert.ok(canvas.height>956);
    assert.equal(texts.filter(item=>item.value==="神諭覺醒").length,1);
    assert.equal(texts.filter(item=>item.x===850 && item.y>=106 && !item.value.startsWith("#")).map(item=>item.value).join(""),petName);
    assert.equal(texts.filter(item=>item.x===830).slice(0,-2).map(item=>item.value).join(""),suit);
    assert.ok(texts.every(item=>item.x>=0 && item.x+item.size<=1600 && item.y<canvas.height));
});
test("awakening badge requires both a supported pet and loaded, enabled awakening",()=>{
    const query=selector=>selector==="[data-race-mode]" ? {value:"advance"}
        : selector==="[data-nature]" ? {selectedOptions:[{textContent:"開朗"}]}
        : {value:"31",checked:false,textContent:"1",src:"",hidden:true};
    const args={pet:{id:1,name:"測試",advance:{id:2}},selected:new Map(),query,name:record=>record.name,resultMode:"PVP",vector:()=>({})};
    assert.equal(createTrainingExportData({...args,advancedStats:{hp:100}}).awakened,true);
    assert.equal(createTrainingExportData(args).awakened,false);
    assert.equal(createTrainingExportData({...args,pet:{id:1},advancedStats:{hp:100}}).awakened,false);
    assert.equal(createTrainingExportData({...args,advancedStats:{hp:100},query:selector=>selector==="[data-race-mode]" ? {value:"normal"} : query(selector)}).awakened,false);
});
test("export nature modifiers use the selected nature's attributes",()=>{
    const query=selector=>selector==="[data-nature]" ? {selectedOptions:[{textContent:"固執 · 攻擊增加"}]} : {value:"31",checked:false,textContent:"1",src:"",hidden:true};
    const args={pet:{id:1,name:"測試"},selected:new Map(),query,name:record=>record.name,resultMode:"PVP",vector:()=>({})};
    assert.equal(createTrainingExportData({...args,natureAttributes:{atk:10,sp_atk:-10}}).natureEffect,"攻擊+10%／特攻−10%");
    assert.equal(createTrainingExportData(args).natureEffect,"平衡發展");
    const neutral=createTrainingExportData({...args,query:selector=>selector==="[data-nature]" ? {value:"24",selectedOptions:[{textContent:"認真 · 平衡發展"}]} : query(selector)});
    assert.equal(neutral.nature,"認真");
    assert.equal(neutral.natureEffect,"平衡發展");
    assert.ok(render(neutral).texts.some(item=>item.value==="認真（平衡發展）"));
    const unselected=createTrainingExportData({...args,query:selector=>selector==="[data-nature]" ? {value:"",selectedOptions:[{textContent:"尚未選擇"}]} : query(selector)});
    assert.equal(unselected.natureEffect,"");
    const {texts}=render({nature:"固執",natureEffect:"攻擊+10%／特攻−10%"});
    assert.ok(texts.some(item=>item.value==="固執（攻擊+10%／特攻−10%）"));
    assert.ok(!texts.some(item=>/Beta|UI 尚未|尚未納入/.test(item.value)));
    assert.ok(texts.some(item=>item.value==="精靈模擬培養 · 模擬結果僅供參考"));
});
