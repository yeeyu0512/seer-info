import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareSite } from "../tools/prepare-site.mjs";

test("Pages artifact includes old routes and the independent types page", async () => {
    const output = await mkdtemp(join(tmpdir(), "seer-pages-"));
    try {
        await prepareSite(output);
        for (const name of ["index.html", "admin.html", "privacy.html", "types/index.html",
            "js/main.js", "js/pages/types.js", "css/style.css", "css/types-page.css",
            "assets/icons/types/1.png", "data/official-news.json", "sitemap.xml"]) {
            assert((await stat(join(output, name))).isFile(), name);
        }
        const typesPage = await readFile(join(output, "types/index.html"), "utf8");
        assert.match(typesPage, /\.\.\/js\/pages\/types\.js/);
        assert.match(typesPage, /\.\.\/css\/style\.css/);
    } finally {
        await rm(output, { recursive: true, force: true });
    }
});
