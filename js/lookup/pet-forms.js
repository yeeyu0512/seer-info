// Unity monsters.json and hideMoves.json from the 2026-11-06 config update:
// https://github.com/SeerAPI/config-sources/tree/e9ff26c64d7438c765faca2a3b04ad212c135750/unity
export const localSpPet = {
    id: 13311,
    name: "聖光靈神 SP",
    searchAliases: ["聖光靈神SP"],
    type: { id: 65 },
    gender: { id: 1 },
    base_stats: { hp: 180, atk: 160, def: 120, sp_atk: 80, sp_def: 120, spd: 140, total: 800 },
    skill: [
        [12897, 1], [21506, 5], [12898, 9], [12903, 13], [20307, 17], [16684, 21],
        [14733, 25], [22358, 29], [14730, 33], [16685, 37], [23685, 41], [16686, 45],
        [23686, 49], [16687, 53], [23687, 57], [16688, 61], [23800, 63], [23771, 65],
        [38624, 66], [29502, 67], [29503, 68], [38625, 69], [38626, 71, true]
    ].map(([id, learning_level, is_fifth = false]) => ({ skill: { id }, learning_level, is_fifth })),
    soulmark: [{ id: 2162 }]
};

export const relatedPetForms = {
    3311: { id: 13311, label: "SP 型態" },
    13311: { id: 3311, label: "原型態" }
};

export function petSkinOwnerId(petId) {
    return String(petId) === "13311" ? "3311" : String(petId);
}
