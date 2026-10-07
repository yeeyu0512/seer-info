export function createVoteRecordsController({
    getPoolVoteDetails,
    showAdminNotification,
    getAdminErrorMessage,
    formatDate,
    toCsvCell,
    getSelectedPool
}) {
    const voteRecordList = document.getElementById("admin-vote-record-list");
    const voteRecordSummary = document.getElementById("vote-record-summary");
    const refreshVoteRecordsButton = document.getElementById("refresh-vote-records-button");
    const exportVoteRecordsButton = document.getElementById("export-vote-records-button");
    const voteRecordSearch = document.getElementById("vote-record-search");
    const voteRecordPreviousButton = document.getElementById("vote-record-previous-button");
    const voteRecordNextButton = document.getElementById("vote-record-next-button");
    const voteRecordPage = document.getElementById("vote-record-page");

    let voteRecords = [];

    let voteRecordCurrentPage = 1;

    const VOTE_RECORDS_PER_PAGE = 20;

    refreshVoteRecordsButton.addEventListener("click", loadVoteRecords);

    exportVoteRecordsButton.addEventListener("click", exportVoteRecords);

    voteRecordSearch.addEventListener("input", () => {
        voteRecordCurrentPage = 1;
        renderVoteRecords();
    });

    voteRecordPreviousButton.addEventListener("click", () => {
        voteRecordCurrentPage -= 1;
        renderVoteRecords();
    });

    voteRecordNextButton.addEventListener("click", () => {
        voteRecordCurrentPage += 1;
        renderVoteRecords();
    });

    async function loadVoteRecords() {
        if (!getSelectedPool()) return;
        voteRecordCurrentPage = 1;
        voteRecordSearch.value = "";
        voteRecordList.innerHTML = "<p class=\"empty-state\">正在載入投票紀錄…</p>";
        voteRecordSummary.textContent = "正在載入投票紀錄…";
        refreshVoteRecordsButton.disabled = true;
        exportVoteRecordsButton.disabled = true;

        try {
            voteRecords = await getPoolVoteDetails(getSelectedPool().id);
            voteRecordSummary.textContent = voteRecords.length > 0
                ? `共 ${voteRecords.length} 位使用者已完成投票。`
                : "目前尚無使用者完成投票。";
            renderVoteRecords();
        } catch (error) {
            console.error("Load vote records error:", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            voteRecordSummary.textContent = "投票紀錄載入失敗。";
            voteRecordList.innerHTML = "<p class=\"empty-state\">無法載入投票紀錄，請稍後再試。</p>";
            showAdminNotification(`載入投票紀錄失敗：${getAdminErrorMessage(error)}`, "error");
        } finally {
            refreshVoteRecordsButton.disabled = false;
            exportVoteRecordsButton.disabled = voteRecords.length === 0;
        }
    }

    function exportVoteRecords() {
        if (!getSelectedPool() || voteRecords.length === 0) return;

        const rows = [["米米號", "使用者 ID", "投票時間", "選擇數量", "所選角色"]];
        voteRecords.forEach((record) => {
            const choices = record.selections || [];
            const selectedCharacters = choices
                .map((choice) => `#${choice.character_id} ${choice.character_name}`)
                .join("｜");
            rows.push([
                record.mimi_id || "未綁定",
                record.user_id || "",
                record.voted_at ? formatDate(record.voted_at) : "",
                choices.length,
                selectedCharacters
            ]);
        });

        const csv = `\ufeff${rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n")}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const safePoolName = getSelectedPool().name.replace(/[\\/:*?"<>|]/g, "_");
        link.href = url;
        link.download = `${safePoolName}_投票紀錄.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showAdminNotification("投票紀錄 CSV 已下載。", "success");
    }

    function renderVoteRecords() {
        voteRecordList.innerHTML = "";
        const keyword = voteRecordSearch.value.trim().toLowerCase();
        const filteredRecords = voteRecords.filter((record) => {
            if (!keyword) return true;
            const searchable = [
                record.mimi_id,
                record.user_id,
                ...(record.selections || []).flatMap((selection) => [selection.character_id, selection.character_name])
            ].join(" ").toLowerCase();
            return searchable.includes(keyword);
        });
        const totalPages = Math.max(1, Math.ceil(filteredRecords.length / VOTE_RECORDS_PER_PAGE));
        voteRecordCurrentPage = Math.min(Math.max(voteRecordCurrentPage, 1), totalPages);
        const start = (voteRecordCurrentPage - 1) * VOTE_RECORDS_PER_PAGE;
        const pageRecords = filteredRecords.slice(start, start + VOTE_RECORDS_PER_PAGE);

        voteRecordPage.textContent = `第 ${voteRecordCurrentPage} / ${totalPages} 頁`;
        voteRecordPreviousButton.disabled = voteRecordCurrentPage === 1;
        voteRecordNextButton.disabled = voteRecordCurrentPage === totalPages;

        if (filteredRecords.length === 0) {
            voteRecordList.innerHTML = "<p class=\"empty-state\">目前尚無使用者完成投票。</p>";
            return;
        }

        pageRecords.forEach((record) => {
            const item = document.createElement("article");
            const header = document.createElement("div");
            const mimi = document.createElement("strong");
            const user = document.createElement("span");
            const votedAt = document.createElement("time");
            const choices = document.createElement("div");

            item.className = "admin-vote-record";
            header.className = "admin-vote-record-header";
            mimi.textContent = `米米號 ${record.mimi_id || "未綁定"}`;
            user.textContent = `使用者 ID ${String(record.user_id).slice(0, 8)}`;
            votedAt.textContent = formatDate(record.voted_at);
            choices.className = "admin-vote-choice-list";

            (record.selections || []).forEach((selection) => {
                const choice = document.createElement("span");
                choice.className = "admin-vote-choice";
                choice.textContent = `#${selection.character_id} ${selection.character_name}`;
                choices.append(choice);
            });

            header.append(mimi, user, votedAt);
            item.append(header, choices);
            voteRecordList.append(item);
        });
    }
    return { loadVoteRecords, exportVoteRecords, renderVoteRecords };
}
