import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegex, positivePage } from '../src/lib/query.js';
import { isBloodPressureValid } from '../src/lib/vitals.js';

test('positivePage uses a fallback for missing and invalid inputs', () => {
  assert.equal(positivePage(undefined), 1);
  assert.equal(positivePage('nope', 3), 3);
});

test('positivePage clamps pagination to safe bounds', () => {
  assert.equal(positivePage('0'), 1);
  assert.equal(positivePage('-9'), 1);
  assert.equal(positivePage('100001'), 10000);
  assert.equal(positivePage('4'), 4);
});

test('escapeRegex treats search text literally', () => {
  const search = escapeRegex('a+b[1].*');
  assert.equal(new RegExp(search).test('a+b[1].*'), true);
  assert.equal(new RegExp(search).test('ab1zzz'), false);
});

test('blood pressure requires a finite systolic value greater than diastolic', () => {
  assert.equal(isBloodPressureValid(120, 80), true);
  assert.equal(isBloodPressureValid(80, 120), false);
  assert.equal(isBloodPressureValid(Number.NaN, 80), false);
});
