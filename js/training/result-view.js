import { mintmarkFinalStats } from "../seer-mintmark-stats.js";
import { TRAINING_STATS as STATS, calculateTraining, trainingModes } from "../seer-training-core.js";
export function createTrainingResultView({query, vector, selected, name, source, description, activeRace, getNatures, getAdvancedStats, getResultMode, getEyeState = () => "free"}) {
function recalculate() {
        const ev = vector(query("[data-ev]"));
        const total = STATS.reduce((sum,[key]) => sum + (ev[key] || 0), 0);
        query("[data-ev-total]").textContent = `${total} / 510`;
        query("[data-ev-total]").classList.toggle("is-invalid", total > 510);
        const pet = selected.get("pet");
        const sources = [0,1,2].filter(i => selected.has(`mint${i}`)).map(i => ({label:`刻印 ${i+1} · ${name(selected.get(`mint${i}`))}`,stats:mintmarkFinalStats(selected.get(`mint${i}`)),modes:["PVE","PVP"]}));
        for (const kind of ["eye","title"]) { const record = selected.get(kind); if (record) { const added = source(record, kind); if (added) sources.push(added); } }
        sources.push({label:"戰隊加成", stats:vector(query("[data-extra]")),modes:["PVE","PVP"]});
        if (query("[data-year-bonus]").checked) sources.push({label:"年費加成",stats:Object.fromEntries(STATS.map(([key]) => [key,10])),modes:["PVE","PVP"]});
        const suitRecord = selected.get("suit");
        const suitPetIds = suitRecord?.bonus?.effective_pets || [];
        const suitEligible = !suitPetIds.length || suitPetIds.some(item => Number(item.id ?? item) === pet?.id);
        const suit = suitRecord?.bonus?.attribute && suitEligible ? {stats:suitRecord.bonus.attribute,modes:trainingModes(suitRecord,description(suitRecord,"suit"))} : null;
        const breakdown = query("[data-breakdown]"); breakdown.replaceChildren();
        for (const added of sources) {
            if (!STATS.some(([key]) => added.stats[key])) continue;
            const p = document.createElement("p"); p.textContent = `${added.label}：${STATS.filter(([key]) => added.stats[key]).map(([key,label]) => `${label} +${added.stats[key]}`).join("、")}（${added.modes.join("／") || "無有效模式"}）`; breakdown.append(p);
        }
        if (suit) { const p = document.createElement("p"); p.textContent = `${name(suitRecord)}：${STATS.filter(([key]) => suit.stats[key]).map(([key,label]) => `${label} +${suit.stats[key]}${suit.stats.percent ? "%" : ""}`).join("、")}（${suit.modes.join("／")}）`; breakdown.append(p); }
        const hpTraining = query("[data-hp-training]").value === "" ? NaN : Number(query("[data-hp-training]").value);
        if (hpTraining > 0) { const p = document.createElement("p"); p.textContent = `體力上限培養：體力 +${hpTraining}（PVE／PVP；於套裝加成後加入）`; breakdown.append(p); }
        let result;
        query("[data-result-name]").textContent = pet ? `${name(pet)}${getAdvancedStats() ? ` · ${query("[data-race-mode]").value === "advance" ? "神諭覺醒" : "覺醒前"}` : ""}` : "尚未選擇精靈";
        query("[data-error]").textContent = "";
        if (pet) {
            try {
                if (getResultMode() !== "base" && ["pending","unknown"].includes(getEyeState())) throw new Error(getEyeState() === "pending" ? "正在檢查套裝目鏡部件…" : "套裝部件尚未確認，請重新檢查。");
                for (const id of ["mint0","mint1","mint2"]) {
                    const record = selected.get(id);
                    if (record?.pet?.length && !record.pet.some(item => Number(item.id ?? item) === pet.id)) throw new Error(`${name(record)}為專屬刻印，所選精靈不符合使用限制。`);
                }
                for (const added of sources) for (const [key] of STATS) if (!Number.isInteger(added.stats[key]) || added.stats[key] < 0 || added.stats[key] > 9999) throw new Error("加成能力值需為 0～9999 的整數。");
                if (selected.get("title")?.attr_bonus?.percent || selected.get("eye")?.bonus?.attribute?.percent) throw new Error("此稱號或目鏡含百分比能力加成，Beta 版尚未支援其結算方式，請改選或清除。");
                result = calculateTraining({race:activeRace(),ev,iv:query("[data-iv]").value === "" ? NaN : Number(query("[data-iv]").value),nature:getNatures().find(item => String(item.id) === query("[data-nature]").value)?.attributes || {},sources,suit,hpTraining});
            } catch(error) { query("[data-error]").textContent = error.message; }
        }
        for (const [key] of STATS) query(`[data-result="${key}"]`).textContent = result ? result[getResultMode()][key] : "—";
    }
    return {recalculate};
}
