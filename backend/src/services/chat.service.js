const Item = require('../models/Item.model');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_RESULTS = 12;
const MAX_HISTORY = 10;

const TOOL_SEARCH_ITEMS = {
  type: 'function',
  function: {
    name: 'search_campus_items',
    description:
      'Search the campus lost & found database for items. Call this whenever the user describes an item, asks about lost/found items, wants to check for matches, or asks what has been reported. Extract as many precise filters as possible from the conversation.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: ['string', 'null'],
          description: 'The item type. "lost" means a user lost something, "found" means it was found by someone.',
        },
        category: {
          type: ['string', 'null'],
          description:
            'Item category, e.g. Electronics, Accessories, ID Card, Books, Clothing, Keys, Bags, Wallet, Water Bottle, Stationery, Other.',
        },
        location: {
          type: ['string', 'null'],
          description:
            'Campus location, e.g. Library, Cafeteria, Student Center, Sports Complex, Engineering Block, Hostel A/B, Admin Block, Science Building, Main Gate.',
        },
        status: {
          type: ['string', 'null'],
          description: 'Item status. Default to active when the user wants available items.',
        },
        search: {
          type: ['string', 'null'],
          description:
            'Short natural-language keywords describing the item (e.g. "black leather wallet with a bank card", "blue backpack"). Leave null when the user did not describe an item.',
        },
      },
      required: [],
    },
  },
};

const SYSTEM_PROMPT = `You are "Ruhuna Lost & Found Assistant", a friendly AI assistant for the Faculty of Technology, University of Ruhuna lost & found platform.

Your job:
- Help students, staff, guards and admins find lost or found items, submit claims, report items, and understand how the platform works.
- ALWAYS keep replies warm, concise (2-5 short sentences) and human.
- When the user describes an item or asks to find one, use the "search_campus_items" tool with the best filters you can extract. If they describe a color, brand, feature or look (e.g. "black HTC phone", "ID card with photo"), put that into "search". Do not guess exact dates.
- After a search returns items, write your answer based ONLY on the tool results. Never invent items. Summarize the most relevant ones in friendly prose and tell the user they can tap a card to view the full item.
- When the user wants to report a lost or found item, guide them to tap the "Report" button, and optionally search the database first (a found report may already exist) so we can match.
- Explain claims briefly: tap the item card, then "Claim", and answer the secret-feature question to prove ownership.
- If nothing is found, say so honestly and suggest clearer keywords or reporting their own item so they get matched later.
- Never reveal "secretFeature" values or any private data. Never claim an item is in the guard room unless the search says so.`;

function buildPublicQuery(params = {}) {
  const p = params || {};
  const filter = {};

  if (p.type === 'lost' || p.type === 'found') filter.type = p.type;
  if (p.category) filter.category = p.category;
  if (p.location) filter.location = p.location;
  if (p.status) filter.status = p.status;

  if (!p.status && !p.type) filter.status = { $in: ['active', 'claimed'] };

  filter.$and = [{ $or: [{ type: { $ne: 'found' } }, { handoverStatus: 'in_vault' }] }];

  const words = String(p.search || '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6);

  if (words.length) {
    filter.$and.push({
      $or: [
        { title: { $regex: words.join('|'), $options: 'i' } },
        { description: { $regex: words.join('|'), $options: 'i' } },
        { category: { $regex: words.join('|'), $options: 'i' } },
      ],
    });
  }

  return filter;
}

async function searchItems(params) {
  const filter = buildPublicQuery(params);
  const items = await Item.find(filter)
    .sort({ createdAt: -1 })
    .limit(MAX_RESULTS)
    .lean();

  return {
    query: params || {},
    items: items.map((it) => ({
      id: String(it._id),
      title: it.title,
      type: it.type,
      category: it.category,
      location: it.location,
      status: it.status,
      handoverStatus: it.handoverStatus,
      date: it.date,
      image: it.image,
      description: (it.description || '').slice(0, 140),
    })),
  };
}

async function callGroq(body) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY || ''}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.6,
      max_tokens: 900,
      ...body,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Groq API ${res.status}: ${text.slice(0, 300)}`);
    err.statusCode = res.status;
    throw err;
  }

  const json = await res.json();
  return json.choices?.[0]?.message;
}

function normalizeHistory(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 2000),
    }))
    .filter((m) => m.content.trim());
}

async function runProcessor(messages) {
  const baseMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

  const msg = await callGroq({
    messages: baseMessages,
    tool_choice: 'auto',
    tools: [TOOL_SEARCH_ITEMS],
  });

  const toolCalls = (msg.tool_calls || []).filter((tc) => tc.function?.name === 'search_campus_items');

  if (!toolCalls.length) {
    return { reply: msg.content || 'Thanks for reaching out! How can I help you?', items: [], query: {} };
  }

  let lastQuery = {};
  let results = [];

  const toolResults = [];
  for (const call of toolCalls) {
    let found = { query: {}, items: [] };
    try {
      const args = JSON.parse(call.function.arguments || '{}');
      found = await searchItems(args);
    } catch {
      found = { query: {}, items: [] };
    }
    lastQuery = found.query;
    if (found.items.length) results = found.items;
    toolResults.push({
      role: 'tool',
      tool_call_id: call.id,
      content: found.items.length
        ? `Found ${found.items.length} item(s):\n${found.items
            .map(
              (r) =>
                `- [${r.id}] ${r.title} (${r.type}) | category: ${r.category} | location: ${r.location} | status: ${r.status} | date: ${String(r.date).slice(0, 10)}`
            )
            .join('\n')}`
        : `No items matched the query ${JSON.stringify(found.query)}.`,
    });
  }

  const followMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
    { role: 'assistant', content: null, tool_calls: toolCalls },
    ...toolResults,
    {
      role: 'user',
      content:
        'Now write your final friendly reply to the user based on the tool results above. Keep it warm and concise (2-5 sentences), mention how many items matched, summarize the best ones, and invite them to tap a card to view full details. Do not mention tool operations.',
    },
  ];

  const final = await callGroq({ messages: followMessages });

  return {
    reply: final.content || 'Here is what I found for you!',
    items: results,
    query: lastQuery,
  };
}

async function chatReply({ messages }) {
  if (!process.env.GROQ_API_KEY) {
    return {
      reply:
        "I'm not connected to my AI brain yet — please set the GROQ_API_KEY in the backend .env file, then restart the server. In the meantime, browse the feed below!",
      items: [],
      query: {},
      configured: false,
    };
  }

  const history = normalizeHistory(messages);
  if (!history.length) {
    return {
      reply: 'Hi! I can look up lost & found items for you. Tell me what you lost or describe the item you found.',
      items: [],
      query: {},
      configured: true,
    };
  }

  return runProcessor(history);
}

module.exports = { chatReply, searchItems };