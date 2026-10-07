import assert from "node:assert/strict";
import { test } from "node:test";
import { createSessionController } from "../js/app/session-controller.js";

function element() {
    return { hidden: true, value: "", classList: {remove(){}, add(){}}, addEventListener(){} };
}
function createContext(authenticated, adminResult) {
    const calls = [];
    const votingTab = { dataset: { mainTarget: "voting" }, hidden: true };
    const dependencies = Object.fromEntries(["accountTab","publicLoginPrompt","selectionPanel","selectionBar",
        "alreadyVoted","submitButton","voteMessage","mimiBindingPrompt","selectionCount","selectionMax",
        "logoutButton","loginModal","loginTrigger","accountSection","adminLink","emailInput","passwordInput",
        "passwordConfirmInput","mimiIdInput","loginMessage"].map(name => [name,element()]));
    Object.assign(dependencies, {
        document: {getElementById(id) {
            const key = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            return dependencies[key] || element();
        }},
        primaryMainTabs: [votingTab],
        isAdmin: async () => { if (adminResult instanceof Error) throw adminResult; return adminResult; },
        activateTab: target => calls.push(target),
        stopRankingRefresh: () => calls.push("stop"),
        startRankingRefresh: () => calls.push("refresh"),
        loadGameAccount: async () => calls.push("account"),
        loadPool: async () => calls.push("pool"),
        loadRanking: async () => calls.push("ranking"),
        supabaseClient: {auth:{onAuthStateChange(){}}},
        resetPool(){}, renderGameAccount(){}, setAuthMode(){}
    });
    const controller = createSessionController(dependencies);
    if (authenticated) controller.showAuthenticatedView();
    const context = {...dependencies,...controller};
    Object.defineProperty(context,"isAdministrator",{get: controller.getIsAdministrator});
    return {context,calls,votingTab};
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
