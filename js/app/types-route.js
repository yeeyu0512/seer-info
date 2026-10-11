const siteRoot = new URL("../../", import.meta.url);

export function typePageUrl(typeId, root = siteRoot) {
    const url = new URL("types/", root);
    if (/^[1-9][0-9]{0,9}$/.test(String(typeId ?? ""))) {
        url.searchParams.set("id", String(typeId));
    }
    return url;
}

export function legacyTypePageUrl(href, root = siteRoot) {
    const oldUrl = new URL(href);
    if (oldUrl.searchParams.get("tab") !== "types") return null;
    return typePageUrl(oldUrl.searchParams.get("id"), root);
}
