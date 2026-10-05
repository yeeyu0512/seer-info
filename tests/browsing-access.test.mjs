import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
function functionSource(name) {
    const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
    assert.notEqual(start, -1);
    const end = source.indexOf("\n}", start) + 2;
    return source.slice(start, end);
}

function createContext(authenticated, adminResult) {
    const calls = [];
    const votingTab = { dataset: { mainTarget: "voting" }, hidden: true };
    const context = vm.createContext({
        isAuthenticated: authenticated, isAdministrator: false,
        isAdmin: async () => {
            if (adminResult instanceof Error) throw adminResult;
            return adminResult;
        },
        primaryMainTabs: [votingTab], adminLink: {}, accountTab: {},
        selectionPanel: {}, selectionBar: {}, publicLoginPrompt: {},
        alreadyVoted: {}, submitButton: {}, voteMessage: {}, mimiBindingPrompt: {},
        selectionCount: {}, selectionMax: {},
        activateTab: (target) => calls.push(target),
        stopRankingRefresh: () => calls.push("stop"),
        startRankingRefresh: () => calls.push("refresh"),
        loadGameAccount: async () => calls.push("account"),
        loadPool: async () => calls.push("pool"),
        loadRanking: async () => calls.push("ranking"),
        console: { error() {} },
    });
    for (const name of ["syncAdminLink", "initializeAuthenticatedPage", "initializePublicPage"])
        vm.runInContext(functionSource(name), context);
    return { context, calls, votingTab };
}

test("guests open the encyclopedia without fetching voting data or starting polling", async () => {
    const { context, calls, votingTab } = createContext(false, false);
    await context.initializePublicPage();
    assert.deepEqual(calls, ["stop", "seer-lookup-section"]);
    assert.equal(votingTab.hidden, true);
    assert.equal(context.publicLoginPrompt.hidden, true);
});

test("regular accounts and failed admin checks keep voting hidden", async () => {
    for (const result of [false, new Error("Unavailable")]) {
        const { context, calls, votingTab } = createContext(true, result);
        await context.initializeAuthenticatedPage();
        assert.equal(votingTab.hidden, true);
        assert.equal(context.adminLink.hidden, true);
        assert.deepEqual(calls, ["stop", "seer-lookup-section", "account"]);
    }
});

test("confirmed admins retain voting and ranking refresh", async () => {
    const { context, calls, votingTab } = createContext(true, true);
    await context.initializeAuthenticatedPage();
    assert.equal(votingTab.hidden, false);
    assert.equal(context.adminLink.hidden, false);
    assert.deepEqual(calls, ["selection-panel", "account", "pool", "ranking", "refresh"]);
});

test("an admin check resolving after logout cannot restore voting", async () => {
    const { context, votingTab } = createContext(false, true);
    await context.syncAdminLink();
    assert.equal(context.isAdministrator, false);
    assert.equal(votingTab.hidden, true);
});
