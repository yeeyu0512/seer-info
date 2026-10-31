import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chinesePoolNumber, competitivePoolTitle, normalizeSeasonName, requirePoolNumber } from '../js/competitive/seasons.js';

test('season names accept direct input and pool labels use traditional Chinese ordinals', () => {
    assert.equal(normalizeSeasonName(' 帝皇 '), '帝皇賽季');
    assert.equal(normalizeSeasonName('帝皇賽季'), '帝皇賽季');
    assert.equal(competitivePoolTitle('帝皇', 1), '帝皇賽季 第一池');
    for (const [number, label] of [[2, '二'], [10, '十'], [11, '十一'], [20, '二十'], [101, '一百零一'], [110, '一百一十'], [1001, '一千零一'], [1010, '一千零一十'], [9999, '九千九百九十九']]) {
        assert.equal(chinesePoolNumber(number), label);
    }
    assert.equal(requirePoolNumber('2'), 2);
    for (const value of ['', 0, -1, 1.5, '第一池', 10000, NaN]) assert.throws(() => requirePoolNumber(value));
});
