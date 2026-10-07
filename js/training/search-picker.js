export function initTrainingSearchPickers({root, query, selected, name, simplified, fetchCached, choose, recalculate, onClearPet, onPetChosen}) {
    const API = "https://api.seerapi.com/v1/";
    for (const picker of root.querySelectorAll("[data-picker]")) {
        const id = picker.dataset.picker, resource = id.startsWith("mint") ? "mintmark" : id === "eye" ? "equip" : id;
        const label = id === "pet" ? "精靈" : id.startsWith("mint") ? "刻印" : id === "eye" ? "目鏡" : id === "suit" ? "套裝" : "稱號";
        picker.innerHTML = `<form class="training-search"><input type="search" aria-label="搜尋${label}" placeholder="搜尋${label}名稱或 ID…" autocomplete="off" required><button type="submit">搜尋</button></form><div class="training-selected" hidden><strong></strong><button type="button" aria-label="清除${label}">×</button></div><p class="training-search-status" role="status"></p><div class="training-options"></div>`;
        let version = 0;
        const input = picker.querySelector("input"), status = picker.querySelector(".training-search-status"), options = picker.querySelector(".training-options"), chosen = picker.querySelector(".training-selected");
        const clear = () => {
            version++; selected.delete(id); chosen.hidden = true; status.textContent = ""; options.replaceChildren();
            if (id === "pet") onClearPet();
            else if (id.startsWith("mint")) query(`[data-mint-values="${id.slice(4)}"]`).hidden = true;
            else query(`[data-effect="${id}"]`).textContent = "";
            recalculate();
        };
        chosen.querySelector("button").addEventListener("click", clear);
        if (id === "pet") query("[data-pet-clear]").addEventListener("click",clear);
        input.addEventListener("input", () => { version++; options.replaceChildren(); status.textContent = ""; });
        picker.querySelector("form").addEventListener("submit", async event => {
            event.preventDefault(); const term = input.value.trim(); if (!term) return;
            const request = ++version; options.replaceChildren(); status.textContent = "搜尋中…";
            try {
                const params = new URLSearchParams({name:simplified(term),limit:"20",expand:"true"});
                const data = await fetchCached(/^\d+$/.test(term) ? `${API}${resource}/${encodeURIComponent(term)}` : `${API}${resource}?${params}`);
                if (request !== version) return;
                const records = (data.results || (data.id != null ? [data] : Object.values(data.data || {}))).filter(record => id === "eye" ? Number(record.part_type?.id) === 1 : id.startsWith("mint") ? [0,3].includes(Number(record.type?.id)) && !record.is_hidden : true).sort((a,b) => b.id-a.id);
                status.textContent = records.length ? `找到 ${records.length} 筆，點擊選擇${data.count > 20 ? "；可輸入更完整名稱縮小結果" : ""}。` : `找不到符合的${label}。`;
                for (const record of records) {
                    const button = document.createElement("button"); button.type = "button"; button.textContent = `${name(record)} · #${record.id}`;
                    button.addEventListener("click", () => {
                        version++; chosen.hidden = false; chosen.querySelector("strong").textContent = name(record); options.replaceChildren(); status.textContent = ""; input.value = ""; choose(id,record); if (id === "pet") onPetChosen();
                        if (id.startsWith("mint") && record.pet?.length && !record.pet.some(p => p.id === selected.get("pet")?.id)) status.textContent = "此為專屬刻印，請確認所選精靈可使用。";
                    }); options.append(button);
                }
            } catch(error) { if (request === version) status.textContent = "搜尋失敗，請稍後再試或改用 ID。"; }
        });
    }
}
