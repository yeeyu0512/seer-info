import { typeIconUrl } from "../shared/assets.js";
export function createTypeLabel(type, text = type.name) {
    const label = document.createElement("span");
    label.className = "type-vs-inline-type";
    const icon = document.createElement("img");
    icon.src = typeIconUrl(type.id);
    icon.alt = "";
    label.append(icon, text);
    return label;
}

export function renderAttackTitle(title, attacker, defender, attackerText = attacker.name) {
    const action = document.createElement("span");
    action.className = "type-vs-attack-label";
    action.textContent = "攻擊";
    title.replaceChildren(createTypeLabel(attacker, attackerText), action, createTypeLabel(defender));
}
