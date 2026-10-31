import { enableDialogBackdropClose } from './shared/dialog-backdrop.js';

const dialog = document.getElementById('player-lookup-dialog');
const card = dialog.querySelector('.player-lookup-card');
let lastTrigger;
document.querySelectorAll('[data-open-player-lookup]').forEach(trigger => trigger.addEventListener('click', () => {
    lastTrigger = trigger;
    import('./player-lookup.js');
    dialog.showModal();
    resizeLookup();
}));
document.getElementById('close-player-lookup').addEventListener('click', () => dialog.close());
enableDialogBackdropClose(dialog);
dialog.addEventListener('close', () => {
    const menu = lastTrigger?.closest('details');
    const target = menu && !menu.open ? menu.querySelector('summary') : lastTrigger;
    target?.focus({ preventScroll: true });
});
function resizeLookup() {
    if (!card || !dialog.open) return;
    const headerHeight = dialog.querySelector('.player-lookup-dialog-bar').getBoundingClientRect().height;
    const height = Math.ceil(card.getBoundingClientRect().height + headerHeight + 4);
    dialog.style.setProperty('--lookup-height', `${height}px`);
}
window.addEventListener('resize', resizeLookup);
const contentObserver = new ResizeObserver(resizeLookup);
contentObserver.observe(card);

const explanation = document.getElementById('lookup-explanation');
document.getElementById('open-lookup-explanation').addEventListener('click', () => explanation.showModal());
document.getElementById('close-lookup-explanation').addEventListener('click', () => explanation.close());
