import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlayerResult } from "../js/player-lookup.js";

test("normalizes the approved public player fields", () => {
    const result = normalizePlayerResult({
        data: {
            user_id: 12345,
            nickname: "小玩家",
            online: true,
            server: "台服一區",
            sport: { current_rank: "鑽石", highest_rank: "王者", score: 1200, stars: 3 },
            wild: { current_rank: "白銀", highest_rank: "黃金", score_star: { score: 800, star: 2 } },
            win_rate: "66.7%",
            wins: 20,
            total: 30,
            pets: { primary: "雷伊", secondary: "譜尼" }
        }
    });

    assert.deepEqual(result, {
        userId: 12345,
        nickname: "小玩家",
        online: true,
        server: "台服一區",
        sportCurrentRank: "鑽石",
        sportHighestRank: "王者",
        sportScoreStar: "1200 分／3 星",
        wildCurrentRank: "白銀",
        wildHighestRank: "黃金",
        wildScoreStar: "800 分／2 星",
        wildWinRate: "無對戰統計",
        wildWinRecord: "-",
        winRate: "66.7%",
        winRecord: "20／30",
        primaryPet: "雷伊",
        secondaryPet: "譜尼"
    });
});

test("does not expose fields outside the public display contract", () => {
    const result = normalizePlayerResult({
        player: { user_id: 1, token: "secret", email: "hidden@example.com", nickname: "玩家" }
    });

    assert.deepEqual(Object.keys(result).sort(), [
        "nickname", "online", "primaryPet", "secondaryPet", "server", "sportCurrentRank",
        "sportHighestRank", "sportScoreStar", "userId", "wildCurrentRank", "wildHighestRank",
        "wildScoreStar", "winRate", "winRecord", "wildWinRate", "wildWinRecord"
    ].sort());
});

test("matches the real API rank and separate mode statistics", () => {
    const result = normalizePlayerResult({user_id: 123, nickname: "甲", online: false,
        sport: {current: {rank: "聖皇", score: 18, unit: "star"}, highest: {rank: "聖皇", score: 18, unit: "star"}, win_rate: {wins: 173, total: 248, percent: 69.758}},
        wild: {current: {rank: "學徒", score: 0, unit: "score"}, highest: {rank: "學徒", score: 0, unit: "score"}, win_rate: {wins: 0, total: 0, percent: null}},
        pets: {primary: ["甲", "甲"], secondary: []}});
    assert.equal(result.sportCurrentRank, "聖皇");
    assert.equal(result.sportScoreStar, "18 星");
    assert.equal(result.winRate, "69.8%");
    assert.equal(result.winRecord, "173／248");
    assert.equal(result.wildWinRate, "無對戰統計");
    assert.equal(result.wildWinRecord, "0／0");
});
