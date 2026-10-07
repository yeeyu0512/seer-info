export function createAdminSession({
    logout,
    showAdminNotification,
    getAdminErrorMessage,
    login,
    isAdmin,
    getSession,
    poolList,
    loadPools,
    loadAdminCompetitivePools,
    loadTaiwanSeerSettings
}) {
    const adminWorkspace = document.getElementById("admin-workspace");
    const accessDenied = document.getElementById("access-denied");
    const adminLoginPanel = document.getElementById("admin-login-panel");
    const adminLoginForm = document.getElementById("admin-login-form");
    const adminLoginEmailInput = document.getElementById("admin-login-email");
    const adminLoginPasswordInput = document.getElementById("admin-login-password");
    const adminLoginButton = document.getElementById("admin-login-button");
    const adminLoginMessage = document.getElementById("admin-login-message");
    const adminSwitchAccountButton = document.getElementById("admin-switch-account-button");
    const logoutButton = document.getElementById("logout-button");

    logoutButton.addEventListener("click", async () => {
        const { error } = await logout();
        if (error) {
            console.error("Logout error:", error);
            showAdminNotification(`登出失敗：${getAdminErrorMessage(error)}`, "error");
            return;
        }
        window.location.href = "./index.html";
    });

    adminLoginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = adminLoginEmailInput.value.trim();
        const password = adminLoginPasswordInput.value;
        if (!email || !password) {
            adminLoginMessage.textContent = "請輸入管理員 Email 與密碼。";
            return;
        }

        adminLoginButton.disabled = true;
        adminLoginMessage.textContent = "正在驗證管理員帳號…";
        try {
            const { error } = await login(email, password);
            if (error) throw error;
            if (!await isAdmin()) {
                const { error: logoutError } = await logout();
                if (logoutError) throw logoutError;
                adminLoginMessage.textContent = "此帳號沒有管理權限，請使用管理員帳號登入。";
                adminLoginPasswordInput.value = "";
                return;
            }

            adminLoginPanel.hidden = true;
            accessDenied.hidden = true;
            await showAdminWorkspace();
        } catch (error) {
            console.error("Admin login error:", error);
            adminLoginMessage.textContent = `登入失敗：${getAdminErrorMessage(error)}`;
        } finally {
            adminLoginButton.disabled = false;
        }
    });

    adminSwitchAccountButton.addEventListener("click", async () => {
        adminSwitchAccountButton.disabled = true;
        try {
            const { error } = await logout();
            if (error) throw error;
            accessDenied.hidden = true;
            adminLoginPanel.hidden = false;
            document.body.classList.add("admin-login-active");
            adminLoginPasswordInput.value = "";
            adminLoginMessage.textContent = "";
            adminLoginEmailInput.focus();
        } catch (error) {
            console.error("Admin account switch error:", error);
            showAdminNotification(`切換帳號失敗：${getAdminErrorMessage(error)}`, "error");
        } finally {
            adminSwitchAccountButton.disabled = false;
        }
    });

    async function loadAdminPage() {
        try {
            const session = await getSession();
            if (!session) {
                adminLoginPanel.hidden = false;
                document.body.classList.add("admin-login-active");
                return;
            }
            if (!await isAdmin()) {
                accessDenied.hidden = false;
                return;
            }
            await showAdminWorkspace();
        } catch (error) {
            console.error("Load admin page error:", error);
            if (adminWorkspace.hidden) {
                adminLoginPanel.hidden = false;
                document.body.classList.add("admin-login-active");
                adminLoginMessage.textContent = `無法確認管理權限：${getAdminErrorMessage(error)}`;
                return;
            }
            poolList.innerHTML = "<p class=\"empty-state\">載入管理資料失敗，請重新整理後再試。</p>";
            showAdminNotification(`載入管理資料失敗：${getAdminErrorMessage(error)}`, "error");
        }
    }

    async function showAdminWorkspace() {
        adminLoginPanel.hidden = true;
        document.body.classList.remove("admin-login-active");
        accessDenied.hidden = true;
        adminWorkspace.hidden = false;
        logoutButton.hidden = false;
        await loadPools();
        await loadAdminCompetitivePools();
        await loadTaiwanSeerSettings();
    }
    return { loadAdminPage, showAdminWorkspace };
}
