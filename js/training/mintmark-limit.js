function seriesId(record) {
    const id = Number(record?.mintmark_class?.id ?? record?.mintmark_class);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function canEquipMintmark(selected, slot, record) {
    const series = seriesId(record);
    // Missing classification does not make unrelated marks one shared series.
    if (series === null) return true;
    return ["mint0", "mint1", "mint2"].filter(key => key !== slot
        && seriesId(selected.get(key)) === series).length < 2;
}
