import { typeIconUrl, genderIconUrl, ASSETS } from "../shared/assets.js";
import { SEER_TYPE_DATA } from "../seer-type-data.js";

export function createPetInfoView({ seerPetInfoPanel, seerPetInfoTitle, seerPetInfoAvatar, seerPetInfoMeta, convertToTraditionalChinese, openTypeLookup, closeSeerPetInfoModal, resolveSeerWikiSoulmarkImage }) {
    function renderSeerPetInfo(pet, skills, soulmarks, advanceStats, advanceLoadError, typeDetails, activationItemsById) {
        seerPetInfoPanel.replaceChildren();
        renderSeerPetInfoIdentity(pet, typeDetails);

        const statsSection = document.createElement("section");
        statsSection.className = "seer-pet-info-section";
        const statsTitle = document.createElement("h3");
        statsTitle.textContent = "種族值";
        const statNames = [
            ["hp", "體力"], ["atk", "攻擊"], ["def", "防禦"],
            ["sp_atk", "特攻"], ["sp_def", "特防"], ["spd", "速度"]
        ];
        const createStatGrid = (stats) => {
            const grid = document.createElement("dl");
            grid.className = "seer-pet-stat-grid";
            statNames.forEach(([key, label]) => {
                const item = document.createElement("div");
                const term = document.createElement("dt");
                term.textContent = label;
                const value = document.createElement("dd");
                value.textContent = stats[key] === undefined || stats[key] === null
                    ? "—"
                    : String(stats[key]);
                item.append(term, value);
                grid.append(item);
            });
            const total = document.createElement("div");
            total.className = "seer-pet-stat-total";
            const totalTerm = document.createElement("dt");
            totalTerm.textContent = "總和";
            const totalValue = document.createElement("dd");
            totalValue.textContent = stats.total === undefined || stats.total === null
                ? "—"
                : String(stats.total);
            total.append(totalTerm, totalValue);
            grid.append(total);
            return grid;
        };
        const normalStats = pet.base_stats || {};
        if (advanceStats) {
            const tabList = document.createElement("div");
            tabList.className = "seer-pet-stat-tabs";
            tabList.setAttribute("role", "tablist");
            tabList.setAttribute("aria-label", "種族值狀態");
            const normalTab = document.createElement("button");
            const advancedTab = document.createElement("button");
            const normalPanel = createStatGrid(normalStats);
            const advancedPanel = createStatGrid(advanceStats);
            normalTab.className = "seer-pet-stat-tab";
            advancedTab.className = "seer-pet-stat-tab";
            normalTab.type = "button";
            advancedTab.type = "button";
            normalTab.id = `seer-stat-tab-${pet.id}-normal`;
            advancedTab.id = `seer-stat-tab-${pet.id}-advance`;
            normalPanel.id = `seer-stat-panel-${pet.id}-normal`;
            advancedPanel.id = `seer-stat-panel-${pet.id}-advance`;
            normalTab.setAttribute("role", "tab");
            advancedTab.setAttribute("role", "tab");
            normalTab.setAttribute("aria-controls", normalPanel.id);
            advancedTab.setAttribute("aria-controls", advancedPanel.id);
            normalTab.setAttribute("aria-selected", "true");
            advancedTab.setAttribute("aria-selected", "false");
            normalTab.tabIndex = 0;
            advancedTab.tabIndex = -1;
            normalTab.textContent = "覺醒前";
            advancedTab.textContent = "神諭覺醒";
            normalPanel.setAttribute("role", "tabpanel");
            advancedPanel.setAttribute("role", "tabpanel");
            normalPanel.setAttribute("aria-labelledby", normalTab.id);
            advancedPanel.setAttribute("aria-labelledby", advancedTab.id);
            normalPanel.tabIndex = 0;
            advancedPanel.tabIndex = 0;
            advancedPanel.hidden = true;
            const activateStatsTab = (isAdvanced, moveFocus = false) => {
                normalTab.setAttribute("aria-selected", String(!isAdvanced));
                advancedTab.setAttribute("aria-selected", String(isAdvanced));
                normalTab.tabIndex = isAdvanced ? -1 : 0;
                advancedTab.tabIndex = isAdvanced ? 0 : -1;
                normalPanel.hidden = isAdvanced;
                advancedPanel.hidden = !isAdvanced;
                if (moveFocus) (isAdvanced ? advancedTab : normalTab).focus();
            };
            [[normalTab, false], [advancedTab, true]].forEach(([tab, isAdvanced]) => {
                tab.addEventListener("click", () => activateStatsTab(isAdvanced));
                tab.addEventListener("keydown", (event) => {
                    let selectAdvanced;
                    if (event.key === "Home") {
                        selectAdvanced = false;
                    } else if (event.key === "End") {
                        selectAdvanced = true;
                    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
                        selectAdvanced = !isAdvanced;
                    } else {
                        return;
                    }
                    event.preventDefault();
                    activateStatsTab(selectAdvanced, true);
                });
            });
            tabList.append(normalTab, advancedTab);
            statsSection.append(statsTitle, tabList, normalPanel, advancedPanel);
        } else {
            statsSection.append(statsTitle, createStatGrid(normalStats));
            if (advanceLoadError) {
                const advanceMessage = document.createElement("p");
                advanceMessage.className = "seer-pet-info-message";
                advanceMessage.textContent = "神諭覺醒種族值暫時無法取得。";
                statsSection.append(advanceMessage);
            }
        }
        seerPetInfoPanel.append(statsSection);

        const skillsSection = document.createElement("section");
        skillsSection.className = "seer-pet-info-section";
        const skillsTitle = document.createElement("h3");
        skillsTitle.textContent = `技能（${skills.length}）`;
        const skillCategories = [
            { key: "normal", label: "普通技能", skills: [] },
            { key: "advanced", label: "神諭覺醒", skills: [] },
            { key: "special", label: "特殊學習", skills: [] }
        ];
        skills.forEach((skill) => {
            const { is_advanced: isAdvanced, is_special: isSpecial } = skill.reference;
            if (isAdvanced) {
                skillCategories.find((item) => item.key === "advanced").skills.push(skill);
            }
            if (isSpecial) {
                skillCategories.find((item) => item.key === "special").skills.push(skill);
            }
            if (!isAdvanced && !isSpecial) {
                skillCategories.find((item) => item.key === "normal").skills.push(skill);
            }
        });
        const visibleSkillCategories = skillCategories.filter((category) => category.skills.length);
        const hasClassifiedSkills = skills.some(({ reference }) => reference.is_advanced || reference.is_special);
        const renderSkillList = (categorySkills) => {
            const skillList = document.createElement("div");
            skillList.className = "seer-pet-skill-list";
            categorySkills
                .slice()
                .sort((first, second) => Number(first.reference.learning_level) - Number(second.reference.learning_level))
                .forEach(({ reference, record }) => {
                    const item = document.createElement("article");
                    item.className = "seer-pet-skill";
                    const heading = document.createElement("div");
                    heading.className = "seer-pet-skill-heading";
                    const nameGroup = document.createElement("div");
                    nameGroup.className = "seer-pet-skill-name";
                    const typeId = Number(record && record.type && record.type.id);
                    if (Number.isSafeInteger(typeId) && typeId > 0) {
                        const typeIcon = document.createElement("img");
                        typeIcon.className = "seer-pet-skill-type-icon";
                        typeIcon.src = Number(record && record.category && record.category.id) === 4
                            ? ASSETS.attributeSkill
                            : typeIconUrl(typeId);
                        typeIcon.alt = "";
                        typeIcon.setAttribute("aria-hidden", "true");
                        typeIcon.loading = "lazy";
                        typeIcon.addEventListener("error", () => typeIcon.remove(), { once: true });
                        nameGroup.append(typeIcon);
                    }
                    const name = document.createElement("strong");
                    name.textContent = convertToTraditionalChinese(record && record.name || "技能資料未提供");
                    nameGroup.append(name);
                    if (reference.is_fifth) {
                        const fifth = document.createElement("span");
                        fifth.className = "seer-pet-skill-badge";
                        fifth.textContent = "第五技能";
                        nameGroup.append(fifth);
                    }
                    heading.append(nameGroup);
                    const learningLevel = Number(reference.learning_level);
                    const learningLevelText = Number.isFinite(learningLevel)
                        ? `學習等級：${learningLevel}級`
                        : "學習等級：特殊";
                    const statsText = document.createElement("p");
                    const power = record && record.power !== null && record.power !== undefined ? record.power : "—";
                    const pp = record && record.max_pp !== null && record.max_pp !== undefined ? record.max_pp : "—";
                    const accuracy = record && record.accuracy !== null && record.accuracy !== undefined ? `${record.accuracy}%` : "—";
                    statsText.textContent = `威力 ${power} · PP ${pp} · 命中 ${accuracy} · ${learningLevelText}`;
                    item.append(heading, statsText);
                    const activationItemId = reference.skill_activation_item
                        && reference.skill_activation_item.id;
                    const activationItem = activationItemId === undefined || activationItemId === null
                        ? null
                        : activationItemsById.get(String(activationItemId));
                    const skillEffects = Array.isArray(record && record.skill_effect)
                        ? record.skill_effect
                        : [];
                    const effectTexts = skillEffects
                        .map((effect) => {
                            if (effect && typeof effect.info === "string" && effect.info.trim()) {
                                return effect.info.trim();
                            }
                            if (!effect || typeof effect.analyze_info !== "string" || !effect.analyze_info.trim()) {
                                return "";
                            }
                            return effect.analyze_info
                                .replace(/\[(?:sprite\s+[^\]]+|\/?color(?:=[^\]]*)?)\]/gi, "")
                                .trim();
                        })
                        .filter(Boolean);
                    if (effectTexts.length) {
                        const effects = document.createElement("ul");
                        effects.className = "seer-pet-skill-effects";
                        effectTexts.forEach((effectText) => {
                            const effectItem = document.createElement("li");
                            effectItem.textContent = convertToTraditionalChinese(effectText);
                            effects.append(effectItem);
                        });
                        item.append(effects);
                    }
                    if (record && record.info) {
                        const description = document.createElement("p");
                        description.className = "seer-pet-skill-description";
                        description.textContent = convertToTraditionalChinese(String(record.info));
                        item.append(description);
                    }
                    if (activationItem && activationItem.name) {
                        const activationItemText = document.createElement("p");
                        activationItemText.className = "seer-pet-skill-activation-item";
                        const itemNumber = Number(activationItem.item_number);
                        const itemCount = Number.isFinite(itemNumber) && itemNumber > 1
                            ? ` ×${itemNumber}`
                            : "";
                        activationItemText.textContent =
                            `學習道具：${convertToTraditionalChinese(String(activationItem.name))}${itemCount}`;
                        item.append(activationItemText);
                    }
                    skillList.append(item);
                });
            if (!categorySkills.length) {
                const empty = document.createElement("p");
                empty.className = "seer-pet-info-message";
                empty.textContent = "沒有技能資料。";
                skillList.append(empty);
            }
            return skillList;
        };
        if (hasClassifiedSkills) {
            const tabList = document.createElement("div");
            tabList.className = "seer-pet-stat-tabs seer-pet-skill-tabs";
            tabList.setAttribute("role", "tablist");
            tabList.setAttribute("aria-label", "技能分類");
            const panels = visibleSkillCategories.map((category) => {
                const tab = document.createElement("button");
                const panel = renderSkillList(category.skills);
                const categoryId = `seer-skill-${String(pet.id || "pet").replace(/[^\w-]/g, "-")}-${category.key}`;
                tab.className = "seer-pet-stat-tab";
                tab.type = "button";
                tab.id = `${categoryId}-tab`;
                tab.setAttribute("role", "tab");
                tab.setAttribute("aria-controls", `${categoryId}-panel`);
                tab.setAttribute("aria-selected", "false");
                tab.tabIndex = -1;
                tab.textContent = `${category.label}（${category.skills.length}）`;
                panel.id = `${categoryId}-panel`;
                panel.setAttribute("role", "tabpanel");
                panel.setAttribute("aria-labelledby", tab.id);
                panel.tabIndex = 0;
                panel.hidden = true;
                tab.addEventListener("click", () => activateSkillTab(category.key));
                tab.addEventListener("keydown", (event) => {
                    const currentIndex = visibleSkillCategories.findIndex((item) => item.key === category.key);
                    let nextIndex;
                    if (event.key === "Home") nextIndex = 0;
                    else if (event.key === "End") nextIndex = visibleSkillCategories.length - 1;
                    else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                        nextIndex = (currentIndex + 1) % visibleSkillCategories.length;
                    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                        nextIndex = (currentIndex - 1 + visibleSkillCategories.length) % visibleSkillCategories.length;
                    } else return;
                    event.preventDefault();
                    activateSkillTab(visibleSkillCategories[nextIndex].key, true);
                });
                tabList.append(tab);
                return { category, tab, panel };
            });
            const activateSkillTab = (selectedKey, moveFocus = false) => {
                panels.forEach(({ category, tab, panel }) => {
                    const selected = category.key === selectedKey;
                    tab.setAttribute("aria-selected", String(selected));
                    tab.tabIndex = selected ? 0 : -1;
                    panel.hidden = !selected;
                    if (selected && moveFocus) tab.focus();
                });
            };
            skillsSection.append(skillsTitle, tabList, ...panels.map(({ panel }) => panel));
            activateSkillTab(visibleSkillCategories[0].key);
        } else {
            skillsSection.append(skillsTitle, renderSkillList(skills));
        }
        seerPetInfoPanel.append(skillsSection);

        const soulmarkSection = document.createElement("section");
        soulmarkSection.className = "seer-pet-info-section";
        const soulmarkTitle = document.createElement("h3");
        soulmarkTitle.textContent = "魂印";
        soulmarkSection.append(soulmarkTitle);
        if (!soulmarks.length) {
            const empty = document.createElement("p");
            empty.className = "seer-pet-info-message";
            empty.textContent = "沒有魂印資料。";
            soulmarkSection.append(empty);
        }
        const soulmarkTabPrefix = `seer-soulmark-${String(pet.id || "pet").replace(/[^\w-]/g, "-")}`;
        const soulmarkCards = soulmarks.map(({ reference, record }, index) => {
            const soulmarkId = record && record.id || reference.id;
            const card = document.createElement("article");
            card.className = "seer-pet-soulmark-card";
            card.id = `${soulmarkTabPrefix}-panel-${index}`;
            if (soulmarkId) {
                const image = document.createElement("img");
                image.className = "seer-pet-soulmark-image";
                image.alt = `魂印 ${soulmarkId}`;
                image.loading = "lazy";
                resolveSeerWikiSoulmarkImage(soulmarkId)
                    .then((imageUrl) => {
                        if (imageUrl) image.src = imageUrl;
                        else image.hidden = true;
                    })
                    .catch((error) => {
                        console.warn(`Load wiki soulmark image ${soulmarkId} error:`, error);
                        image.hidden = true;
                    });
                image.addEventListener("error", () => {
                    image.hidden = true;
                }, { once: true });
                card.append(image);
            }
            const description = document.createElement("p");
            description.className = "seer-pet-soulmark";
            const descriptionText = [
                record && record.desc,
                record && record.desc_formatting_adjustment,
                record && record.analyze_desc
            ].find((value) => typeof value === "string" && value.trim());
            if (descriptionText) {
                const lines = convertToTraditionalChinese(descriptionText.trim())
                    .replace(/\s*\|\s*/g, "\n")
                    .split(/\n/)
                    .map((line) => line.trim().replace(/[;；]\s*$/u, ""))
                    .filter((line) => line && !/^[;；]+$/u.test(line));
                description.textContent = lines
                    .map((line) => /^\[[^\]]+\]\s*[：:]?$/.test(line) ? line : `• ${line}`)
                    .join("\n");
            } else {
                description.textContent = `魂印 #${soulmarkId || "?"} 描述未提供。`;
            }
            card.append(description);
            return {
                card,
                id: soulmarkId,
                name: record && record.name,
                index
            };
        });
        if (soulmarkCards.length > 1) {
            const tabList = document.createElement("div");
            tabList.className = "seer-pet-soulmark-tabs";
            tabList.setAttribute("role", "tablist");
            tabList.setAttribute("aria-label", "魂印");
            const activateTab = (selectedIndex, moveFocus = false) => {
                soulmarkCards.forEach(({ card }, tabIndex) => {
                    const tab = tabList.children[tabIndex];
                    const isSelected = tabIndex === selectedIndex;
                    tab.setAttribute("aria-selected", String(isSelected));
                    tab.tabIndex = isSelected ? 0 : -1;
                    card.hidden = !isSelected;
                    if (moveFocus && isSelected) tab.focus();
                });
            };
            soulmarkCards.forEach(({ card }, tabIndex) => {
                const tab = document.createElement("button");
                const tabId = `${soulmarkTabPrefix}-tab-${tabIndex}`;
                tab.className = "seer-pet-soulmark-tab";
                tab.id = tabId;
                tab.type = "button";
                tab.setAttribute("role", "tab");
                tab.setAttribute("aria-controls", card.id);
                tab.setAttribute("aria-selected", String(tabIndex === 0));
                tab.tabIndex = tabIndex === 0 ? 0 : -1;
                tab.textContent = tabIndex === 0
                    ? "強化前"
                    : tabIndex === 1
                        ? "強化後"
                        : `強化後${tabIndex}`;
                card.setAttribute("role", "tabpanel");
                card.setAttribute("aria-labelledby", tabId);
                card.tabIndex = 0;
                card.hidden = tabIndex !== 0;
                tab.addEventListener("click", () => activateTab(tabIndex));
                tab.addEventListener("keydown", (event) => {
                    let nextIndex;
                    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                        nextIndex = (tabIndex + 1) % soulmarkCards.length;
                    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                        nextIndex = (tabIndex - 1 + soulmarkCards.length) % soulmarkCards.length;
                    } else if (event.key === "Home") {
                        nextIndex = 0;
                    } else if (event.key === "End") {
                        nextIndex = soulmarkCards.length - 1;
                    } else {
                        return;
                    }
                    event.preventDefault();
                    activateTab(nextIndex, true);
                });
                tabList.append(tab);
            });
            soulmarkSection.append(tabList);
            soulmarkCards.forEach(({ card }) => soulmarkSection.append(card));
        } else {
            soulmarkCards.forEach(({ card }) => soulmarkSection.append(card));
        }
        seerPetInfoPanel.insertBefore(soulmarkSection, skillsSection);
    }

    function renderSeerPetInfoIdentity(pet, typeDetails) {
        const petId = String(pet.id || "");
        const petName = convertToTraditionalChinese(String(pet.name || "精靈"));
        seerPetInfoTitle.textContent = petName;
        seerPetInfoAvatar.hidden = !petId;
        seerPetInfoAvatar.alt = `${petName}縮圖`;
        if (petId) {
            seerPetInfoAvatar.src =
                `https://newseer.61.com/web/monster/head/${encodeURIComponent(petId)}.png`;
        } else {
            seerPetInfoAvatar.removeAttribute("src");
        }
        seerPetInfoAvatar.onerror = () => {
            seerPetInfoAvatar.hidden = true;
        };
        seerPetInfoMeta.replaceChildren();

        const addMeta = (label, value, iconUrl = "", onClick = null) => {
            const item = document.createElement(onClick ? "button" : "span");
            item.className = "seer-pet-info-meta-item";
            item.setAttribute("aria-label", `${label} ${value}`);
            if (onClick) {
                item.type = "button";
                item.classList.add("seer-pet-info-type-link");
                item.title = `查看${value}屬性克制`;
                item.setAttribute("aria-label", `查看${value}屬性克制`);
                item.addEventListener("click", onClick);
            }
            if (iconUrl) {
                const icon = document.createElement("img");
                icon.src = iconUrl;
                icon.alt = "";
                icon.loading = "lazy";
                icon.addEventListener("error", () => icon.remove(), { once: true });
                item.append(icon);
            }
            const text = document.createElement("span");
            text.textContent = value;
            item.append(text);
            seerPetInfoMeta.append(item);
        };

        addMeta("編號", `#${petId}`);
        const genderId = Number(pet.gender && pet.gender.id);
        const gender = {
            0: ["無性", genderIconUrl("sexless")],
            1: ["雄性", genderIconUrl("male")],
            2: ["雌性", genderIconUrl("female")]
        }[genderId];
        addMeta("性別", gender ? gender[0] : "未知", gender && gender[1]);
        const typeId = typeDetails && typeDetails.id || pet.type && pet.type.id;
        const typeName = typeDetails && typeDetails.name;
        addMeta(
            "屬性",
            typeName || "",
            typeId ? typeIconUrl(encodeURIComponent(typeId)) : "",
            openTypeLookup && SEER_TYPE_DATA.combinations.some(type => type.id === Number(typeId))
                ? () => {
                    closeSeerPetInfoModal(false);
                    window.setTimeout(() => openTypeLookup(Number(typeId)), 180);
                }
                : null
        );
    }
    return { renderSeerPetInfo, renderSeerPetInfoIdentity };
}
