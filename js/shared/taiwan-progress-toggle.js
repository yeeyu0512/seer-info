export function createTaiwanProgressToggle() {
    let enabled = false;
    const bindings = new Set();

    function setTaiwanProgressOnly(value) {
        const next = Boolean(value), changed = enabled !== next;
        enabled = next;
        for (const binding of bindings) {
            const needsUpdate = binding.input.checked !== next;
            binding.input.checked = next;
            if (changed || needsUpdate) binding.onChange(next);
        }
    }

    function bindTaiwanProgressToggle(input, onChange) {
        if (!input) return;
        input.checked = enabled;
        bindings.add({ input, onChange });
        input.addEventListener("change", () => setTaiwanProgressOnly(input.checked));
    }

    return { setTaiwanProgressOnly, bindTaiwanProgressToggle };
}

// The four catalog views share their own session-wide preference.
export const { setTaiwanProgressOnly, bindTaiwanProgressToggle } = createTaiwanProgressToggle();
