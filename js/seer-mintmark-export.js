const EXCELJS_URL = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
const STATS = ["atk", "sp_atk", "def", "sp_def", "spd", "hp"];
let runtimePending;

function loadExcelRuntime() {
    if (window.ExcelJS?.Workbook) return Promise.resolve(window.ExcelJS);
    if (runtimePending) return runtimePending;
    runtimePending = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const fail = () => { clearTimeout(timeout); script.remove(); reject(new Error("Excel 匯出工具載入失敗，請稍後重試。")); };
        const timeout = setTimeout(fail, 30000);
        script.src = EXCELJS_URL;
        script.onload = () => {
            clearTimeout(timeout);
            if (window.ExcelJS?.Workbook) resolve(window.ExcelJS);
            else fail();
        };
        script.onerror = fail;
        document.head.append(script);
    }).catch(error => { runtimePending = null; throw error; });
    return runtimePending;
}

export function groupMintmarksForExport(records, seriesNames = new Map()) {
    const groups = new Map();
    records.forEach(record => {
        const id = record.mintmark_class?.id ?? null;
        if (!groups.has(id)) groups.set(id, { id, name: id === null ? "未分類" : seriesNames.get(id) || `系列 #${id}`, records: [], newestId: 0 });
        const group = groups.get(id);
        group.records.push(record);
        group.newestId = Math.max(group.newestId, record.id);
    });
    return [...groups.values()].sort((a, b) => {
        if (a.id === null) return b.id === null ? 0 : 1;
        if (b.id === null) return -1;
        return b.newestId - a.newestId || b.id - a.id;
    });
}

export function buildMintmarkWorkbook(ExcelJS, records, seriesNames = new Map(), { filterDescription = "" } = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "賽爾號資訊站";
    workbook.calcProperties = { fullCalcOnLoad: true };
    const sheet = workbook.addWorksheet("刻印能力表", { views: [{ showGridLines: false }] });
    sheet.columns = [{ width: 24 }, { width: 36 }, ...STATS.map(() => ({ width: 10 })), { width: 11 }];
    sheet.mergeCells("A1:I1");
    sheet.getCell("A1").value = "刻印能力表";
    sheet.getCell("A1").font = { name: "Microsoft JhengHei", size: 16, bold: true, color: { argb: "FF292D45" } };
    sheet.getRow(1).height = 32;
    sheet.mergeCells("A2:I2");
    sheet.getCell("A2").value = `${records.length} 個刻印${filterDescription ? `　${filterDescription}` : ""}`;
    sheet.getCell("A2").font = { name: "Microsoft JhengHei", size: 10, color: { argb: "FF626779" } };
    sheet.getRow(2).height = 24;
    sheet.mergeCells("A3:I3");
    sheet.getCell("A3").value = "資料來源：https://api.seerapi.com/v1/mintmark　數值為最大能力值，同系列合併儲存格。";
    sheet.getCell("A3").font = { name: "Microsoft JhengHei", size: 10, color: { argb: "FF626779" } };
    sheet.getRow(3).height = 22;
    const header = sheet.getRow(4);
    header.values = ["系列", "名稱", "攻擊", "特攻", "防禦", "特防", "速度", "體力", "總和"];
    header.height = 28;
    header.eachCell(cell => {
        cell.font = { name: "Microsoft JhengHei", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF454063" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
            top: { style: "thin", color: { argb: "FFBCBACB" } },
            bottom: { style: "thin", color: { argb: "FFBCBACB" } },
            left: { style: "thin", color: { argb: cell.col === 1 ? "FFBCBACB" : "FF77718F" } },
            right: { style: "thin", color: { argb: cell.col === 9 ? "FFBCBACB" : "FF77718F" } },
        };
    });
    let rowNumber = 5;
    groupMintmarksForExport(records, seriesNames).forEach((group, groupIndex) => {
        const start = rowNumber;
        const fill = groupIndex % 2 ? "FFF4F3F8" : "FFFFFFFF";
        group.records.forEach(record => {
            const row = sheet.getRow(rowNumber);
            const attrs = record.max_attr_value;
            const values = STATS.map(key => typeof attrs?.[key] === "number" && Number.isFinite(attrs[key]) ? attrs[key] : null);
            const total = attrs && !attrs.percent && values.every(value => value !== null)
                ? { formula: `SUM(C${rowNumber}:H${rowNumber})`, result: values.reduce((sum, value) => sum + value, 0) } : null;
            row.values = [rowNumber === start ? group.name : null, record.name, ...values, total];
            row.height = 26;
            for (let col = 1; col <= 9; col++) {
                const cell = row.getCell(col);
                cell.font = { name: "Microsoft JhengHei", size: 11, color: { argb: "FF292D45" }, bold: col === 9 };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
                cell.alignment = { vertical: "middle", horizontal: col >= 3 ? "right" : "left" };
                cell.border = col === 1 ? {} : {
                    left: { style: "thin", color: { argb: col === 2 ? "FFBCBACB" : "FFE1E1E8" } },
                    right: { style: "thin", color: { argb: col === 9 ? "FFBCBACB" : "FFE1E1E8" } },
                    bottom: { style: "hair", color: { argb: "FFE1E1E8" } },
                };
                if (col >= 3 && col <= 8) cell.numFmt = attrs?.percent ? '0"%"' : "0";
            }
            rowNumber++;
        });
        if (rowNumber - start > 1) sheet.mergeCells(start, 1, rowNumber - 1, 1);
        const series = sheet.getCell(start, 1);
        series.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        series.font = { name: "Microsoft JhengHei", size: 11, bold: true, color: { argb: "FF454063" } };
        series.border = {
            top: { style: "thin", color: { argb: "FFBCBACB" } },
            bottom: { style: "thin", color: { argb: "FFBCBACB" } },
            left: { style: "thin", color: { argb: "FFBCBACB" } },
            right: { style: "thin", color: { argb: "FFBCBACB" } },
        };
        for (let col = 2; col <= 9; col++) {
            sheet.getRow(start).getCell(col).border = { ...sheet.getRow(start).getCell(col).border, top: { style: "thin", color: { argb: "FFBCBACB" } } };
            sheet.getRow(rowNumber - 1).getCell(col).border = { ...sheet.getRow(rowNumber - 1).getCell(col).border, bottom: { style: "thin", color: { argb: "FFBCBACB" } } };
        }
    });
    sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "4:4" };
    return workbook;
}

export async function downloadMintmarkWorkbook(records, seriesNames, options) {
    if (!records.length) throw new Error("沒有符合篩選條件的刻印可匯出。");
    const ExcelJS = await loadExcelRuntime();
    const workbook = buildMintmarkWorkbook(ExcelJS, records, seriesNames, options);
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `刻印能力表_${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date())}_${records.length}筆.xlsx`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
