import { TRAINING_STATS, calculateTraining, trainingModes } from "../seer-training-core.js";
import { trainingSource, trainingDescription } from "./model.js";
import { mintmarkFinalStats } from "../seer-mintmark-stats.js";
import { teamLimits } from "./template.js";
import { canEquipMintmark } from "./mintmark-limit.js";

export const MAX_BUILD_LENGTH = 2048;
const keys = TRAINING_STATS.map(([key]) => key);
const fail = message => { throw new Error(message); };
export function validateShareConfig(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || value.v !== 1) fail("分享配置版本不支援。");
    const fields = ["v","pet","skin","nature","iv","ev","team","hp","year","mint","suit","eye","title","mode","awakened"];
    if (Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value,key))) fail("分享配置格式不完整。");
    const integer = (n,max,min = 0) => Number.isSafeInteger(n) && n >= min && n <= max;
    for (const key of ["pet","nature"]) if (!integer(value[key],99999999,1)) fail("分享配置 ID 無效。");
    for (const key of ["skin","suit","eye","title"]) if (value[key] !== null && !integer(value[key],99999999,1)) fail("分享配置 ID 無效。");
    if (!integer(value.iv,31) || !integer(value.hp,20)) fail("培養數值超出範圍。");
    for (const field of ["ev","team"]) {
        const vector = value[field];
        if (!vector || Object.keys(vector).length !== 6 || keys.some(key => !integer(vector[key],field === "ev" ? 255 : teamLimits[key]))) fail("六項培養數值無效。");
    }
    if (keys.reduce((sum,key) => sum + value.ev[key],0) > 510) fail("學習力總和不能超過 510。");
    if (!Array.isArray(value.mint) || value.mint.length !== 3 || value.mint.some(id => id !== null && !integer(id,99999999,1))) fail("刻印欄位無效。");
    if (typeof value.year !== "boolean" || typeof value.awakened !== "boolean" || !["base","PVE","PVP"].includes(value.mode)) fail("分享配置模式無效。");
    return value;
}
export function encodeShareConfig(config) {
    const encoded = btoa(JSON.stringify(validateShareConfig(config))).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
    if (encoded.length > MAX_BUILD_LENGTH) fail("分享配置過長。");
    return encoded;
}
export function decodeShareConfig(encoded) {
    if (typeof encoded !== "string" || !encoded.length || encoded.length > MAX_BUILD_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) fail("分享連結格式無效或過長。");
    try { return validateShareConfig(JSON.parse(atob(encoded.replaceAll("-","+").replaceAll("_","/")))); }
    catch(error) { throw new Error(`無法解析分享配置：${error.message}`); }
}
export function createShareUrl(href,config) {
    const url = new URL(href);
    url.search = ""; url.hash = "";
    url.searchParams.set("tab","training"); url.searchParams.set("build",encodeShareConfig(config));
    return url.href;
}

// Resolve and validate before touching the editor. API objects never enter the URL.
export async function resolveShareConfig(config,{fetchCached,suitHasEye}) {
    validateShareConfig(config);
    const get = async (resource,id) => {
        if (id === null) return null;
        const record = await fetchCached(`https://api.seerapi.com/v1/${resource}/${id}`);
        if (record?.id !== id || typeof record.name !== "string") fail(`${resource} #${id} 資料不存在或不完整。`);
        return record;
    };
    const [pet,skin,nature,suit,eye,title,...mint] = await Promise.all([
        get("pet",config.pet),get("pet_skin",config.skin),get("nature",config.nature),get("suit",config.suit),get("equip",config.eye),get("title",config.title),...config.mint.map(id => get("mintmark",id))
    ]);
    if (!pet.base_stats || keys.some(key => !Number.isFinite(pet.base_stats[key]))) fail("精靈種族值不完整。");
    if (skin && Number(skin.pet?.id) !== pet.id) fail("皮膚不屬於此精靈。");
    if (eye && Number(eye.part_type?.id) !== 1) fail("所選裝備不是目鏡。");
    const includedEye = suit ? await suitHasEye(suit) : false;
    if (includedEye && eye) fail("套裝已包含目鏡，無法另外裝備目鏡。");
    const selected = new Map(mint.map((record,i) => [`mint${i}`,record]));
    for (const [slot,record] of selected) if (record) {
        if (!record.max_attr_value || !canEquipMintmark(selected,slot,record)) fail("刻印資料或同系列數量無效。");
        if (record.pet?.length && !record.pet.some(item => Number(item.id ?? item) === pet.id)) fail("專屬刻印不適用於此精靈。");
    }
    let advance = null;
    if (pet.advance?.id != null) {
        advance = await fetchCached(`https://api.seerapi.com/v1/pet_advance/${pet.advance.id}`);
        if (keys.some(key => !Number.isFinite(advance.base_stats?.[key]))) fail("神諭覺醒資料不完整。");
    } else if (config.awakened) fail("此精靈不支援神諭覺醒。");
    const sources = mint.filter(Boolean).map(record => ({stats:mintmarkFinalStats(record),modes:["PVE","PVP"]}));
    for (const [kind,record] of [["eye",eye],["title",title]]) if (record) {
        if ((kind === "eye" ? record.bonus?.attribute : record.attr_bonus)?.percent) fail("此目鏡或稱號的百分比加成尚未支援。");
        const added = trainingSource(record,kind,item => item.name); if (added) sources.push(added);
    }
    sources.push({stats:config.team,modes:["PVE","PVP"]});
    if (config.year) sources.push({stats:Object.fromEntries(keys.map(key => [key,10])),modes:["PVE","PVP"]});
    for (const source of sources) if (!source.stats || keys.some(key => !Number.isInteger(source.stats[key]) || source.stats[key] < 0 || source.stats[key] > 9999)) fail("加成能力值需為 0～9999 的整數。");
    const eligible = !suit?.bonus?.effective_pets?.length || suit.bonus.effective_pets.some(item => Number(item.id ?? item) === pet.id);
    calculateTraining({race:config.awakened ? advance.base_stats : pet.base_stats,ev:config.ev,iv:config.iv,nature:nature.attributes || {},sources,suit:suit?.bonus?.attribute && eligible ? {stats:suit.bonus.attribute,modes:trainingModes(suit,trainingDescription(suit,"suit"))} : null,hpTraining:config.hp});
    return {pet,skin,nature,suit,eye,title,mint,advance,includedEye};
}

export function createShareRestorer({resolve,apply,onStatus}) {
    let version = 0;
    return {
        cancel() { version++; },
        async restore(encoded) {
            const request = ++version;
            onStatus("正在還原分享配置…");
            try {
                const config = decodeShareConfig(encoded), records = await resolve(config);
                if (request !== version) return;
                await apply(config,records,() => request === version);
                if (request === version) onStatus("分享配置已還原，可以繼續修改。");
            } catch(error) { if (request === version) onStatus(`分享配置還原失敗：${error.message}`); }
        }
    };
}
