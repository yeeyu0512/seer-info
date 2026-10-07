
export function createAuthView({ loginTrigger, publicLoginButton, mimiBindingButton, activateTab, loginClose, loginModal, emailInput, loginMessage, loginButton, passwordInput, login, showAuthenticatedView, initializeAuthenticatedPage, registerButton, passwordConfirmInput, mimiIdInput, register, authModeToggle, passwordConfirmGroup, mimiIdGroup, authTitle, authDescription }) {
    let isRegisterMode = false;

    let modalPointerStartedOnBackdrop = false;

    const LOGIN_ENABLED = false;

    const REGISTRATION_ENABLED = false;

    if (!LOGIN_ENABLED) {
        loginButton.disabled = true;
        loginButton.textContent = "本站暫時不開放登入";
    }
    if (!REGISTRATION_ENABLED) {
        registerButton.hidden = true;
        authModeToggle.hidden = true;
    }

    loginTrigger.addEventListener("click", openLoginModal);

    publicLoginButton.addEventListener("click", openLoginModal);

    mimiBindingButton.addEventListener("click", () => activateTab("account-section"));

    loginClose.addEventListener("click", closeLoginModal);

    loginModal.addEventListener("pointerdown", (event) => {
        modalPointerStartedOnBackdrop = event.target === loginModal;
    });

    loginModal.addEventListener("click", (event) => {
        if (modalPointerStartedOnBackdrop && event.target === loginModal) closeLoginModal();
        modalPointerStartedOnBackdrop = false;
    });

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

    loginButton.addEventListener("click", async () => {
        if (!LOGIN_ENABLED) return;

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
            const { data, error } = await login(email, password);
            if (error) throw error;
            console.log("Login success:", data.user);
            showAuthenticatedView();
            await initializeAuthenticatedPage();
        } catch (error) {
            console.error("Login error:", error);
            loginMessage.textContent = getChineseAuthError(error, "login");
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "登入";
        }
    });

    registerButton.addEventListener("click", async () => {
        if (!REGISTRATION_ENABLED) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;
        const mimiId = mimiIdInput.value.trim();
        if (!email || !password || !passwordConfirm || !mimiId) {
            loginMessage.textContent = "請完整填寫 Email、密碼、確認密碼 與米米號。";
            return;
        }
        if (password !== passwordConfirm) {
            loginMessage.textContent = "兩次輸入的密碼不一致。";
            return;
        }
        if (!/^\d+$/.test(mimiId)) {
            loginMessage.textContent = "米米號只能輸入數字。";
            return;
        }

        registerButton.disabled = true;
        registerButton.textContent = "建立帳號中…";
        loginMessage.textContent = "正在建立帳號…";
        try {
            const { data, error } = await register(email, password, mimiId);
            if (error) throw error;

            if (data.session) {
                loginMessage.textContent = "帳號建立成功，正在登入…";
                showAuthenticatedView();
                await initializeAuthenticatedPage();
            } else {
                loginMessage.textContent = "帳號建立成功，請前往信箱完成驗證後再登入。";
            }
        } catch (error) {
            console.error("Register error:", error);
            loginMessage.textContent = getChineseAuthError(error, "register");
        } finally {
            registerButton.disabled = false;
            registerButton.textContent = "建立帳號";
        }
    });

    authModeToggle.addEventListener("click", () => {
        if (!REGISTRATION_ENABLED) return;
        setAuthMode(!isRegisterMode);
    });

    function setAuthMode(registerMode) {
        if (registerMode && !REGISTRATION_ENABLED) return;
        isRegisterMode = registerMode;
        passwordConfirmGroup.hidden = !isRegisterMode;
        mimiIdGroup.hidden = !isRegisterMode;
        loginButton.hidden = isRegisterMode;
        registerButton.hidden = !isRegisterMode;
        passwordInput.autocomplete = isRegisterMode ? "new-password" : "current-password";
        authTitle.textContent = isRegisterMode ? "建立帳號" : "登入投票";
        authDescription.textContent = isRegisterMode
            ? "建立帳號時須綁定米米號，完成後即可參與投票。"
            : "登入後即可參與本期競技限制投票。";
        authModeToggle.textContent = isRegisterMode
            ? "已有帳號？返回登入"
            : "還沒有帳號？建立帳號";
        loginMessage.textContent = "";
        passwordConfirmInput.value = "";
        mimiIdInput.value = "";
    }

    function getChineseAuthError(error, action) {
        const message = String(error?.message || "").toLowerCase();
        const code = String(error?.code || "").toLowerCase();

        if (/database error saving new user/.test(message)) {
            return "此米米號已被其他帳號綁定，請確認後使用另一組米米號。";
        }
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
    return { openLoginModal, closeLoginModal, setAuthMode, getChineseAuthError };
}
