import { test } from "node:test";
import assert from "node:assert/strict";
import { bindTaiwanProgressToggle, setTaiwanProgressOnly } from "../js/shared/taiwan-progress-toggle.js";

test("catalog toggles synchronize changes and programmatic route resets without event loops", () => {
    const inputs = Array.from({length: 3}, () => Object.assign(new EventTarget(), {checked: false}));
    const changes = inputs.map(() => []);
    inputs.forEach((input, index) => bindTaiwanProgressToggle(input, value => changes[index].push(value)));
    inputs[0].checked = true;
    inputs[0].dispatchEvent(new Event("change"));
    assert(inputs.every(input => input.checked));
    const late = Object.assign(new EventTarget(), {checked: false});
    bindTaiwanProgressToggle(late, () => {});
    assert.equal(late.checked, true);
    inputs[2].checked = false;
    inputs[2].dispatchEvent(new Event("change"));
    assert([...inputs, late].every(input => !input.checked));
    setTaiwanProgressOnly(true);
    setTaiwanProgressOnly(false);
    assert.deepEqual(changes, inputs.map(() => [true, false, true, false]));
});
