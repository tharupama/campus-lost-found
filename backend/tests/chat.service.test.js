const { test } = require('node:test');
const assert = require('node:assert/strict');
const Item = require('../src/models/Item.model');
const { chatReply } = require('../src/services/chat.service');
const { queryChain } = require('./helpers');

function setGroqKey(t, value) {
  const previous = process.env.GROQ_API_KEY;
  if (value === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = value;
  t.after(() => {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  });
}

function groqResponse(message) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message }] }),
  };
}

test('chatReply explains that the AI is not configured without an API key', async (t) => {
  setGroqKey(t, undefined);

  const result = await chatReply({ messages: [{ role: 'user', content: 'I lost my phone' }] });

  assert.equal(result.configured, false);
  assert.match(result.reply, /GROQ_API_KEY/);
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.query, {});
});

test('chatReply greets the user when there is no history', async (t) => {
  setGroqKey(t, 'test-key');

  const result = await chatReply({ messages: [] });

  assert.equal(result.configured, true);
  assert.match(result.reply, /lost & found/i);
  assert.deepEqual(result.items, []);
});

test('chatReply returns the assistant message when no tool call is made', async (t) => {
  setGroqKey(t, 'test-key');
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    groqResponse({ role: 'assistant', content: 'Here is how claims work.' })
  );

  const result = await chatReply({ messages: [{ role: 'user', content: 'How do claims work?' }] });

  assert.equal(result.reply, 'Here is how claims work.');
  assert.deepEqual(result.items, []);
  assert.equal(fetchMock.mock.callCount(), 1);

  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Authorization, 'Bearer test-key');
  const body = JSON.parse(options.body);
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[1].content, 'How do claims work?');
  assert.equal(body.tools[0].function.name, 'search_campus_items');
});

test('chatReply only keeps the last 10 history messages', async (t) => {
  setGroqKey(t, 'test-key');
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    groqResponse({ role: 'assistant', content: 'ok' })
  );

  const messages = Array.from({ length: 12 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `message-${index}`,
  }));

  await chatReply({ messages });

  const body = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.equal(body.messages.length, 11);
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[1].content, 'message-2');
  assert.equal(body.messages[10].content, 'message-11');
});

test('chatReply executes the search tool and returns matching items', async (t) => {
  setGroqKey(t, 'test-key');
  const item = {
    _id: 'item-1',
    title: 'Black iPhone',
    type: 'lost',
    category: 'Electronics',
    location: 'Library',
    status: 'active',
    handoverStatus: 'pending',
    date: new Date('2026-01-01'),
    image: null,
    description: 'Cracked screen and a blue case',
  };
  const capture = {};
  t.mock.method(Item, 'find', (filter) => {
    capture.filter = filter;
    return queryChain([item]);
  });

  let call = 0;
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    call += 1;
    if (call === 1) {
      return groqResponse({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call-1',
            function: {
              name: 'search_campus_items',
              arguments: JSON.stringify({ type: 'lost', search: 'black iphone' }),
            },
          },
        ],
      });
    }
    return groqResponse({ role: 'assistant', content: 'I found 1 item that may match.' });
  });

  const result = await chatReply({ messages: [{ role: 'user', content: 'I lost a black iphone' }] });

  assert.equal(result.reply, 'I found 1 item that may match.');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'item-1');
  assert.equal(result.items[0].title, 'Black iPhone');
  assert.equal(result.query.type, 'lost');
  assert.equal(fetchMock.mock.callCount(), 2);

  assert.equal(capture.filter.type, 'lost');
  assert.ok(capture.filter.$and);
});

test('chatReply ignores tool calls other than the item search', async (t) => {
  setGroqKey(t, 'test-key');
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    groqResponse({
      role: 'assistant',
      content: 'Plain reply',
      tool_calls: [{ id: 'x', function: { name: 'send_email', arguments: '{}' } }],
    })
  );

  const result = await chatReply({ messages: [{ role: 'user', content: 'hello' }] });

  assert.equal(result.reply, 'Plain reply');
  assert.deepEqual(result.items, []);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('chatReply surfaces provider failures with the status code', async (t) => {
  setGroqKey(t, 'test-key');
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: false,
    status: 401,
    text: async () => 'invalid api key',
  }));

  await assert.rejects(
    () => chatReply({ messages: [{ role: 'user', content: 'hello' }] }),
    (err) => {
      assert.equal(err.statusCode, 401);
      assert.match(err.message, /Groq API 401/);
      return true;
    }
  );
});
