import {typeIconUrl} from "../shared/assets.js";

export function createPetResultButton(pet,typeDetailsById,traditional,{showAdvance = false} = {}) {
    const button = document.createElement("button"); button.className = "seer-lookup-result"; button.type = "button";
    const content = document.createElement("span"); content.className = "seer-lookup-result-content";
    const visual = document.createElement("span"); visual.className = "seer-lookup-result-thumbnail";
    const thumbnail = document.createElement("img"); thumbnail.src = `https://newseer.61.com/web/monster/head/${encodeURIComponent(pet.id)}.png`;
    thumbnail.alt = `${traditional(pet.name || "精靈")}頭像`; thumbnail.loading = "lazy";
    thumbnail.addEventListener("error",() => {thumbnail.hidden = true;}); visual.append(thumbnail);
    const typeDetails = typeDetailsById.get(String(pet.type?.id || pet.typeId));
    const type = document.createElement("span"); type.className = "seer-lookup-result-type";
    if (typeDetails) {const icon = document.createElement("img"); icon.src = typeIconUrl(typeDetails.id); icon.alt = typeDetails.name || "屬性"; type.append(icon);} else type.textContent = "-";
    const name = document.createElement("strong"); name.className = "seer-lookup-result-name"; name.textContent = traditional(pet.name || "未命名精靈");
    content.append(visual,type,name);
    if (showAdvance && pet.advance?.id != null) {const badge = document.createElement("span"); badge.className = "training-advance-badge"; badge.textContent = "可覺醒"; badge.title = "此精靈可神諭覺醒"; content.append(badge);}
    const id = document.createElement("span"); id.className = "seer-lookup-result-id"; id.textContent = `#${pet.id}`;
    button.append(content,id); return button;
}
