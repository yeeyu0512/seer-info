// Staff session and administrator-only navigation.
export function createSessionController({
    document = globalThis.document,
    getSession,
    isAdmin,
    logout,
    supabaseClient,
    activateTab,
    defer = callback => setTimeout(callback, 0)
}) {
    const adminTools = document.getElementById("admin-tools");
    const adminLink = document.getElementById("admin-link");
    const logoutButton = document.getElementById("logout-button");
    const loginTrigger = document.getElementById("about-login-trigger");
    let administrator = false;
    let revision = 0;

    function renderAccess(allowed) {
        administrator = allowed;
        adminTools.hidden = !allowed;
        adminLink.hidden = !allowed;
        logoutButton.hidden = !allowed;
        loginTrigger.hidden = allowed;
        if (!allowed) {
            adminTools.open = false;
        }
    }

    async function checkSession() {
        const currentRevision = ++revision;
        try {
            const session = await getSession();
            const allowed = session ? (await isAdmin()) === true : false;
            if (currentRevision === revision) renderAccess(allowed);
        } catch (error) {
            if (currentRevision === revision) renderAccess(false);
            console.error("Staff session error:", error);
        }
    }

    logoutButton.addEventListener("click", async () => {
        const { error } = await logout();
        if (error) {
            console.error("Logout error:", error);
            return;
        }
        revision += 1;
        renderAccess(false);
        const modal = document.getElementById("login-modal");
        modal.hidden = true;
        modal.classList.remove("is-closing");
        document.getElementById("email").value = "";
        document.getElementById("password").value = "";
        document.getElementById("login-message").textContent = "";
        activateTab("home-section");
    });

    supabaseClient.auth.onAuthStateChange(event => {
        if (event === "SIGNED_OUT") {
            revision += 1;
            renderAccess(false);
        } else if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
            // Query auth/RPC after the Supabase callback releases its auth lock.
            defer(() => { void checkSession(); });
        }
    });

    return { checkSession, getIsAdministrator: () => administrator };
}
