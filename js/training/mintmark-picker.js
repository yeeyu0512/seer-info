import { openDialog, closeDialog, getDialogSession } from "../shared/dialog-motion.js";
import { TRAINING_STATS as STATS } from "../seer-training-core.js";
import { mintmarkCornerCount, selectMintmarks } from "../data/mintmark-catalog.js";
import { mintmarkSnapshot } from "../data/mintmark-snapshot.js";
import { observeMintmarkImage, unobserveMintmarkImages } from "../seer-mintmark-images.js";
import { mintmarkFinalStats } from "../seer-mintmark-stats.js";
import { canEquipMintmark } from "./mintmark-limit.js";
import { createMintmarkSeriesSearch } from "../data/mintmark-series-search.js";
import { getSeerServerSettings } from "../seer-server-settings.js";
import { isTaiwanExcluded } from "../shared/taiwan-availability.js";
export function createTrainingMintmarkPicker({root, query, selected, name, traditional, simplified, choose, recalculate, bindTaiwanProgressToggle}) {
    const mintDialog = query(".training-mint-dialog"), mintGrid = query(".training-dialog-grid");
    let mintCatalog = [], mintPending, mintSlot = 0, mintPage = 1, mintReady = false, slotInvoker;
    const mintSearch = mintDialog.querySelector("input"), mintCorners = mintDialog.querySelector('select[aria-label="刻印角數"]'), mintSeries = mintDialog.querySelector('select[aria-label="刻印系列"]');
    const seriesSearch = createMintmarkSeriesSearch(mintDialog.querySelector('[data-training-series-combobox]'));
    const mintSort = mintDialog.querySelector('select[aria-label="刻印排序"]');
    const taiwanOnly = query("[data-mint-taiwan-only]");
    const status = query("[data-mint-dialog-status]"), retry = query("[data-mint-dialog-retry]");
    const previous = query("[data-mint-prev]"), next = query("[data-mint-next]");
    let taiwanSettings, settingsPending, settingsError;
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
        if (!mintReady || !getDialogSession(mintDialog)) return;
        unobserveMintmarkImages(mintGrid); mintGrid.replaceChildren();
        const settings = taiwanOnly.checked ? taiwanSettings : null;
        if (taiwanOnly.checked && !settings) {
            status.textContent = settingsError || "正在讀取台服刻印進度…";
            previous.disabled = next.disabled = true;
            retry.hidden = !settingsError;
            return;
        }
        retry.hidden = true;
        const key = simplified(mintSearch.value.trim()).toLocaleLowerCase(), pet = selected.get("pet");
        const eligible = mintCatalog.filter(record => [0,3].includes(Number(record.type?.id))
            && !isTaiwanExcluded(record.id, settings?.excludedRanges?.mintmark)
            && (!record.pet?.length || (pet && record.pet.some(item => Number(item.id ?? item) === pet.id))));
        const filtered = selectMintmarks(eligible, {query:key, type:"all", showExclusive:true,
            maxId:settings?.latestMintmarkId ?? null,
            corners:mintCorners.value, series:mintSeries.value, sort:mintSort.value});
        const pages = Math.max(1,Math.ceil(filtered.length/12)); mintPage = Math.min(mintPage,pages);
        const progress = settings ? ` · 台服進度至 #${settings.latestMintmarkId}` : "";
        status.textContent = `${filtered.length} 個可選刻印${progress}${pet ? " · 已排除其他精靈的專屬刻印" : " · 先選精靈可查看對應專屬刻印"}`;
        for (const record of filtered.slice((mintPage-1)*12,mintPage*12)) {
            const button = document.createElement("button"); button.type = "button"; button.className = "training-dialog-mint";
            const icon = document.createElement("span"); icon.className = "training-mint-icon";
            const info = document.createElement("span"), title = document.createElement("strong"), meta = document.createElement("small"), stats = document.createElement("small");
            title.textContent = name(record); meta.textContent = `#${record.id} · ${Number(record.type?.id) === 3 ? "全能" : "能力"}刻印${mintmarkCornerCount(record) ? ` · ${mintmarkCornerCount(record)}角` : ""}`;
            const finalStats = mintmarkFinalStats(record);
            stats.textContent = STATS.filter(([key]) => finalStats?.[key]).map(([key,label]) => `${label} ${finalStats[key]}`).join(" / ");
            info.append(title,meta,stats); button.append(icon,info); mintGrid.append(button); observeMintmarkImage(icon,record.id);
            if (!canEquipMintmark(selected,`mint${mintSlot}`,record)) {
                button.disabled = true;
                const limit = document.createElement("small"); limit.className = "training-mint-limit";
                limit.textContent = "同系列已裝滿（最多 2 個）"; info.append(limit);
            }
            button.addEventListener("click",() => {
                if (!getDialogSession(mintDialog)) return;
                if (!canEquipMintmark(selected,`mint${mintSlot}`,record)) {
                    status.textContent = "每隻精靈最多裝備 2 個同系列刻印，請改選其他系列。";
                    return;
                }
                choose(`mint${mintSlot}`,record); closeDialog(mintDialog);
            });
        }
        query(".training-dialog-pagination span").textContent = `${mintPage} / ${pages}`;
        previous.disabled = mintPage === 1; next.disabled = mintPage === pages;
    }
    function loadTaiwanSettings() {
        if (!taiwanOnly.checked || taiwanSettings || settingsPending) return;
        settingsError = "";
        settingsPending = getSeerServerSettings().then(settings => {
            if (!Number.isSafeInteger(settings.latestMintmarkId) || settings.latestMintmarkId < 1) {
                settingsError = "後台尚未設定台服最新刻印編號，可取消篩選查看全部。";
                return;
            }
            taiwanSettings = settings;
        }).catch(() => {
            settingsError = "台服刻印進度讀取失敗，請重新載入，或取消篩選查看全部。";
        }).finally(() => {
            settingsPending = null;
            if (taiwanOnly.checked) renderMintChoices();
        });
    }
    async function loadMintChoices() {
        loadTaiwanSettings();
        if (mintReady) { renderMintChoices(); return; }
        previous.disabled = next.disabled = true;
        retry.hidden = true;
        if (!mintPending) {
            const generalPending = mintmarkSnapshot.lists(["general"]).then(({series, records}) => {
                seriesSearch.setOptions([{value:"all",label:"全部系列"},...series.map(item => ({value:String(item.id),label:traditional(item.name)}))]);
                return records;
            }).catch(error => {seriesSearch.setError("系列載入失敗，請重試。"); throw error;});
            // Ability and exclusive records need their bound-pet data, which compact lists omit.
            mintPending = Promise.all([generalPending, mintmarkSnapshot.fullRecords(["ability", "exclusive"])]).then(([general, full]) => {
                mintCatalog = [...general, ...full];
                mintReady = true;
            }).catch(() => { mintPending = null; if (getDialogSession(mintDialog)) { status.textContent = "刻印資料載入失敗，請重試。"; retry.hidden = false; } });
        }
        status.textContent = "正在載入刻印資料…";
        await mintPending; renderMintChoices();
    }
    for (const button of root.querySelectorAll("[data-mint-slot]")) button.addEventListener("click",() => {
        mintSlot = Number(button.dataset.mintSlot); slotInvoker = button; mintPage = 1;
        query("#training-mint-title").textContent = `選擇刻印 ${mintSlot+1}`;
        openDialog(mintDialog); mintSearch.focus(); loadMintChoices();
    });
    for (const button of root.querySelectorAll("[data-mint-clear]")) button.addEventListener("click",() => {
        const index = Number(button.dataset.mintClear); selected.delete(`mint${index}`); renderMintSlot(index); recalculate();
    });
    query("[data-mint-dialog-close]").addEventListener("click",() => closeDialog(mintDialog));
    mintDialog.addEventListener("close",() => { if (mintDialog.open) return; unobserveMintmarkImages(mintGrid); mintGrid.replaceChildren(); slotInvoker?.focus({preventScroll:true}); });
    for (const element of [mintSearch,mintCorners,mintSeries,mintSort]) element.addEventListener(element === mintSearch ? "input" : "change",() => { mintPage = 1; renderMintChoices(); });
    bindTaiwanProgressToggle(taiwanOnly,() => {
        if (!getDialogSession(mintDialog)) return;
        mintPage = 1;
        loadTaiwanSettings();
        renderMintChoices();
    });
    previous.addEventListener("click",() => { mintPage--; renderMintChoices(); });
    next.addEventListener("click",() => { mintPage++; renderMintChoices(); });
    retry.addEventListener("click",loadMintChoices);
    return { renderMintSlot };
}
