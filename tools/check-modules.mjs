import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
function files(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
        entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
}
const graph = new Map();
for (const file of files(join(root, "js")).filter(file => file.endsWith(".js"))) {
    const checked = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (checked.status) throw new Error(checked.stderr);
    const source = readFileSync(file, "utf8");
    const imports = [...source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)]
        .map(match => resolve(dirname(file), match[1]));
    for (const dependency of imports)
        if (!existsSync(dependency)) throw new Error(`Missing import: ${file} -> ${dependency}`);
    graph.set(file, imports);
}
const complete = new Set();
function visit(file, stack = []) {
    if (stack.includes(file)) throw new Error(`Circular import: ${[...stack, file].join(" -> ")}`);
    if (complete.has(file)) return;
    for (const dependency of graph.get(file) || []) visit(dependency, [...stack, file]);
    complete.add(file);
}
for (const file of graph.keys()) visit(file);
console.log(`Checked ${graph.size} modules: syntax, local imports and dependency cycles.`);
