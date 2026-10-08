const dialog = document.getElementById('player-lookup-dialog');
const frame = document.getElementById('player-lookup-frame');
const trigger = document.getElementById('open-player-lookup');
trigger.addEventListener('click', () => {
    if (!frame.hasAttribute('src')) frame.src = frame.dataset.src;
    dialog.showModal();
    resizeLookup();
});
document.getElementById('close-player-lookup').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});
dialog.addEventListener('close', () => trigger.focus());
let contentObserver;
function resizeLookup() {
    const card = frame.contentDocument?.querySelector('.player-lookup-card');
    if (!card || !dialog.open) return;
    const headerHeight = dialog.querySelector('.player-lookup-dialog-bar').getBoundingClientRect().height;
    const height = Math.ceil(card.getBoundingClientRect().height + headerHeight + 4);
    dialog.style.setProperty('--lookup-height', `${height}px`);
}
window.addEventListener('resize', resizeLookup);
frame.addEventListener('load', () => {
    contentObserver?.disconnect();
    contentObserver = new ResizeObserver(resizeLookup);
    contentObserver.observe(frame.contentDocument.querySelector('.player-lookup-card'));
    resizeLookup();
    frame.contentDocument.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && dialog.open) { event.preventDefault(); dialog.close(); }
    });
});

const explanation = document.getElementById('lookup-explanation');
document.getElementById('open-lookup-explanation').addEventListener('click', () => explanation.showModal());
document.getElementById('close-lookup-explanation').addEventListener('click', () => explanation.close());
