import { TRAINING_STATS as STATS } from "../seer-training-core.js";
export function createTrainingExportData({pet, selected, query, name, resultMode, selectedSkin, advancedStats, vector}) {
        return {petName:name(pet),petId:pet.id,mode:resultMode === "base" ? "基礎" : resultMode,
            appearance:selectedSkin ? name(selectedSkin) : "原始外觀",
            nature:query("[data-nature]").selectedOptions[0].textContent.split(" · ")[0],
            iv:query("[data-iv]").value,hpTraining:query("[data-hp-training]").value,
            year:query("[data-year-bonus]").checked,
            raceVersion:advancedStats && query("[data-race-mode]").value === "advance" ? "神諭覺醒" : "一般種族值",
            stats:Object.fromEntries(STATS.map(([key])=>[key,query(`[data-result="${key}"]`).textContent])),
            ev:vector(query("[data-ev]")),team:vector(query("[data-extra]")),
            portrait:query(".training-pet img").src,
            art:query("[data-training-art]").hidden ? null : query("[data-training-art]").src,
            mintmarks:[0,1,2].map(i=>({id:selected.get(`mint${i}`)?.id,
                name:selected.has(`mint${i}`) ? name(selected.get(`mint${i}`)) : "未選擇",
                image:query(`[data-mint-slot="${i}"] img`)?.src})),
            suit:selected.has("suit") ? name(selected.get("suit")) : "未選擇",
            eye:selected.has("eye") ? name(selected.get("eye")) : "未選擇",
            title:selected.has("title") ? name(selected.get("title")) : "未選擇"};
}
