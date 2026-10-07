
export function createNavigation({ primaryMainTabs, voteSubTabs, encyclopediaModeTabs, seerLookup, votePanels, voteSection, seerLookupSection, sealEncyclopediaSection, seerMintmarks, suitEncyclopediaSection, seerSuits, typeChartSection, trainingSection, seerTraining, accountSection, aboutSection, votingSubTabs, encyclopediaSubTabs, loadCurrentCompetitivePool, getIsAdministrator }) {
    let currentVotePanelId = "selection-panel";

    primaryMainTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.mainTarget;
            activateTab(target === "voting"
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

    function activateTab(targetId) {
        if (!getIsAdministrator() && votePanels.has(targetId)) targetId = "seer-lookup-section";
        const isLookup = targetId === "seer-lookup-section";
        const isSealEncyclopedia = targetId === "seal-encyclopedia-section";
        const isSuitEncyclopedia = targetId === "suit-encyclopedia-section";
        const isTypeChart = targetId === "type-chart-section";
        const isTraining = targetId === "training-section";
        const isAccount = targetId === "account-section";
        const isAbout = targetId === "about-section";
        const mainTarget = isAbout
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
    }
    return { activateTab };
}
