const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VALID_CATEGORIES = ['Technical', 'Billing', 'Account', 'General'];

/**
 * Classify a support ticket into one of four categories using OpenAI structured outputs.
 * @param {string} subject
 * @param {string} question
 * @returns {Promise<'Technical'|'Billing'|'Account'|'General'>}
 */
async function classifyTicket(subject, question) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a support ticket classification system. 
Classify the support ticket into exactly one of these categories:
- Technical: bugs, errors, crashes, performance issues, API problems, integration issues, app not working
- Billing: charges, refunds, invoices, subscriptions, pricing, payments, cards
- Account: password resets, profile updates, permissions, security, 2FA, account deletion, username changes
- General: everything else, feature requests, general inquiries, feedback

Respond with ONLY a JSON object in this exact format: {"category": "Technical"}`,
      },
      {
        role: 'user',
        content: `Subject: ${subject}\n\nDescription: ${question}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 50,
    temperature: 0.1,
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content);
    const category = parsed.category;
    if (VALID_CATEGORIES.includes(category)) {
      return category;
    }
    return 'General';
  } catch {
    return 'General';
  }
}

/**
 * Generate the initial AI response for a newly created ticket (non-streaming).
 * @param {string} category
 * @param {string} subject
 * @param {string} question
 * @returns {Promise<string>}
 */
async function generateInitialResponse(category, subject, question) {
  const systemPrompts = {
    Technical: `You are a professional technical support specialist. You help users resolve software bugs, errors, performance issues, API problems, and integration challenges. Be specific, actionable, and empathetic. Use numbered steps when providing troubleshooting guidance. Always ask clarifying questions if needed.`,
    Billing: `You are a billing support specialist. You help users with charges, refunds, invoices, subscription management, and payment issues. Be empathetic, professional, and clear. Do not ask for full card numbers — only last 4 digits or invoice IDs. Always acknowledge the financial concern first.`,
    Account: `You are an account management specialist. You help users with password resets, profile updates, security settings, permissions, 2FA setup, and account changes. Prioritize security — verify identity details before making changes. Be clear and step-by-step.`,
    General: `You are a helpful customer support assistant. You handle general inquiries, feature requests, and feedback. Be friendly, thorough, and helpful. If the request needs routing to a specific team, mention that you'll escalate appropriately.`,
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          systemPrompts[category] ||
          systemPrompts.General +
            '\n\nIMPORTANT: Keep your response concise but complete (2-4 paragraphs max). Use markdown formatting sparingly — use **bold** for key terms and numbered lists for steps. Do not use headers.',
      },
      {
        role: 'user',
        content: `Subject: ${subject}\n\nMy issue: ${question}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

/**
 * Generate a conversational follow-up response using message history.
 * Returns an OpenAI stream that emits text chunks.
 * @param {Array<{sender: string, message: string}>} history - Message history from DB
 * @param {string} newMessage - The latest user message
 * @param {string} category - Ticket category for context
 * @returns {Promise<import('openai').Stream>}
 */
async function generateConversationResponse(history, newMessage, category) {
  const systemPrompts = {
    Technical: `You are a professional technical support specialist continuing an ongoing support conversation. Reference previous context from the conversation history. Be specific and actionable. If previous steps didn't help, try different approaches. Escalate complexity appropriately.`,
    Billing: `You are a billing support specialist continuing an ongoing support conversation. Reference what has already been discussed. Be empathetic and professional. Move toward resolution — either confirm a refund, explain a charge, or escalate if needed.`,
    Account: `You are an account management specialist continuing an ongoing support conversation. Reference previous context. Help the user complete their account-related task. Confirm when changes are made or when next steps are clear.`,
    General: `You are a helpful customer support assistant continuing an ongoing conversation. Be friendly and helpful. Reference what was previously discussed and move the conversation toward a resolution.`,
  };

  // Build OpenAI messages array from history
  const messages = [
    {
      role: 'system',
      content:
        (systemPrompts[category] || systemPrompts.General) +
        '\n\nIMPORTANT: Keep responses concise (1-3 paragraphs). Use **bold** for emphasis, numbered lists for steps. Be conversational — this is a follow-up in an ongoing thread.',
    },
  ];

  // Add conversation history (exclude the most recent user message — it's in newMessage)
  for (const msg of history) {
    messages.push({
      role: msg.sender === 'User' ? 'user' : 'assistant',
      content: msg.message,
    });
  }

  // Add the new user message
  messages.push({
    role: 'user',
    content: newMessage,
  });

  // Return a streaming completion
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 500,
    temperature: 0.7,
    stream: true,
  });

  return stream;
}

module.exports = {
  classifyTicket,
  generateInitialResponse,
  generateConversationResponse,
};
