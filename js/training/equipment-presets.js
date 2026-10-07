export const EQUIPMENT_PRESETS = Object.freeze([
    {name:"晨曦神話",items:[
        {kind:"suit",resource:"suit",id:447,name:"晨曦之星戰甲"},
        {kind:"eye",resource:"equip",id:1301040,name:"漫遊者-AH"},
        {kind:"title",resource:"title",id:300,name:"神話"}
    ]},
    {name:"晨曦歲業",items:[
        {kind:"suit",resource:"suit",id:447,name:"晨曦之星戰甲"},
        {kind:"eye",resource:"equip",id:1301040,name:"漫遊者-AH"},
        {kind:"title",resource:"title",id:572,name:"歲業祓除"}
    ]},
    {name:"台服裁決",items:[
        {kind:"suit",resource:"suit",id:462,name:"影翼裁決"},
        {kind:"eye",resource:"equip",id:1301040,name:"漫遊者-AH"},
        {kind:"title",resource:"title",id:494,name:"星光之旅"}
    ]},
    {name:"陸服裁決",items:[
        {kind:"suit",resource:"suit",id:462,name:"影翼裁決"},
        {kind:"eye",resource:"equip",id:1301040,name:"漫遊者-AH"},
        {kind:"title",resource:"title",id:591,name:"星光鑄就者"}
    ]}
]);

export async function loadEquipmentPreset(preset,fetchCached) {
    const records = await Promise.all(preset.items.map(async item => {
        const record = await fetchCached(`https://api.seerapi.com/v1/${item.resource}/${item.id}`);
        if (Number(record.id) !== item.id || !record.name || (item.kind === "eye" && Number(record.part_type?.id) !== 1)) throw new Error(`${item.name}資料無效`);
        return [item.kind,record];
    }));
    return records;
}

export function initEquipmentPresets(root,{fetchCached,apply}) {
    const trigger = root.querySelector("[data-equipment-presets]");
    const dialog = document.createElement("dialog"); dialog.className = "training-mint-dialog training-presets-dialog";
    dialog.setAttribute("aria-labelledby","training-presets-title");
    dialog.innerHTML = `<div class="training-dialog-heading"><div><h3 id="training-presets-title">常用組合</h3><p>一次套用套裝、目鏡與稱號；精靈與培養設定保持不變。</p></div><button type="button" class="seer-pet-info-close" aria-label="關閉常用組合">×</button></div><div class="training-choice-grid"></div><p class="training-search-status" role="status"></p>`;
    root.append(dialog);
    const grid = dialog.querySelector(".training-choice-grid"), status = dialog.querySelector("[role=status]");
    let version = 0;
    for (const preset of EQUIPMENT_PRESETS) {
        const button = document.createElement("button"); button.type = "button"; button.className = "training-choice-card";
        const info = document.createElement("span"), title = document.createElement("strong"); title.textContent = preset.name; info.append(title);
        for (const item of preset.items) {const line = document.createElement("small"); line.textContent = `${item.name} · #${item.id}`; info.append(line);}
        const action = document.createElement("span"); action.className = "training-preset-action"; action.textContent = "套用 ›";
        button.append(info,action); grid.append(button);
        button.addEventListener("click",async () => {
            const request = ++version; button.disabled = true; status.textContent = "正在載入組合裝備…";
            try {const records = await loadEquipmentPreset(preset,fetchCached); if (request !== version || !dialog.open) return; await apply(records,() => request === version && dialog.open); if (request === version && dialog.open) dialog.close();}
            catch {if (request === version && dialog.open) status.textContent = "組合資料載入失敗，原本裝備保持不變，請再試一次。";}
            finally {button.disabled = false;}
        });
    }
    trigger.addEventListener("click",() => {version++; status.textContent = ""; dialog.showModal();});
    dialog.querySelector(".seer-pet-info-close").addEventListener("click",() => dialog.close());
    dialog.addEventListener("close",() => {version++; trigger.focus({preventScroll:true});});
}
