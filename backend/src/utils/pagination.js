function parsePagination(query, defaultPageSize = 12, maxPageSize = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let pageSize = parseInt(query.pageSize || query.limit, 10);
  if (!pageSize || Number.isNaN(pageSize) || pageSize < 1) {
    pageSize = defaultPageSize;
  }
  pageSize = Math.min(pageSize, maxPageSize);
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    limit: pageSize,
  };
}

function pageMeta(total, page, pageSize) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

module.exports = { parsePagination, pageMeta };