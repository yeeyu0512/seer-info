// Conversion policy is shared; caller-specific null and trim semantics are preserved.
export function createChineseConverters(Converter) {
    const s2tConverter = Converter({ from: "cn", to: "tw" });
    const t2sConverter = Converter({ from: "tw", to: "cn" });
    function convertToTraditionalChinese(value) {
        if (!value) return "";
        try {
            return value.split(/([岳杰托里背])/).map((part) => "岳杰托里背".includes(part) ? part : s2tConverter(part)).join("");
        } catch (error) {
            console.warn("Simplified-to-traditional conversion failed:", error);
            return value;
        }
    }

    function convertToSimplifiedChinese(value) {
        try {
            return value.split(/([岳杰托里])/).map((part) => "岳杰托里".includes(part) ? part : t2sConverter(part)).join("");
        } catch (error) {
            console.warn("Traditional-to-simplified conversion failed:", error);
            return value;
        }
    }

    function toTraditionalChinese(value) {
        if (value === null || value === undefined) return "";
        const text = String(value).trim();
        if (!text) return "";
        try {
            return text.split(/([岳杰托里背])/).map((part) => "岳杰托里背".includes(part) ? part : s2tConverter(part)).join("");
        } catch (error) {
            console.warn("Simplified-to-traditional conversion failed:", error);
            return text;
        }
    }
    return { convertToTraditionalChinese, convertToSimplifiedChinese, toTraditionalChinese };
}
