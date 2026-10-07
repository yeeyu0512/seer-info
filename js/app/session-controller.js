export function createSessionController({
    document = globalThis.document,
    publicLoginPrompt,
    stopRankingRefresh,
    activateTab,
    loadGameAccount,
    selectionPanel,
    selectionBar,
    loadPool,
    loadRanking,
    startRankingRefresh,
    alreadyVoted,
    submitButton,
    voteMessage,
    mimiBindingPrompt,
    selectionCount,
    selectionMax,
    logout,
    loginModal,
    loginTrigger,
    primaryMainTabs,
    accountSection,
    resetPool,
    renderGameAccount,
    emailInput,
    passwordInput,
    passwordConfirmInput,
    mimiIdInput,
    setAuthMode,
    loginMessage,
    isAdmin,
    supabaseClient,
    getSession
}) {
    const logoutButton = document.getElementById("logout-button");
    const adminLink = document.getElementById("admin-link");
    const accountTab = document.getElementById("account-tab");

    let isAuthenticated = false;

    let isAdministrator = false;

    async function initializeAuthenticatedPage() {
        await syncAdminLink();
        if (!isAuthenticated) return;
        accountTab.hidden = false;
        publicLoginPrompt.hidden = true;
        if (!isAdministrator) {
            stopRankingRefresh();
            activateTab("seer-lookup-section");
            await loadGameAccount();
            return;
        }
        activateTab("selection-panel");
        selectionPanel.hidden = false;
        selectionBar.hidden = false;
        publicLoginPrompt.hidden = true;
        accountTab.hidden = false;
        await loadGameAccount();
        await loadPool();
        await loadRanking();
        startRankingRefresh();
    }

    async function initializePublicPage() {
        if (isAuthenticated) return;
        stopRankingRefresh();
        activateTab("seer-lookup-section");
        selectionBar.hidden = true;
        alreadyVoted.hidden = true;
        submitButton.hidden = true;
        voteMessage.textContent = "";
        publicLoginPrompt.hidden = true;
        mimiBindingPrompt.hidden = true;
        selectionCount.textContent = "0";
        selectionMax.textContent = "—";

    }

    logoutButton.addEventListener("click", async () => {
        const { error } = await logout();
        if (error) {
            console.error("Logout error:", error);
            return;
        }
        stopRankingRefresh();
        showLoggedOutView();
    });

    function showAuthenticatedView() {
        isAuthenticated = true;
        loginModal.classList.remove("is-closing");
        loginModal.hidden = true;
        loginTrigger.hidden = true;
        logoutButton.hidden = false;
        accountTab.hidden = false;
    }

    function showLoggedOutView() {
        isAuthenticated = false;
        isAdministrator = false;
        primaryMainTabs.find((tab) => tab.dataset.mainTarget === "voting").hidden = true;
        activateTab("seer-lookup-section");
        loginModal.classList.remove("is-closing");
        loginModal.hidden = true;
        loginTrigger.hidden = true;
        selectionBar.hidden = true;
        logoutButton.hidden = true;
        accountTab.hidden = true;
        accountSection.hidden = true;
        publicLoginPrompt.hidden = true;
        mimiBindingPrompt.hidden = true;
        resetPool();
        adminLink.hidden = true;
        renderGameAccount(null);
        alreadyVoted.hidden = true;
        emailInput.value = "";
        passwordInput.value = "";
        passwordConfirmInput.value = "";
        mimiIdInput.value = "";
        setAuthMode(false);
        loginMessage.textContent = "";
        voteMessage.textContent = "";
        submitButton.textContent = "提交投票";
    }

    async function syncAdminLink() {
        try {
            isAdministrator = (await isAdmin()) === true && isAuthenticated;
        } catch (error) {
            console.error("Admin status error:", error);
            isAdministrator = false;
        }
        adminLink.hidden = !isAdministrator;
        primaryMainTabs.find((tab) => tab.dataset.mainTarget === "voting").hidden = !isAdministrator;
    }

    supabaseClient.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
            stopRankingRefresh();
            showLoggedOutView();
            initializePublicPage();
        }
    });

    async function checkSession() {
        try {
            const session = await getSession();
            if (!session) {
                showLoggedOutView();
                await initializePublicPage();
                return;
            }
            showAuthenticatedView();
            await initializeAuthenticatedPage();
        } catch (error) {
            console.error("Session error:", error);
            showLoggedOutView();
        }
    }
    return { initializeAuthenticatedPage, initializePublicPage, showAuthenticatedView, showLoggedOutView, syncAdminLink, checkSession, getIsAuthenticated: () => isAuthenticated, getIsAdministrator: () => isAdministrator };
}
