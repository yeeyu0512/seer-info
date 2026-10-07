
export function createGameAccountController({ gameAccountForm, gameAccountInput, gameAccountMessage, bindGameAccountButton, bindGameAccount, loadPool, getMyGameAccount, gameAccountUnbound, gameAccountBound, boundGameAccount, getIsAuthenticated }) {
    let hasMiMiBinding = false;

    gameAccountForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!getIsAuthenticated()) return;

        const gameAccount = gameAccountInput.value.trim();
        if (!/^\d+$/.test(gameAccount)) {
            gameAccountMessage.textContent = "米米號只能輸入數字。";
            return;
        }

        bindGameAccountButton.disabled = true;
        bindGameAccountButton.textContent = "綁定中…";
        gameAccountMessage.textContent = "";

        try {
            const boundAccount = await bindGameAccount(gameAccount);
            renderGameAccount(boundAccount);
            await loadPool();
        } catch (error) {
            console.error("Bind game account error:", error);
            gameAccountMessage.textContent = `綁定失敗：${error.message}`;
        } finally {
            bindGameAccountButton.disabled = false;
            bindGameAccountButton.textContent = "綁定";
        }
    });

    async function loadGameAccount() {
        try {
            const gameAccount = await getMyGameAccount();
            renderGameAccount(gameAccount);
        } catch (error) {
            console.error("Load game account error:", error);
            renderGameAccount(null);
            gameAccountMessage.textContent = `讀取遊戲帳號失敗：${error.message}`;
        }
    }

    function renderGameAccount(gameAccount) {
        const isBound = typeof gameAccount === "string" && gameAccount.length > 0;
        hasMiMiBinding = isBound;
        gameAccountUnbound.hidden = isBound;
        gameAccountBound.hidden = !isBound;
        boundGameAccount.textContent = isBound ? gameAccount : "";
        gameAccountInput.value = "";
        gameAccountMessage.textContent = "";
    }
    return { loadGameAccount, renderGameAccount, getHasMiMiBinding: () => hasMiMiBinding };
}
