const { chatReply } = require('../services/chat.service');

exports.chat = async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ message: 'messages array is required' });
    }

    const result = await chatReply({ messages });
    res.status(200).json(result);
  } catch (err) {
    if (err.statusCode === 401 || err.statusCode === 403) {
      return res.status(200).json({
        reply:
          "I couldn't reach my AI provider right now (invalid or expired API key). Please ask an admin to check the GROQ_API_KEY. In the meantime, you can still browse the feed!",
        items: [],
        query: {},
        configured: false,
      });
    }
    next(err);
  }
};