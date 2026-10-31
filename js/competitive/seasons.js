export function normalizeSeasonName(value) {
    const name = String(value ?? "").normalize("NFKC").trim();
    return name && !name.endsWith("賽季") ? `${name}賽季` : name;
}

export function requirePoolNumber(value) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > 9999) {
        throw new Error("池期數須為 1 至 9999 的整數。");
    }
    return number;
}

export function chinesePoolNumber(value) {
    let number = requirePoolNumber(value);
    const digits = "零一二三四五六七八九";
    let result = "", pendingZero = false;
    for (const [unit, label] of [[1000, "千"], [100, "百"], [10, "十"], [1, ""]]) {
        const digit = Math.floor(number / unit);
        number %= unit;
        if (digit) {
            if (pendingZero) result += "零";
            result += digits[digit] + label;
            pendingZero = false;
        } else if (result && number) pendingZero = true;
    }
    return result.replace(/^一十/, "十");
}

export function competitivePoolTitle(seasonName, poolNumber) {
    const name = normalizeSeasonName(seasonName);
    if (!name) throw new Error("請選擇賽季。");
    return `${name} 第${chinesePoolNumber(poolNumber)}池`;
}

export function withCompetitivePoolTitle(pool) {
    return pool ? { ...pool, name: competitivePoolTitle(pool.season?.name, pool.pool_number) } : null;
}
