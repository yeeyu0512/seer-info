import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const directories = ["css", "js", "assets", "data", "types"];
const rootFiles = ["favicon.ico", "robots.txt", "sitemap.xml"];

export async function prepareSite(destination) {
    const output = resolve(destination);
    await mkdir(output, { recursive: true });
    const htmlFiles = (await readdir(root)).filter(name => name.endsWith(".html"));
    for (const name of [...htmlFiles, ...rootFiles]) {
        await cp(join(root, name), join(output, name));
    }
    for (const name of directories) {
        await cp(join(root, name), join(output, name), { recursive: true });
    }
    for (const name of ["index.html", "types/index.html", "js/pages/types.js", "css/types-page.css"]) {
        if (!(await stat(join(output, name))).isFile()) throw new Error(`Missing Pages file: ${name}`);
    }
    return output;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (!process.argv[2]) throw new Error("Usage: node tools/prepare-site.mjs <output-directory>");
    console.log(`Prepared Pages artifact: ${await prepareSite(process.argv[2])}`);
}
