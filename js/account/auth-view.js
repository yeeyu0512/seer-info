export function createAuthView({ login, onAuthenticated, document = globalThis.document }) {
    const loginModal = document.getElementById("login-modal");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginMessage = document.getElementById("login-message");
    const loginButton = document.getElementById("login-button");
    let modalPointerStartedOnBackdrop = false;

    function openLoginModal() {
        loginModal.classList.remove("is-closing");
        loginModal.hidden = false;
        emailInput.focus();
    }
    function closeLoginModal() {
        if (loginModal.hidden || loginModal.classList.contains("is-closing")) return;
        loginModal.classList.add("is-closing");
        loginMessage.textContent = "";
        window.setTimeout(() => {
            loginModal.hidden = true;
            loginModal.classList.remove("is-closing");
        }, 180);
    }
    document.getElementById("about-login-trigger").addEventListener("click", openLoginModal);
    document.getElementById("login-close").addEventListener("click", closeLoginModal);
    loginModal.addEventListener("pointerdown", event => { modalPointerStartedOnBackdrop = event.target === loginModal; });
    loginModal.addEventListener("click", event => {
        if (modalPointerStartedOnBackdrop && event.target === loginModal) closeLoginModal();
        modalPointerStartedOnBackdrop = false;
    });
    loginButton.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email || !password) {
            loginMessage.textContent = "請輸入 Email 和密碼";
            return;
        }
        loginButton.disabled = true;
        loginButton.textContent = "登入中…";
        loginMessage.textContent = "正在驗證帳號…";
        try {
            const { error } = await login(email, password);
            if (error) throw error;
            await onAuthenticated();
            loginModal.classList.remove("is-closing");
            loginModal.hidden = true;
            passwordInput.value = "";
            loginMessage.textContent = "";
        } catch (error) {
            loginMessage.textContent = getChineseAuthError(error, "login");
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "登入";
        }
    });
    function getChineseAuthError(error, action) {
        const message = String(error?.message || "").toLowerCase();
        const code = String(error?.code || "").toLowerCase();

        if (/invalid login credentials|invalid credentials/.test(message)) {
            return "Email 或密碼錯誤，請重新輸入。";
        }
        if (/email not confirmed|email_not_confirmed/.test(message) || code === "email_not_confirmed") {
            return "Email 尚未完成驗證，請先到信箱點擊驗證連結。";
        }
        if (/user already registered|email.*already.*registered|email_exists/.test(message) || code === "email_exists") {
            return "此 Email 已註冊，請直接登入或使用其他 Email。";
        }
        if (/password.*(least|short|weak)|weak_password/.test(message) || code === "weak_password") {
            return "密碼長度不足或不符合安全規則，請改用更安全的密碼。";
        }
        if (/rate limit|over_email_send_rate_limit|over_request_rate_limit/.test(message) || /rate_limit/.test(code)) {
            return "嘗試次數過於頻繁，請稍後再試。";
        }
        if (/signup.*disabled|signup_disabled/.test(message) || code === "signup_disabled") {
            return "目前暫停開放建立帳號。";
        }
        if (/invalid.*email|email.*invalid/.test(message)) {
            return "Email 格式不正確，請重新輸入。";
        }
        if (/network|fetch/.test(message)) {
            return "網路連線異常，請確認網路後再試。";
        }

        return action === "login"
            ? "登入失敗，請稍後再試。"
            : "建立帳號失敗，請稍後再試。";
    }
    return { openLoginModal, closeLoginModal };
}
