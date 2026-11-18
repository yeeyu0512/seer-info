export const relatedPetForms = {
    3311: { id: 13311, label: "SP 型態" },
    13311: { id: 3311, label: "原型態" }
};

export function petSkinOwnerId(petId) {
    return String(petId) === "13311" ? "3311" : String(petId);
}
