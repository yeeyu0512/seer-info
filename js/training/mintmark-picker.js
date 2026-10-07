import { TRAINING_STATS as STATS } from "../seer-training-core.js";
import { fetchMintmarkCatalog, fetchMintmarkSeries, mintmarkCornerCount } from "../data/mintmark-catalog.js";
import { observeMintmarkImage, unobserveMintmarkImages } from "../seer-mintmark-images.js";
import { mintmarkFinalStats } from "../seer-mintmark-stats.js";
export function createTrainingMintmarkPicker({root, query, selected, name, traditional, simplified, fetchCached, choose, recalculate}) {
    const mintDialog = query(".training-mint-dialog"), mintGrid = query(".training-dialog-grid");
    let mintCatalog = [], mintPending, mintSlot = 0, mintPage = 1, mintReady = false, slotInvoker;
    const mintSearch = mintDialog.querySelector("input"), mintCorners = mintDialog.querySelector('[aria-label="刻印角數"]'), mintSeries = mintDialog.querySelector('[aria-label="刻印系列"]');
    function renderMintSlot(index) {
        const slot = query(`[data-mint-slot="${index}"]`), record = selected.get(`mint${index}`);
        unobserveMintmarkImages(slot);
        const oldIcon = slot.querySelector(".training-mint-icon"), icon = document.createElement("span"); icon.className = "training-mint-icon"; oldIcon.replaceWith(icon);
        slot.querySelector("strong").textContent = record ? name(record) : "選擇刻印";
        slot.querySelector("small").textContent = record ? `#${record.id}` : `刻印 ${index+1}`;
        slot.classList.toggle("has-mint",Boolean(record));
        query(`[data-mint-clear="${index}"]`).hidden = !record;
        if (record) observeMintmarkImage(icon,record.id); else icon.textContent = "＋";
    }
    function renderMintChoices() {
        if (!mintReady || !mintDialog.open) return;
        const key = simplified(mintSearch.value.trim()).toLocaleLowerCase(), pet = selected.get("pet");
        const filtered = mintCatalog.filter(record => [0,3].includes(Number(record.type?.id)) && !record.is_hidden
            && (!record.pet?.length || (pet && record.pet.some(item => Number(item.id ?? item) === pet.id)))
            && (!key || String(record.id).includes(key) || record.name.toLocaleLowerCase().includes(key))
            && (mintCorners.value === "all" || mintmarkCornerCount(record) === Number(mintCorners.value))
            && (mintSeries.value === "all" || String(record.mintmark_class?.id) === mintSeries.value)).sort((a,b) => b.id-a.id);
        const pages = Math.max(1,Math.ceil(filtered.length/12)); mintPage = Math.min(mintPage,pages);
        unobserveMintmarkImages(mintGrid); mintGrid.replaceChildren();
        query("[data-mint-dialog-status]").textContent = `${filtered.length} 個可選刻印${pet ? " · 已排除其他精靈的專屬刻印" : " · 先選精靈可查看對應專屬刻印"}`;
        for (const record of filtered.slice((mintPage-1)*12,mintPage*12)) {
            const button = document.createElement("button"); button.type = "button"; button.className = "training-dialog-mint";
            const icon = document.createElement("span"); icon.className = "training-mint-icon";
            const info = document.createElement("span"), title = document.createElement("strong"), meta = document.createElement("small"), stats = document.createElement("small");
            title.textContent = name(record); meta.textContent = `#${record.id} · ${Number(record.type?.id) === 3 ? "全能" : "能力"}刻印${mintmarkCornerCount(record) ? ` · ${mintmarkCornerCount(record)}角` : ""}`;
            const finalStats = mintmarkFinalStats(record);
            stats.textContent = STATS.filter(([key]) => finalStats?.[key]).map(([key,label]) => `${label} ${finalStats[key]}`).join(" / ");
            info.append(title,meta,stats); button.append(icon,info); mintGrid.append(button); observeMintmarkImage(icon,record.id);
            button.addEventListener("click",() => { choose(`mint${mintSlot}`,record); mintDialog.close(); });
        }
        query(".training-dialog-pagination span").textContent = `${mintPage} / ${pages}`;
        query("[data-mint-prev]").disabled = mintPage === 1; query("[data-mint-next]").disabled = mintPage === pages;
    }
    async function loadMintChoices() {
        if (mintReady) { renderMintChoices(); return; }
        query("[data-mint-prev]").disabled = true; query("[data-mint-next]").disabled = true;
        query("[data-mint-dialog-retry]").hidden = true;
        if (!mintPending) mintPending = Promise.all([fetchMintmarkCatalog(fetchCached,(count,total) => { if (mintDialog.open) query("[data-mint-dialog-status]").textContent = `載入刻印資料 ${count} / ${total ?? "…"}`; }),fetchMintmarkSeries(fetchCached)]).then(([records,series]) => {
            mintCatalog = records; mintReady = true;
            for (const item of series) mintSeries.append(new Option(traditional(item.name),String(item.id)));
        }).catch(error => { mintPending = null; if (mintDialog.open) { query("[data-mint-dialog-status]").textContent = "刻印資料載入失敗，請重試。"; query("[data-mint-dialog-retry]").hidden = false; } });
        query("[data-mint-dialog-status]").textContent = "正在載入刻印資料…";
        await mintPending; renderMintChoices();
    }
    for (const button of root.querySelectorAll("[data-mint-slot]")) button.addEventListener("click",() => {
        mintSlot = Number(button.dataset.mintSlot); slotInvoker = button; mintPage = 1;
        query("#training-mint-title").textContent = `選擇刻印 ${mintSlot+1}`;
        mintDialog.showModal(); mintSearch.focus(); loadMintChoices();
    });
    for (const button of root.querySelectorAll("[data-mint-clear]")) button.addEventListener("click",() => {
        const index = Number(button.dataset.mintClear); selected.delete(`mint${index}`); renderMintSlot(index); recalculate();
    });
    query("[data-mint-dialog-close]").addEventListener("click",() => mintDialog.close());
    mintDialog.addEventListener("close",() => { unobserveMintmarkImages(mintGrid); mintGrid.replaceChildren(); slotInvoker?.focus({preventScroll:true}); });
    for (const element of [mintSearch,mintCorners,mintSeries]) element.addEventListener(element === mintSearch ? "input" : "change",() => { mintPage = 1; renderMintChoices(); });
    query("[data-mint-prev]").addEventListener("click",() => { mintPage--; renderMintChoices(); });
    query("[data-mint-next]").addEventListener("click",() => { mintPage++; renderMintChoices(); });
    query("[data-mint-dialog-retry]").addEventListener("click",loadMintChoices);
    return { renderMintSlot };
}
