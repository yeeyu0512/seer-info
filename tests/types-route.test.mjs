import assert from "node:assert/strict";
import { test } from "node:test";
import { legacyTypePageUrl, typePageUrl } from "../js/app/types-route.js";

const root = new URL("https://example.com/seer-info/");

test("legacy types links reach the independent page at root and project paths", () => {
    assert.equal(legacyTypePageUrl("https://example.com/?tab=types", new URL("https://example.com/"))?.href,
        "https://example.com/types/");
    assert.equal(legacyTypePageUrl("https://example.com/seer-info/index.html?tab=types&id=133", root)?.href,
        "https://example.com/seer-info/types/?id=133");
    assert.equal(legacyTypePageUrl("https://example.com/seer-info/?tab=training&build=abc", root), null);
});

test("type links accept only valid IDs and do not carry unrelated query data", () => {
    assert.equal(typePageUrl(133, root).href, "https://example.com/seer-info/types/?id=133");
    for (const id of ["0", "-1", "abc", "12345678901", "1.5"]) {
        assert.equal(typePageUrl(id, root).href, "https://example.com/seer-info/types/");
    }
    assert.equal(legacyTypePageUrl("https://example.com/seer-info/?tab=types&build=secret&id=bad", root)?.href,
        "https://example.com/seer-info/types/");
});
