export function initTrainingSearchPickers({root, query, selected, name, simplified, fetchCached, choose, recalculate, description}) {
    const API = "https://api.seerapi.com/v1/";
    const triggers = new Map();
    const availability = new Map();
    for (const [id,label] of [["eye","目鏡"],["title","稱號"]]) {
        const resource = id === "eye" ? "equip" : "title";
        const trigger = query(`[data-equipment-select="${id}"]`), remove = query(`[data-equipment-remove="${id}"]`);
        const dialog = document.createElement("dialog"); dialog.className = "training-mint-dialog training-equipment-dialog";
        dialog.dataset.equipmentDialog = id; dialog.setAttribute("aria-labelledby",`training-${id}-title`);
        dialog.innerHTML = `<div class="training-dialog-heading"><div><h3 id="training-${id}-title">選擇${label}</h3><p>搜尋名稱或 ID，選擇並套用能力加成。</p></div><button type="button" class="seer-pet-info-close" aria-label="關閉${label}選擇" data-equipment-close>×</button></div><div data-picker="${id}"><form class="training-choice-filters"><input type="search" aria-label="搜尋${label}" placeholder="搜尋${label}名稱或 ID…" autocomplete="off" required><button type="submit">搜尋</button></form><p class="training-search-status" role="status"></p><div class="training-choice-grid"></div></div>`;
        root.append(dialog);
        const input = dialog.querySelector("input"), status = dialog.querySelector("[role=status]"), grid = dialog.querySelector(".training-choice-grid");
        const note = document.createElement("p"); note.className = "training-hint"; note.hidden = true;
        const retry = document.createElement("button"); retry.type = "button"; retry.className = "secondary-button compact-button"; retry.textContent = "重新檢查"; retry.hidden = true; retry.dataset.eyeRetry = "";
        if (id === "eye") trigger.parentElement.after(note,retry);
        let version = 0, timer, composing = false;
        function updateTrigger() {
            trigger.replaceChildren(document.createTextNode(selected.has(id) ? `${name(selected.get(id))} · #${selected.get(id).id}` : `選擇${label}`));
            const arrow = document.createElement("span"); arrow.textContent = "›"; trigger.append(arrow); remove.hidden = !selected.has(id);
        }
        triggers.set(id,updateTrigger);
        availability.set(id,(enabled,message,retryCheck) => {
            trigger.disabled = !enabled; note.hidden = !message; note.textContent = message || "";
            retry.hidden = !retryCheck; retry.onclick = retryCheck || null;
            if (!enabled && dialog.open) dialog.close();
        });
        trigger.addEventListener("click",() => {input.value = ""; grid.replaceChildren(); status.textContent = `輸入${label}名稱或 ID 查找。`; dialog.showModal(); input.focus();});
        remove.addEventListener("click",() => {selected.delete(id); query(`[data-effect="${id}"]`).textContent = ""; updateTrigger(); recalculate();});
        dialog.querySelector("[data-equipment-close]").addEventListener("click",() => dialog.close());
        dialog.addEventListener("close",() => {version++; clearTimeout(timer); trigger.focus({preventScroll:true});});
        input.addEventListener("input",() => {version++; clearTimeout(timer); grid.replaceChildren(); status.textContent = ""; if (input.value.trim() && !composing) timer = setTimeout(search,400);});
        input.addEventListener("compositionstart",() => {composing = true; version++; clearTimeout(timer);});
        input.addEventListener("compositionend",() => {composing = false; input.dispatchEvent(new Event("input"));});
        dialog.querySelector("form").addEventListener("submit",event => {event.preventDefault(); clearTimeout(timer); if (!composing) search();});
        async function search() {
            const term = input.value.normalize("NFKC").trim(); if (!term) return;
            const request = ++version; grid.replaceChildren(); status.textContent = "搜尋中…";
            try {
                const params = new URLSearchParams({name:simplified(term),limit:"20",expand:"true"});
                const data = await fetchCached(/^\d+$/.test(term) ? `${API}${resource}/${encodeURIComponent(term)}` : `${API}${resource}?${params}`);
                if (request !== version || !dialog.open) return;
                const records = (data.results || (data.id != null ? [data] : Object.values(data.data || {}))).filter(record => id !== "eye" || Number(record.part_type?.id) === 1).sort((a,b) => b.id-a.id);
                status.textContent = records.length ? `找到 ${records.length} 筆，點擊選擇${data.count > 20 ? "；請輸入更完整名稱縮小結果" : ""}。` : `找不到符合的${label}。`;
                for (const record of records) {
                    const button = document.createElement("button"); button.type = "button"; button.className = "training-choice-card";
                    const info = document.createElement("span"), title = document.createElement("strong"), meta = document.createElement("small"), detail = document.createElement("p");
                    title.textContent = name(record); meta.textContent = `#${record.id}`; detail.textContent = description(record,id);
                    info.append(title,meta,detail); button.append(info); grid.append(button);
                    button.addEventListener("click",() => {version++; choose(id,record); updateTrigger(); dialog.close();});
                }
            } catch(error) {if (request === version && dialog.open) status.textContent = /404/.test(error.message) ? `找不到此編號的${label}，請確認 ID。` : "搜尋失敗，請稍後再試或改用 ID。";}
        }
    }
    return {sync(id) {triggers.get(id)?.();},setAvailability(id,enabled,message,retry) {availability.get(id)?.(enabled,message,retry);}};
}
