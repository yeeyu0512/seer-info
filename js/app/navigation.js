export function createNavigation({
    primaryMainTabs,
    seerLookup,
    votePanels,
    sealEncyclopediaSection,
    seerMintmarks,
    suitEncyclopediaSection,
    seerSuits,
    typeChartSection,
    trainingSection,
    seerTraining,
    accountSection,
    votingSubTabs,
    encyclopediaSubTabs,
    loadCurrentCompetitivePool,
    getIsAdministrator
}) {
    const voteSection = document.getElementById("vote-section");
    const aboutSection = document.getElementById("about-section");
    const homeSection = document.getElementById("home-section");
    const voteSubTabs = Array.from(votingSubTabs.querySelectorAll("[data-tab-target]"));
    const encyclopediaModeTabs = Array.from(encyclopediaSubTabs.querySelectorAll("[data-lookup-mode]"));
    const seerLookupSection = document.getElementById("seer-lookup-section");

    let currentVotePanelId = "selection-panel";

    const publicRoutes = {
        home: { section: "home-section" },
        pet: { section: "seer-lookup-section", mode: "pet" },
        skin: { section: "seer-lookup-section", mode: "skin" },
        mintmark: { section: "seal-encyclopedia-section" },
        suit: { section: "suit-encyclopedia-section" },
        types: { section: "type-chart-section" },
        training: { section: "training-section" },
        about: { section: "about-section" }
    };

    primaryMainTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.mainTarget;
            activateTab(target === "home" ? "home-section" : target === "voting"
                ? currentVotePanelId
                : target === "encyclopedia"
                    ? "seer-lookup-section"
                    : target === "type-chart"
                        ? "type-chart-section"
                        : target === "training"
                            ? "training-section"
                            : target === "account"
                                ? "account-section"
                                : "about-section");
        });
    });

    voteSubTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            activateTab(tab.dataset.tabTarget);
        });
    });

    encyclopediaModeTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            if (tab.dataset.lookupMode === "seal") {
                activateTab("seal-encyclopedia-section");
                return;
            }
            if (tab.dataset.lookupMode === "suit") {
                activateTab("suit-encyclopedia-section");
                return;
            }
            seerLookup.setMode(tab.dataset.lookupMode);
            activateTab("seer-lookup-section");
        });
    });

    function activateTab(targetId, { updateUrl = true } = {}) {
        if (!getIsAdministrator() && votePanels.has(targetId)) targetId = "seer-lookup-section";
        const isLookup = targetId === "seer-lookup-section";
        const isSealEncyclopedia = targetId === "seal-encyclopedia-section";
        const isSuitEncyclopedia = targetId === "suit-encyclopedia-section";
        const isTypeChart = targetId === "type-chart-section";
        const isTraining = targetId === "training-section";
        const isAccount = targetId === "account-section";
        const isAbout = targetId === "about-section";
        const isHome = targetId === "home-section";
        const mainTarget = isHome ? "home" : isAbout
            ? "about"
            : isAccount
                ? "account"
                : isTraining
                    ? "training"
                    : isTypeChart
                        ? "type-chart"
                        : isLookup || isSealEncyclopedia || isSuitEncyclopedia
                            ? "encyclopedia"
                            : "voting";
        if (!isLookup && !isAccount && !isTypeChart && votePanels.has(targetId)) currentVotePanelId = targetId;

        voteSection.hidden = mainTarget !== "voting";
        homeSection.hidden = !isHome;
        seerLookupSection.hidden = !isLookup;
        sealEncyclopediaSection.hidden = !isSealEncyclopedia;
        if (isSealEncyclopedia) seerMintmarks.load();
        suitEncyclopediaSection.hidden = !isSuitEncyclopedia;
        if (isSuitEncyclopedia) seerSuits.load();
        if (typeChartSection) typeChartSection.hidden = !isTypeChart;
        trainingSection.hidden = !isTraining;
        if (isTraining) seerTraining.load();
        accountSection.hidden = !isAccount;
        aboutSection.hidden = !isAbout;
        votingSubTabs.hidden = mainTarget !== "voting";
        encyclopediaSubTabs.hidden = mainTarget !== "encyclopedia";
        document.getElementById("type-chart-sub-tabs").hidden = !isTypeChart;
        votePanels.forEach((panel, panelId) => {
            panel.hidden = panelId !== currentVotePanelId;
        });
        primaryMainTabs.forEach((tab) => {
            const isActive = tab.dataset.mainTarget === mainTarget;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", String(isActive));
        });
        voteSubTabs.forEach((tab) => {
            const isActive = mainTarget === "voting" && tab.dataset.tabTarget === currentVotePanelId;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", String(isActive));
        });
        encyclopediaModeTabs.forEach((tab) => {
            const isActive = mainTarget === "encyclopedia" && (
                isSealEncyclopedia
                    ? tab.dataset.lookupMode === "seal"
                    : isSuitEncyclopedia
                        ? tab.dataset.lookupMode === "suit"
                        : tab.dataset.lookupMode === seerLookup.getMode()
            );
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", String(isActive));
        });

        if (targetId === "competitive-pool-section") loadCurrentCompetitivePool();
        if (isLookup) seerLookup.browseLatestIfEmpty();

        if (updateUrl) {
            const routeName = Object.keys(publicRoutes).find((key) => {
                const route = publicRoutes[key];
                return route.section === targetId &&
                    (!route.mode || route.mode === seerLookup.getMode());
            });

            if (routeName) {
                const url = new URL(window.location.href);

                if (routeName === "home") {
                    url.searchParams.delete("tab");
                } else {
                    url.searchParams.set("tab", routeName);
                }

                if (url.href !== window.location.href) {
                    window.history.pushState(null, "", url);
                }
            }
        }
    }

    function restoreRouteFromUrl({ initial = false } = {}) {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");

        if (!tab && initial) return;

        const route = publicRoutes[tab] || publicRoutes.home;

        if (route.mode) {
            seerLookup.setMode(route.mode);
        }

        activateTab(route.section, { updateUrl: false });
    }

    window.addEventListener("popstate", () => {
        restoreRouteFromUrl();
    });

    return { activateTab, restoreRouteFromUrl };
}