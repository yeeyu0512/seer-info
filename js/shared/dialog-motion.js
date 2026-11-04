const states = new WeakMap();
const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Keep native modal/focus behavior; close only after the exit animation finishes.
export function openDialog(dialog) {
    let state = states.get(dialog);
    if (!state) {
        state = { timer: null };
        states.set(dialog, state);
        dialog.addEventListener('cancel', event => {
            if (event.defaultPrevented) return;
            event.preventDefault();
            closeDialog(dialog);
        });
        dialog.addEventListener('close', () => {
            if (dialog.open) return;
            clearTimeout(state.timer);
            state.timer = null;
            dialog.classList.remove('is-closing');
        });
    }
    clearTimeout(state.timer);
    state.timer = null;
    dialog.classList.remove('is-closing');
    dialog.classList.add('dialog-motion');
    if (!dialog.open) dialog.showModal();
}

export function closeDialog(dialog, returnValue) {
    if (!dialog.open) return;
    const state = states.get(dialog);
    if (!state || reducedMotion()) {
        dialog.close(returnValue);
        return;
    }
    if (state.timer !== null) return;
    dialog.classList.add('is-closing');
    state.timer = setTimeout(() => {
        state.timer = null;
        dialog.classList.remove('is-closing');
        if (dialog.open) dialog.close(returnValue);
    }, 180);
}
