const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination, pageMeta } = require('../src/utils/pagination');

test('parsePagination uses the default page size when the query is empty', () => {
  assert.deepEqual(parsePagination({}), { page: 1, pageSize: 12, skip: 0, limit: 12 });
});

test('parsePagination honours page and pageSize and computes skip', () => {
  assert.deepEqual(parsePagination({ page: '3', pageSize: '5' }), {
    page: 3,
    pageSize: 5,
    skip: 10,
    limit: 5,
  });
});

test('parsePagination accepts limit as an alias for pageSize', () => {
  const result = parsePagination({ limit: '20' });
  assert.equal(result.pageSize, 20);
  assert.equal(result.limit, 20);
});

test('parsePagination falls back to the default for invalid page sizes', () => {
  for (const pageSize of ['0', '-4', 'abc']) {
    const result = parsePagination({ pageSize }, 8, 50);
    assert.equal(result.pageSize, 8, `pageSize ${pageSize} should fall back`);
  }
});

test('parsePagination clamps pageSize to the maximum', () => {
  const result = parsePagination({ pageSize: '500' }, 12, 60);
  assert.equal(result.pageSize, 60);
  assert.equal(result.limit, 60);
});

test('parsePagination never returns a page below 1', () => {
  assert.equal(parsePagination({ page: '0' }).page, 1);
  assert.equal(parsePagination({ page: '-7' }).page, 1);
  assert.equal(parsePagination({ page: 'not-a-number' }).page, 1);
});

test('parsePagination supports custom defaults and maximums', () => {
  assert.equal(parsePagination({}, 25, 200).pageSize, 25);
  assert.equal(parsePagination({ pageSize: '9999' }, 25, 200).pageSize, 200);
});

test('pageMeta computes the total number of pages', () => {
  assert.deepEqual(pageMeta(50, 2, 10), {
    total: 50,
    page: 2,
    pageSize: 10,
    totalPages: 5,
  });
});

test('pageMeta always reports at least one page for an empty collection', () => {
  assert.deepEqual(pageMeta(0, 1, 12), {
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 1,
  });
});

test('pageMeta rounds partial final pages up', () => {
  assert.equal(pageMeta(13, 1, 12).totalPages, 2);
});
