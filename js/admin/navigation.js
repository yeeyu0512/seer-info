export function createAdminNavigation({
    adminToolTabs
}) {
    const adminToolPanels = adminToolTabs.map((tab) => document.getElementById(tab.dataset.adminTab));

    adminToolTabs.forEach((tab) => {
        tab.addEventListener("click", () => activateAdminTool(tab.dataset.adminTab));
        tab.addEventListener("keydown", (event) => {
            const index = adminToolTabs.indexOf(tab);
            let nextIndex = null;
            if (event.key === "ArrowRight") nextIndex = (index + 1) % adminToolTabs.length;
            if (event.key === "ArrowLeft") nextIndex = (index - 1 + adminToolTabs.length) % adminToolTabs.length;
            if (event.key === "Home") nextIndex = 0;
            if (event.key === "End") nextIndex = adminToolTabs.length - 1;
            if (nextIndex === null) return;
            event.preventDefault();
            adminToolTabs[nextIndex].focus();
            adminToolTabs[nextIndex].click();
        });
    });

    function activateAdminTool(panelId) {
        adminToolPanels.forEach((panel) => {
            panel.hidden = panel.id !== panelId;
        });
        adminToolTabs.forEach((tab) => {
            const isSelected = tab.dataset.adminTab === panelId;
            tab.classList.toggle("is-active", isSelected);
            tab.setAttribute("aria-selected", String(isSelected));
            tab.tabIndex = isSelected ? 0 : -1;
        });
    }
    return { activateAdminTool };
}
