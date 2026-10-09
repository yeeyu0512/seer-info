export function initAbout(root = document.getElementById('about-section')) {
    if (!root) return;
    const copyStatus = root.querySelector('.about-copy-status');
    root.querySelectorAll('[data-copy-contact]').forEach(button => {
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(button.dataset.copyContact);
                copyStatus.textContent = 'Discord 帳號已複製。';
            } catch {
                copyStatus.textContent = '無法自動複製，請手動複製 @zerof0512。';
            }
        });
    });
    const tabs = [...root.querySelectorAll('[data-about-tab]')];
    const panels = [...root.querySelectorAll('.about-detail-card')];
    function select(tab) {
        tabs.forEach(item => {
            const active = item === tab;
            item.setAttribute('aria-selected', String(active));
            item.tabIndex = active ? 0 : -1;
        });
        panels.forEach(panel => { panel.hidden = panel.id !== tab.dataset.aboutTab; });
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => select(tab));
        tab.addEventListener('keydown', event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = tabs.length - 1;
            else return;
            event.preventDefault(); select(tabs[next]); tabs[next].focus();
        });
    });
}
