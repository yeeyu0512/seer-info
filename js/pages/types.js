import { initSeerTypeCalculator } from "../seer-type-calculator.js";

const calculator = initSeerTypeCalculator("#type-chart-section");
const id = new URLSearchParams(window.location.search).get("id");
if (calculator && /^[1-9][0-9]{0,9}$/.test(id || "")) {
    calculator.openLookup(Number(id));
    document.getElementById("type-calc-tab-lookup").focus({ preventScroll: true });
}
