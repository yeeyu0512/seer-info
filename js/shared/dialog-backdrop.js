// A selection drag can produce a click on the dialog even when it began in an input.
// Only a primary-pointer click that starts and finishes on the backdrop dismisses it.
export function enableDialogBackdropClose(dialog) {
    let press = null;
    const outside = event => {
        if (event.target !== dialog) return false;
        const box = dialog.getBoundingClientRect();
        return event.clientX < box.left || event.clientX > box.right
            || event.clientY < box.top || event.clientY > box.bottom;
    };
    const distance = event => Math.hypot(event.clientX - press.x, event.clientY - press.y);
    dialog.addEventListener("pointerdown", event => {
        press = event.isPrimary && event.button === 0 && outside(event)
            ? { x: event.clientX, y: event.clientY, pointerId: event.pointerId } : null;
    });
    dialog.addEventListener("pointermove", event => {
        if (press && event.pointerId === press.pointerId && distance(event) > 8) press = null;
    });
    dialog.addEventListener("pointercancel", () => { press = null; });
    dialog.addEventListener("close", () => { press = null; });
    dialog.addEventListener("click", event => {
        const dismiss = press && event.button === 0 && event.detail > 0
            && outside(event) && distance(event) <= 8;
        press = null;
        if (dismiss) dialog.close();
    });
}
