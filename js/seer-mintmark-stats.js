const STATS = ["atk", "sp_atk", "def", "sp_def", "spd", "hp"];

// Maximum values do not include the separately supplied hidden bonuses.
export function mintmarkFinalStats(record) {
    const maximum = record.max_attr_value;
    if (!maximum) return null;
    const values = Object.fromEntries(STATS.map(key => [key,
        (Number(maximum[key]) || 0) + (Number(record.extra_attr_value?.[key]) || 0)
    ]));
    const total = STATS.reduce((sum,key) => sum + values[key],0);
    return {...values, percent:!!maximum.percent, total:record.extra_attr_value ? total : maximum.total ?? total};
}
