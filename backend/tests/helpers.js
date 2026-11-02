const { ObjectId } = require('mongoose').Types;

function createReq(overrides = {}) {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    originalUrl: '/test',
    ...overrides,
  };
}

function createRes() {
  const res = {
    statusCode: 200,
    body: undefined,
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
}

function createNext() {
  const next = (err) => {
    next.called = true;
    next.error = err;
  };
  next.called = false;
  next.error = undefined;
  return next;
}

function queryChain(result, capture = {}) {
  const chain = {};
  for (const method of ['populate', 'sort', 'skip', 'limit', 'select', 'lean']) {
    chain[method] = (...args) => {
      if (!capture[method]) capture[method] = [];
      capture[method].push(args);
      return chain;
    };
  }
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  chain.catch = (reject) => Promise.resolve(result).catch(reject);
  chain.finally = (fn) => Promise.resolve(result).finally(fn);
  return chain;
}

function selectable(value) {
  return {
    select: async () => value,
  };
}

function makeClaim(overrides = {}) {
  const claim = {
    _id: new ObjectId(),
    status: 'pending',
    item: {
      _id: new ObjectId(),
      title: 'Black wallet',
      status: 'active',
      type: 'found',
    },
    claimant: {
      _id: new ObjectId(),
      name: 'Alex',
      email: 'alex@student.edu',
    },
    contactNumber: '0712345678',
    proofAnswer: 'Has a scratch on the back',
    save: async () => claim,
    populate: async () => claim,
    ...overrides,
  };
  return claim;
}

module.exports = {
  ObjectId,
  createReq,
  createRes,
  createNext,
  queryChain,
  selectable,
  makeClaim,
};
