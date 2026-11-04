// One session-wide preference shared by the four catalog views.
let enabled = false;
const bindings = new Set();

export function setTaiwanProgressOnly(value) {
    const next = Boolean(value), changed = enabled !== next;
    enabled = next;
    for (const binding of bindings) {
        const needsUpdate = binding.input.checked !== next;
        binding.input.checked = next;
        if (changed || needsUpdate) binding.onChange(next);
    }
}

export function bindTaiwanProgressToggle(input, onChange) {
    if (!input) return;
    input.checked = enabled;
    const binding = { input, onChange };
    bindings.add(binding);
    input.addEventListener("change", () => setTaiwanProgressOnly(input.checked));
}
