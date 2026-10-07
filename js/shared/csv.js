export function toCsvCell(value) {
    const text = String(value ?? "");
    // Prevent spreadsheet applications from treating imported text as formulas.
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
}
