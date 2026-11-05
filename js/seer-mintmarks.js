import { openDialog, closeDialog } from "./shared/dialog-motion.js";
import { selectMintmarks } from "./data/mintmark-catalog.js";
import { isTaiwanExcluded } from "./shared/taiwan-availability.js";
import { bindTaiwanProgressToggle, setTaiwanProgressOnly } from "./shared/taiwan-progress-toggle.js";
export { mintmarkCornerCount, selectMintmarks, fetchMintmarkSeries, fetchMintmarkCatalog } from "./data/mintmark-catalog.js";
import { createMintmarkSeriesSearch } from "./data/mintmark-series-search.js";
import { observeMintmarkImage, unobserveMintmarkImages } from "./seer-mintmark-images.js";
import { downloadMintmarkWorkbook } from "./seer-mintmark-export.js";
import { mintmarkFinalStats } from "./seer-mintmark-stats.js";
import { mintmarkSnapshot as snapshot, mintmarkCategories } from "./data/mintmark-snapshot.js";

const TYPES = { 0: "能力刻印", 1: "技能刻印", 3: "全能刻印" };
const STATS = [["atk", "攻擊"], ["sp_atk", "特攻"], ["def", "防禦"], ["sp_def", "特防"], ["spd", "速度"], ["hp", "體力"]];
const PAGE_SIZE = 24;

export function initSeerMintmarks(root, { convertToTraditionalChinese = value => value, getSeerServerSettings }) {
    const content = root.querySelector("#seal-encyclopedia-content");
    content.innerHTML = `<div class="seal-toolbar">
        <label class="seal-search">名稱或 ID<input type="search" placeholder="搜尋刻印…" autocomplete="off"></label>
        <div class="seal-series-filter"><label for="seal-series-search">系列</label><div class="mint-series-combobox" data-seal-series-combobox><input id="seal-series-search" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" value="全部系列" placeholder="搜尋或選擇系列…"><div class="mint-series-options" role="listbox" hidden></div><select data-seal-series hidden aria-hidden="true" tabindex="-1"><option value="all">全部系列</option></select></div></div>
        <label>分類<select data-seal-type><option value="3">全能刻印</option><option value="0">能力刻印</option><option value="1">技能刻印</option><option value="all">全部刻印</option></select></label>
        <label>排序<select data-seal-sort><option value="id">ID 由大到小</option><option value="total">能力總和</option>${STATS.map(([key, label]) => `<option value="${key}">${label}由高到低</option>`).join("")}</select></label>
    </div><div class="seal-filter-options">
        <div class="seal-corner-filter" role="group" aria-label="角數" title="能力與全能刻印依非零能力項目數計算"><span>角數</span><div class="seal-corner-buttons">${[["all", "全部"], [2, "二角"], [3, "三角"], [4, "四角"], [5, "五角"]].map(([count, label]) => `<button type="button" data-seal-corner="${count}" aria-pressed="${count === "all"}">${label}</button>`).join("")}</div></div>
        <div class="seal-filter-toggles"><label class="seal-exclusive-toggle"><input type="checkbox" data-seal-exclusive>顯示專屬刻印</label></div>
    </div><div class="seal-status-row"><p class="seal-status" role="status" aria-live="polite"></p><button type="button" data-seal-retry hidden>重新載入</button><button type="button" class="seal-export-button" data-seal-export disabled title="匯出符合目前條件的全部結果，按系列分組並合併儲存格">匯出 Excel</button></div><p class="seal-export-feedback" role="status" aria-live="polite" hidden></p>
    <div class="seal-grid"></div><nav class="seal-pagination" aria-label="刻印分頁" hidden><button type="button" data-seal-prev>上一頁</button><span></span><button type="button" data-seal-next>下一頁</button></nav>`;
    const input = content.querySelector("input");
    const type = content.querySelector("[data-seal-type]");
    const sort = content.querySelector("[data-seal-sort]");
    const cornerButtons = [...content.querySelectorAll("[data-seal-corner]")];
    const series = content.querySelector("[data-seal-series]");
    const seriesSearch = createMintmarkSeriesSearch(content.querySelector("[data-seal-series-combobox]"));
    const exclusive = content.querySelector("[data-seal-exclusive]");
    const taiwanOnly = root.querySelector("#seal-taiwan-progress-only");
    if (taiwanOnly) content.querySelector(".seal-filter-toggles").prepend(taiwanOnly.closest("label"));
    const status = content.querySelector(".seal-status");
    const grid = content.querySelector(".seal-grid");
    const pagination = content.querySelector(".seal-pagination");
    const retry = content.querySelector("[data-seal-retry]");
    const exportButton = content.querySelector("[data-seal-export]");
    const exportFeedback = content.querySelector(".seal-export-feedback");
    const previous = content.querySelector("[data-seal-prev]");
    const next = content.querySelector("[data-seal-next]");
    const dialog = document.createElement("dialog");
    dialog.className = "seal-dialog";
    dialog.setAttribute("aria-labelledby", "seal-detail-title");
    document.body.append(dialog);
    let records = [];
    let pending = null;
    let loaded = false;
    let page = 1;
    let latestMintmarkId = null;
    let excludedMintmarkRanges = [];
    let settingsPending = null;
    let settingsMessage = "正在讀取台服刻印進度…";
    let seriesNames = new Map();
    let selectedCorners = "all";
    let exporting = false;
    let loadRequest = 0, loadKey = '', pendingKey = '', loadError = false;
    let detailRequest = 0;
    const localizeRecords = catalog => catalog.map(record => ({ ...record, searchName: record.name, name: convertToTraditionalChinese(record.name) }));

    function currentMatches() {
        const eligible = taiwanOnly?.checked ? records.filter(record => !isTaiwanExcluded(record.id, excludedMintmarkRanges)) : records;
        return selectMintmarks(eligible, { query: input.value, type: type.value, sort: sort.value, corners: selectedCorners, series: series.value, showExclusive: exclusive.checked, maxId: taiwanOnly?.checked ? latestMintmarkId : null });
    }
    exportButton.addEventListener("click", async () => {
        if (exporting || !loaded || (taiwanOnly?.checked && latestMintmarkId === null)) return;
        const matches = currentMatches();
        const exportSeriesNames = new Map(seriesNames);
        if (!matches.length) return;
        const filterDescription = [type.selectedOptions[0].textContent, selectedCorners !== "all" ? `${selectedCorners} 角` : "", series.value !== "all" ? series.selectedOptions[0].textContent : "", input.value.trim() ? `搜尋：${input.value.trim()}` : "", exclusive.checked ? "包含專屬刻印" : "排除專屬全能刻印", taiwanOnly?.checked ? `台服進度至 #${latestMintmarkId}` : ""].filter(Boolean).join("／");
        exporting = true;
        exportButton.disabled = true;
        exportButton.textContent = "匯出中…";
        exportFeedback.hidden = false;
        exportFeedback.textContent = "正在補齊完整刻印資料並產生 Excel，請稍候。";
        try {
            const complete = localizeRecords(await snapshot.complete(matches));
            await downloadMintmarkWorkbook(complete, exportSeriesNames, { filterDescription });
            exportFeedback.textContent = `已產生 ${matches.length.toLocaleString()} 筆刻印的 Excel，請查看瀏覽器下載。`;
        } catch (error) {
            console.error("Mintmark export error:", error);
            exportFeedback.textContent = "Excel 匯出失敗，請檢查網路後再試一次。";
        } finally {
            exporting = false;
            exportButton.textContent = "匯出 Excel";
            render();
        }
    });

    function updateCornerButtons() {
        cornerButtons.forEach(button => {
            button.disabled = type.value === "1";
            button.setAttribute("aria-pressed", String(button.dataset.sealCorner === selectedCorners));
        });
    }
    cornerButtons.forEach(button => button.addEventListener("click", () => {
        selectedCorners = button.dataset.sealCorner;
        page = 1;
        updateCornerButtons();
        if (loaded) render();
    }));

    function populateSeries() {
        const ids = [...new Set([...seriesNames.keys(), ...records.map(record => record.mintmark_class?.id)].filter(id => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b);
        const choices = [{value:"all",label:"全部系列"},...ids.map(id => ({value:String(id),label:seriesNames.get(id) || `系列 #${id}`}))];
        choices.push({value:"none",label:"未分類"});
        seriesSearch.setOptions(choices);
    }

    function imageSlot(record) {
        const slot = document.createElement("span");
        slot.className = "seal-image-slot";
        slot.setAttribute("aria-label", "刻印圖片尚未提供");
        slot.textContent = "◇";
        observeMintmarkImage(slot, record.id);
        return slot;
    }
    function stats(record, values = mintmarkFinalStats(record)) {
        const list = document.createElement("dl");
        list.className = "seal-stats";
        STATS.forEach(([key, label]) => {
            const pair = document.createElement("div");
            const term = document.createElement("dt");
            term.textContent = label;
            const value = document.createElement("dd");
            value.textContent = values ? `${values[key] ?? 0}${values.percent ? "%" : ""}` : "—";
            pair.append(term, value);
            list.append(pair);
        });
        return list;
    }
    function detail(record) {
        unobserveMintmarkImages(dialog);
        dialog.replaceChildren();
        const header = document.createElement("div");
        header.className = "seal-detail-header";
        const title = document.createElement("h2");
        title.id = "seal-detail-title";
        title.textContent = record.name;
        const close = document.createElement("button");
        close.type = "button";
        close.textContent = "×";
        close.setAttribute("aria-label", "關閉刻印詳情");
        close.addEventListener("click", () => closeDialog(dialog));
        const identity = document.createElement("div");
        identity.className = "seal-detail-identity";
        const meta = document.createElement("p");
        meta.className = "seal-meta";
        meta.textContent = `#${record.id} · ${TYPES[record.type?.id] || "刻印"}`;
        identity.append(title, meta);
        header.append(imageSlot(record), identity, close);
        dialog.append(header);
        const columns = [["初始", record.base_attr_value], [record.extra_attr_value ? "最大" : "最終", record.max_attr_value], ["隱藏", record.extra_attr_value], ["最終", record.extra_attr_value ? mintmarkFinalStats(record) : null]].filter(([, values]) => values);
        if (columns.length) {
            const table = document.createElement("table");
            table.className = "seal-detail-table";
            const caption = table.createCaption();
            caption.textContent = "能力值（最終值已包含隱藏數值）";
            const head = table.createTHead().insertRow();
            ["能力", ...columns.map(([label]) => label)].forEach(label => {
                const cell = document.createElement("th");
                cell.scope = "col";
                cell.textContent = label;
                head.append(cell);
            });
            const body = table.createTBody();
            [...STATS, ["total", "總和"]].forEach(([key, label]) => {
                const row = body.insertRow();
                const name = document.createElement("th");
                name.scope = "row";
                name.textContent = label;
                row.append(name);
                columns.forEach(([columnLabel, values]) => {
                    const cell = row.insertCell();
                    cell.textContent = key === "total" && values.percent ? "—" : values[key] == null ? "—" : `${values[key]}${values.percent ? "%" : ""}`;
                    if (columnLabel === "最終") cell.className = "seal-stat-max";
                });
                if (key === "total") row.className = "seal-stat-total";
            });
            dialog.append(table);
        }
        // Keep effect text, but omit numeric descriptions already covered by the table.
        const descriptionText = convertToTraditionalChinese(record.desc || "").split(/[,，、;；\n]+/)
            .filter(part => !columns.length || !/^\s*(攻擊|攻击|防禦|防御|特攻|特防|速度|體力|体力)\s*[+:：]?\s*\d+(?:\.\d+)?%?(?:\s*\/\s*\d+(?:\.\d+)?%?)?\s*$/.test(part)).join("，").trim();
        if (descriptionText) {
            const description = document.createElement("p");
            description.className = "seal-description";
            description.textContent = descriptionText;
            dialog.append(description);
        }
        if (record.pet?.length || record.skill?.length) {
            const links = document.createElement("p");
            links.className = "seal-meta";
            links.textContent = [record.pet?.length ? `適用精靈 ID：${record.pet.map(item => item.id).join("、")}` : "", record.skill?.length ? `適用技能 ID：${record.skill.map(item => item.id).join("、")}` : ""].filter(Boolean).join("\n");
            dialog.append(links);
        }
        if (!dialog.open) openDialog(dialog);
    }
    async function openDetail(record) {
        const request = ++detailRequest;
        unobserveMintmarkImages(dialog);
        dialog.replaceChildren();
        const title = document.createElement('h2');
        title.id = 'seal-detail-title'; title.textContent = record.name;
        const message = document.createElement('p');
        message.setAttribute('role', 'status'); message.textContent = '正在載入完整刻印資料…';
        const close = document.createElement('button');
        close.type = 'button'; close.textContent = '關閉'; close.addEventListener('click', () => closeDialog(dialog));
        dialog.append(title, message, close);
        if (!dialog.open) openDialog(dialog);
        try {
            const [complete] = await snapshot.complete([record]);
            if (request === detailRequest && dialog.open) detail(localizeRecords([complete])[0]);
        } catch (error) {
            if (request !== detailRequest || !dialog.open) return;
            console.error('Mintmark detail error:', error);
            message.textContent = '完整資料載入失敗，請重試。若網站剛更新，請重新整理。';
            const retryDetail = document.createElement('button');
            retryDetail.type = 'button'; retryDetail.textContent = '重新載入';
            retryDetail.addEventListener('click', () => openDetail(record)); dialog.append(retryDetail);
        }
    }
    dialog.addEventListener("click", event => {
        const rect = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeDialog(dialog);
    });
    dialog.addEventListener("close", () => { detailRequest++; unobserveMintmarkImages(dialog); });
    function render() {
        retry.hidden = !loadError;
        if (!loaded) {
            exportButton.disabled = true;
            unobserveMintmarkImages(grid);
            grid.replaceChildren();
            pagination.hidden = true;
            status.textContent = loadError ? '刻印資料載入失敗，請重試，或調整分類與專屬刻印條件。' : '正在載入刻印列表…';
            return;
        }
        if (taiwanOnly?.checked && latestMintmarkId === null) {
            exportButton.disabled = true;
            unobserveMintmarkImages(grid);
            grid.replaceChildren();
            pagination.hidden = true;
            status.textContent = settingsMessage;
            return;
        }
        const matches = currentMatches();
        exportButton.disabled = exporting || !loaded || !matches.length;
        const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
        page = Math.min(page, pages);
        unobserveMintmarkImages(grid);
        grid.replaceChildren();
        matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).forEach(record => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "seal-card";
            const header = document.createElement("span");
            header.className = "seal-card-header";
            const text = document.createElement("span");
            const name = document.createElement("strong");
            name.textContent = record.name;
            name.title = record.name;
            const meta = document.createElement("small");
            meta.textContent = `#${record.id} · ${TYPES[record.type?.id] || "刻印"}`;
            text.append(name, meta);
            header.append(imageSlot(record), text);
            card.append(header);
            if (record.max_attr_value) card.append(stats(record));
            else {
                const desc = document.createElement("span");
                desc.className = "seal-card-description";
                desc.textContent = convertToTraditionalChinese(record.desc || "查看刻印詳情");
                card.append(desc);
            }
            card.addEventListener("click", () => openDetail(record));
            grid.append(card);
        });
        status.textContent = matches.length ? `${matches.length.toLocaleString()} 個刻印${taiwanOnly?.checked ? ` · 台服進度至 #${latestMintmarkId}` : ""}` : taiwanOnly?.checked ? "找不到符合台服進度及目前條件的刻印。" : "找不到符合條件的刻印。";
        pagination.hidden = pages <= 1;
        pagination.querySelector("span").textContent = `${page} / ${pages}`;
        previous.disabled = page === 1;
        next.disabled = page === pages;
    }
    [input, type, sort, series].forEach(control => control.addEventListener(control === input ? "input" : "change", () => {
        page = 1;
        if (control === type) {
            if (type.value === "1") selectedCorners = "all";
            updateCornerButtons();
        }
        if (control === type) load();
        else if (loaded) render();
    }));
    exclusive.addEventListener("change", () => {
        page = 1;
        load();
    });
    async function updateTaiwanFilter() {
        page = 1;
        if (!taiwanOnly.checked || latestMintmarkId !== null) { if (loaded) render(); return; }
        settingsMessage = "正在讀取台服刻印進度…";
        if (loaded) render();
        if (!settingsPending) settingsPending = (async () => {
            try {
                const settings = await getSeerServerSettings();
                const id = settings.latestMintmarkId;
                if (!Number.isSafeInteger(id) || id < 1) {
                    settingsMessage = "後台尚未設定台服最新刻印編號，可取消台服篩選查看全部資料。";
                    return;
                }
                latestMintmarkId = id;
                excludedMintmarkRanges = settings.excludedRanges?.mintmark ?? [];
            } catch (error) {
                console.error("Mintmark Taiwan settings error:", error);
                settingsMessage = "台服刻印進度讀取失敗，請重新勾選重試，或取消篩選。";
            }
        })().finally(() => { settingsPending = null; });
        await settingsPending;
        if (loaded) render();
    }
    bindTaiwanProgressToggle(taiwanOnly, () => { if (loaded) void updateTaiwanFilter(); });
    function changePage(delta) { page += delta; render(); content.scrollIntoView({ block: "start", behavior: "smooth" }); }
    previous.addEventListener("click", () => changePage(-1));
    next.addEventListener("click", () => changePage(1));
    async function load() {
        const categories = mintmarkCategories(type.value, exclusive.checked);
        const key = categories.join(',');
        if (loaded && loadKey === key) return;
        if (pending && pendingKey === key) return pending;
        const request = ++loadRequest;
        pendingKey = key; loaded = false; loadError = false;
        render();
        content.setAttribute("aria-busy", "true");
        pending = (async () => {
            try {
                const data = await snapshot.lists(categories);
                if (request !== loadRequest) return;
                seriesNames = new Map(data.series.map(item => [item.id, convertToTraditionalChinese(item.name)]));
                records = localizeRecords(data.records);
                populateSeries();
                loaded = true;
                loadKey = key;
                if (taiwanOnly?.checked) await updateTaiwanFilter();
                else render();
            } catch (error) {
                if (request !== loadRequest) return;
                console.error("Mintmark catalog error:", error);
                loadError = true;
                render();
            } finally {
                if (request === loadRequest) { pending = null; content.removeAttribute("aria-busy"); }
            }
        })();
        return pending;
    }
    retry.addEventListener("click", load);
    let routeRequest = 0;
    async function searchById(value) {
        const id = String(value || '').trim();
        if (!/^[1-9][0-9]{0,9}$/.test(id)) return;
        const request = ++routeRequest;
        input.value = id; type.value = 'all'; series.value = 'all'; sort.value = 'id';
        selectedCorners = 'all'; exclusive.checked = true;
        setTaiwanProgressOnly(false);
        await load();
        if (!loaded || request !== routeRequest || root.hidden) return;
        populateSeries();
        page = 1; updateCornerButtons(); render();
        const record = records.find(item => String(item.id) === id && !item.is_hidden);
        if (record) await openDetail(record);
        else status.textContent = `找不到刻印 #${id}。`;
    }
    return { load, searchById };
}
