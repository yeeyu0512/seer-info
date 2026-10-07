export function parseImportedCharacters(value) {
    const characters = [];
    const invalidLines = [];
    const seenIds = new Set();

    value.split(/\r?\n/).forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const match = trimmed.match(/^(\d+)(?:\s*[,\t]\s*(.+?))?$/);
        const characterId = match ? Number(match[1]) : NaN;
        if (!match || !Number.isSafeInteger(characterId) || seenIds.has(characterId) || (match[2] !== undefined && !match[2].trim())) {
            invalidLines.push(index + 1);
            return;
        }
        seenIds.add(characterId);
        characters.push({
            characterId,
            characterName: match[2] ? match[2].trim() : "",
            lookupName: match[2] === undefined,
            lineNumber: index + 1
        });
    });

    return { characters, invalidLines };
}

export function parseCompetitivePoolPetIds(value) {
    const ids = [];
    const invalidLines = new Set();
    const seenIds = new Set();
    let duplicateCount = 0;

    value.split(/\r?\n/).forEach((line, index) => {
        const tokens = line.trim().split(/[,\s，]+/).filter(Boolean);
        tokens.forEach((token) => {
            if (!/^\d+$/.test(token)) {
                invalidLines.add(index + 1);
                return;
            }
            const id = Number(token);
            if (!Number.isSafeInteger(id) || id <= 0) {
                invalidLines.add(index + 1);
                return;
            }
            if (seenIds.has(id)) {
                duplicateCount += 1;
                return;
            }
            seenIds.add(id);
            ids.push({ id, lineNumber: index + 1 });
        });
    });

    return { ids, invalidLines: [...invalidLines], duplicateCount };
}
