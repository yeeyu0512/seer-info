export function getAdminErrorMessage(error) {
    const message = String(error?.message || "");
    const lowerMessage = message.toLowerCase();
    const status = Number(error?.status || message.match(/\bHTTP\s+(\d{3})\b/i)?.[1]);
    const code = String(error?.code || "").toUpperCase();

    if (/invalid login credentials|invalid credentials/.test(lowerMessage)) {
        return "Email 或密碼錯誤，請確認後再試。";
    }
    if (status === 404) {
        if (/\/pet\/\d+\/?$/.test(error?.resource || "")) {
            return "查無這個精靈 ID 的資料，請確認編號是否正確，或稍後再試。";
        }
        if (/\/element_type_combination\/\d+\/?$/.test(error?.resource || "")) {
            return "已找到精靈，但查不到牠的屬性資料，請稍後再試或聯絡管理員。";
        }
        return "找不到這筆資料，可能已被刪除或編號有誤；請重新整理後再試。";
    }
    if (/pool not found/i.test(message)) return "找不到這個票選活動，請重新整理管理頁面後再試。";
    if (/only a closed pool can be returned to draft/i.test(message)) {
        return "只有狀態為 closed 的票選活動才能退回草稿，請重新整理並確認活動狀態。";
    }
    if (/a pool with vote records cannot be returned to draft/i.test(message)) {
        return "這個票選活動已有投票紀錄，為保護既有資料，不能退回草稿。";
    }
    if (/admin access required|authentication required/i.test(message)) {
        return "登入狀態或管理員權限已失效，請重新登入後再試。";
    }
    if (code === "P0001") {
        return "目前資料狀態不符合此操作條件，請重新整理頁面並確認操作是否仍適用。";
    }
    if (/[\u4e00-\u9fff]/.test(message)) return message;
    if (/failed to fetch|networkerror|load failed|fetch failed/.test(lowerMessage)) {
        return "網路連線失敗，請檢查網路後再試。";
    }
    if (/jwt expired|refresh token|session.*expired/.test(lowerMessage)) {
        return "登入狀態已過期，請重新登入後再試。";
    }
    if (/row.level security|permission denied|not authorized|unauthorized/.test(lowerMessage)) {
        return "權限不足，無法執行此操作。";
    }
    if (/duplicate key|unique constraint|already exists/.test(lowerMessage)) {
        return "資料已存在，請確認是否重複新增。";
    }
    if (/foreign key constraint|still referenced/.test(lowerMessage)) {
        return "資料仍被其他內容使用，無法刪除。";
    }
    if (status === 429) return "目前請求過於頻繁，請稍候再試。";
    if (status >= 500) return "伺服器暫時無法處理請求，請稍後再試。";
    if (status >= 400) return "請求未能完成，請確認輸入資料與操作條件後再試。";
    if (message) return "系統暫時無法完成操作，請稍後再試。";
    return "系統暫時無法完成操作，請稍後再試。";
}
