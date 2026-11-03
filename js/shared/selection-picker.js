let nextId = 0;
const instances = new WeakMap();

export function createSelectionPicker(select, { triggerId, menuId, label } = {}) {
    if (instances.has(select)) return instances.get(select);
    const id = ++nextId;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "site-picker-trigger";
    trigger.id = triggerId || `site-picker-trigger-${id}`;
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = '<span></span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    const menu = document.createElement("div");
    menu.id = menuId || `site-picker-options-${id}`;
    menu.className = "site-picker-options";
    menu.role = "listbox";
    menu.setAttribute("popover", "auto");
    trigger.setAttribute("aria-controls", menu.id);
    const accessibleLabel = label || select.getAttribute("aria-label") || Array.from(select.labels || [], node => node.textContent.replace(select.textContent, "").trim()).join(" ") || "選擇選項";
    trigger.setAttribute("aria-label", accessibleLabel);
    menu.setAttribute("aria-label", accessibleLabel);
    const parentLabel = select.closest("label");
    if (parentLabel?.htmlFor === select.id) parentLabel.htmlFor = trigger.id;
    select.classList.add("site-picker-source");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    select.after(trigger);
    // Keep popovers inside dialogs so the dialog's focus boundary allows interaction.
    (select.closest("dialog, [role='dialog']") || document.body).append(menu);
    let buttons = [], signature = "";
    const close = (focus = false) => { menu.hidePopover(); trigger.setAttribute("aria-expanded", "false"); if (focus) trigger.focus({ preventScroll: true }); };
    function sync() {
        const options = Array.from(select.options);
        const nextSignature = JSON.stringify(options.map(option => [option.text, option.value, option.disabled || option.parentElement.disabled, option.hidden]));
        if (signature !== nextSignature) {
            signature = nextSignature;
            buttons = options.filter(option => !option.hidden).map(option => {
                const button = document.createElement("button");
                button.type = "button";
                button.role = "option";
                button.tabIndex = -1;
                button.textContent = option.text;
                button.dataset.value = option.value;
                button.disabled = option.disabled || !!option.parentElement.disabled;
                button.addEventListener("click", () => {
                    select.value = option.value;
                    select.dispatchEvent(new Event("input", { bubbles: true }));
                    select.dispatchEvent(new Event("change", { bubbles: true }));
                    close(true);
                });
                return button;
            });
            menu.replaceChildren(...buttons);
        }
        const text = select.selectedOptions[0]?.text || "請選擇";
        if (trigger.firstElementChild.textContent !== text) trigger.firstElementChild.textContent = text;
        if (trigger.disabled !== select.disabled) trigger.disabled = select.disabled;
        trigger.hidden = select.hidden;
        for (const button of buttons) {
            const selected = String(button.dataset.value === select.value);
            if (button.getAttribute("aria-selected") !== selected) button.setAttribute("aria-selected", selected);
        }
    }
    function position() {
        const box = trigger.getBoundingClientRect();
        const below = innerHeight - box.bottom - 12;
        const above = box.top - 12;
        const down = below >= 180 || below >= above;
        Object.assign(menu.style, { width: `${box.width}px`, left: `${Math.max(8, Math.min(box.left, innerWidth - box.width - 8))}px`, top: down ? `${box.bottom + 5}px` : "auto", bottom: down ? "auto" : `${innerHeight - box.top + 5}px`, maxHeight: `${Math.max(44, Math.min(240, down ? below : above))}px` });
    }
    function open() {
        sync(); position(); menu.showPopover(); trigger.setAttribute("aria-expanded", "true");
        (buttons.find(button => button.dataset.value === select.value && !button.disabled) || buttons.find(button => !button.disabled))?.focus({ preventScroll: true });
        menu.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    }
    trigger.addEventListener("click", event => { event.preventDefault(); menu.matches(":popover-open") ? close(true) : open(); });
    trigger.addEventListener("keydown", event => {
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault(); open();
    });
    menu.addEventListener("keydown", event => {
        if (event.key === "Escape" || event.key === "Tab") {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); }
            close(true); return;
        }
        const enabled = buttons.filter(button => !button.disabled);
        const index = enabled.indexOf(document.activeElement);
        const next = { ArrowDown: (index + 1) % enabled.length, ArrowUp: (index + enabled.length - 1) % enabled.length, Home: 0, End: enabled.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault(); enabled[next]?.focus();
    });
    menu.addEventListener("toggle", () => trigger.setAttribute("aria-expanded", String(menu.matches(":popover-open"))));
    const reposition = () => { if (menu.matches(":popover-open")) position(); };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    select.addEventListener("change", sync);
    select.addEventListener("invalid", () => trigger.focus());
    select.form?.addEventListener("reset", () => queueMicrotask(sync));
    // Existing renderers assign select.value directly when restoring saved configurations.
    for (const property of ["value", "selectedIndex"]) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, property);
        Object.defineProperty(select, property, { configurable: true, get() { return descriptor.get.call(this); }, set(value) { descriptor.set.call(this, value); sync(); } });
    }
    const observer = new MutationObserver(sync);
    observer.observe(select, { childList: true, subtree: true, characterData: true, attributes: true });
    const instance = { trigger, menu, sync, destroy() {
        observer.disconnect(); close(); menu.remove(); trigger.remove();
        window.removeEventListener("resize", reposition); window.removeEventListener("scroll", reposition, true);
        instances.delete(select);
    } };
    instances.set(select, instance);
    sync();
    return instance;
}

export function initSelectionPickers(root = document.body) {
    const active = new Map();
    const scan = () => {
        for (const [select, picker] of active) if (!select.isConnected) { picker.destroy(); active.delete(select); }
        root.querySelectorAll("select:not([hidden]):not([multiple])").forEach(select => {
            if (instances.has(select) || select.closest(".mint-series-combobox, .flatpickr-calendar")) return;
            active.set(select, createSelectionPicker(select));
        });
    };
    scan();
    new MutationObserver(scan).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
}
