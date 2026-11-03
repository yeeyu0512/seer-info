import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPetTypeFilter, matchesPetTypeFilter, matchesPetSearchQuery, sortPetResults } from '../js/lookup/pet-filters.js';

const combinations = [{ id: 1, isDouble: false }, { id: 2, isDouble: true }, { id: 3, isDouble: false }];
const all = { category: 'all', typeId: null };
const normalize = text => text.replaceAll('聖', '圣').replaceAll('靈', '灵');

test('all attributes includes single, double and missing-type records without starting a filter', () => {
    assert.equal(hasPetTypeFilter(all), false);
    for (const typeId of [1, 2, 3, null]) assert.equal(matchesPetTypeFilter({ typeId }, all, combinations), true);
});

test('category and exact-attribute filtering accept expanded and catalog records', () => {
    assert.equal(matchesPetTypeFilter({ type: { id: 2 } }, { category: 'double', typeId: null }, combinations), true);
    assert.equal(matchesPetTypeFilter({ typeId: 2 }, { category: 'single', typeId: null }, combinations), false);
    assert.equal(matchesPetTypeFilter({ typeId: 3 }, { category: 'single', typeId: 1 }, combinations), false);
    assert.equal(matchesPetTypeFilter({ typeId: 1 }, { category: 'single', typeId: 1 }, combinations), true);
    assert.equal(matchesPetTypeFilter({}, { category: 'single', typeId: null }, combinations), false);
});

test('partial names intersect with attributes across traditional and simplified input', () => {
    const pets = [{ name: '圣灵甲', typeId: 1 }, { name: '聖靈乙', typeId: 2 }, { name: '其他', typeId: 1 }];
    const matches = pets.filter(pet => matchesPetSearchQuery(pet, ' 聖靈 ', normalize)
        && matchesPetTypeFilter(pet, { category: 'single', typeId: null }, combinations));
    assert.deepEqual(matches, [pets[0]]);
    assert.equal(matchesPetSearchQuery({ name: 'ABC' }, 'bc', normalize), true);
    assert.equal(matchesPetSearchQuery({}, '', normalize), true);
});

test('sorting covers the complete result set without mutating the cached catalog', () => {
    const pets = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: `精靈 ${45 - i}` }));
    assert.deepEqual(sortPetResults(pets, 'id-desc').slice(0, 3).map(p => p.id), [45, 44, 43]);
    assert.deepEqual(sortPetResults(pets, 'id-asc').slice(20, 23).map(p => p.id), [21, 22, 23]);
    assert.deepEqual(sortPetResults(pets, 'name').slice(0, 3).map(p => p.id), [45, 44, 43]);
    assert.deepEqual(pets.map(p => p.id), Array.from({ length: 45 }, (_, i) => i + 1));
    const tied = [{ id: 9, name: 'A' }, { id: 3, name: 'a' }];
    assert.deepEqual(sortPetResults(tied, 'name').map(p => p.id), [3, 9]);
});
