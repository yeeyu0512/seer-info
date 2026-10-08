import test from "node:test";
import assert from "node:assert/strict";
import { createNavigation } from "../js/app/navigation.js";

test("direct routes, reload, history and tab switches coordinate build restoration",() => {
    const previousWindow=globalThis.window, previousDocument=globalThis.document;
    const element=()=>({hidden:true,querySelectorAll:()=>[],classList:{toggle(){}},setAttribute(){}});
    const elements=new Map(), listeners={},calls=[],entries=[];
    globalThis.document={getElementById:id=>{if (!elements.has(id)) elements.set(id,element());return elements.get(id);}};
    const location={href:"https://example.com/?tab=training&build=encoded",get search(){return new URL(this.href).search;}};
    globalThis.window={location,history:{pushState(_state,_title,url){entries.push(location.href);location.href=url.href;}},addEventListener:(type,callback)=>listeners[type]=callback};
    try {
        const navigation=createNavigation({primaryMainTabs:[],seerLookup:{getMode:()=>"pet",setMode(){},browseLatestIfEmpty(){}},votePanels:new Map(),sealEncyclopediaSection:element(),seerMintmarks:{load(){}},suitEncyclopediaSection:element(),seerSuits:{load(){}},typeChartSection:element(),trainingSection:element(),seerTraining:{load:()=>calls.push("load"),restoreBuild:build=>calls.push(build),cancelRestore:()=>calls.push("cancel")},accountSection:element(),votingSubTabs:element(),encyclopediaSubTabs:element(),loadCurrentCompetitivePool(){},getIsAdministrator:()=>false});
        navigation.restoreRouteFromUrl({initial:true});assert.deepEqual(calls,["load","encoded"]);
        navigation.restoreRouteFromUrl({initial:true});assert.equal(calls.at(-1),"encoded");
        navigation.activateTab("seer-lookup-section");assert.equal(new URL(location.href).searchParams.has("build"),false);assert.equal(new URL(location.href).searchParams.get("tab"),"pet");
        const forward=location.href;location.href=entries[0];listeners.popstate();assert.equal(calls.at(-1),"encoded");
        location.href=forward;listeners.popstate();assert.equal(calls.at(-1),"cancel");
        navigation.activateTab("training-section");assert.equal(new URL(location.href).searchParams.has("build"),false);
        location.href="https://example.com/?tab=training&build=encoded";navigation.activateTab("account-section");assert.equal(new URL(location.href).searchParams.has("build"),false);
    } finally {globalThis.window=previousWindow;globalThis.document=previousDocument;}
});
