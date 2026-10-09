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
    const encyclopediaNav = document.getElementById("encyclopedia-nav");
    const encyclopediaNavSummary = encyclopediaNav?.querySelector?.("summary");
    const encyclopediaNavOptions = Array.from(encyclopediaNav?.querySelectorAll?.("[data-lookup-mode]") ?? []);
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
        tab.addEventListener("click", () => activateEncyclopediaMode(tab.dataset.lookupMode));
    });

    encyclopediaNavOptions.forEach((option) => {
        option.addEventListener("click", () => activateEncyclopediaMode(option.dataset.lookupMode));
    });

    function activateEncyclopediaMode(mode) {
        if (mode === "seal") {
            activateTab("seal-encyclopedia-section");
            return;
        }
        if (mode === "suit") {
            activateTab("suit-encyclopedia-section");
            return;
        }
        seerLookup.setMode(mode);
        activateTab("seer-lookup-section");
    }

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
        else seerTraining.cancelRestore?.();
        accountSection.hidden = !isAccount;
        aboutSection.hidden = !isAbout;
        votingSubTabs.hidden = mainTarget !== "voting";
        encyclopediaSubTabs.hidden = mainTarget !== "encyclopedia";
        encyclopediaNavSummary?.classList.toggle("is-active", mainTarget === "encyclopedia");
        encyclopediaNavSummary?.setAttribute("aria-selected", String(mainTarget === "encyclopedia"));
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
        encyclopediaNavOptions.forEach((option) => {
            const isActive = mainTarget === "encyclopedia" && (
                isSealEncyclopedia ? option.dataset.lookupMode === "seal"
                    : isSuitEncyclopedia ? option.dataset.lookupMode === "suit"
                        : option.dataset.lookupMode === seerLookup.getMode()
            );
            option.classList.toggle("is-active", isActive);
            option.setAttribute("aria-pressed", String(isActive));
        });

        if (targetId === "competitive-pool-section") loadCurrentCompetitivePool();
        if (isLookup) seerLookup.browseLatestIfEmpty();

        if (updateUrl) {
            const routeName = Object.keys(publicRoutes).find((key) => {
                const route = publicRoutes[key];
                return route.section === targetId &&
                    (!route.mode || route.mode === seerLookup.getMode());
            });

            if (!routeName) {
                const url = new URL(window.location.href);
                url.searchParams.delete("build"); url.searchParams.delete("tab");
                if (url.href !== window.location.href) window.history.pushState(null,"",url);
            }
            if (routeName) {
                const url = new URL(window.location.href);

                if (url.searchParams.get("tab") !== routeName) url.searchParams.delete("id");

                if (routeName !== "training") url.searchParams.delete("build");

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

        const id = params.get("id");
        if (tab === "pet" && /^[1-9][0-9]{0,9}$/.test(id || "")) seerLookup.searchPetById(id);
        if (tab === "skin" && /^[1-9][0-9]{0,9}$/.test(id || "")) seerLookup.searchSkinById(id);
        activateTab(route.section, { updateUrl: false });
        if (/^[1-9][0-9]{0,9}$/.test(id || "")) {
            if (tab === "mintmark") void seerMintmarks.searchById(id);
            if (tab === "suit") void seerSuits.searchById(id);
        }
        if (tab === "training" && params.has("build")) seerTraining.restoreBuild(params.get("build"));
        else seerTraining.cancelRestore?.();
    }

    window.addEventListener("popstate", () => {
        restoreRouteFromUrl();
    });

    return { activateTab, restoreRouteFromUrl };
}
