const ticketService = require('../services/ticketService');
const aiService = require('../services/aiService');
const { createError } = require('../middleware/errorHandler');

/**
 * POST /api/tickets
 * Creates a ticket: classify category → generate initial AI response → save to DB
 */
async function createTicket(req, res, next) {
  try {
    const { customerName, email, subject, question } = req.body;

    // Step 1: Classify ticket using OpenAI structured outputs
    const category = await aiService.classifyTicket(subject, question);

    // Step 2: Generate initial AI response (non-streaming)
    const initialAiResponse = await aiService.generateInitialResponse(
      category,
      subject,
      question
    );

    // Step 3: Save ticket + both messages in a single transaction
    const ticket = await ticketService.createTicket({
      customerName,
      email,
      subject,
      question,
      category,
      initialAiResponse,
    });

    return res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tickets
 * List all tickets with optional filters: ?category=&status=&page=&limit=
 */
async function listTickets(req, res, next) {
  try {
    const { category, status, page, limit } = req.query;
    const tickets = await ticketService.getTickets({ category, status, page, limit });
    return res.json({ tickets });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tickets/:id
 * Get a single ticket with full message thread
 */
async function getTicket(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) {
      return next(createError('Ticket not found', 404, 'NOT_FOUND'));
    }
    return res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tickets/:id/messages
 * Add a user message to the ticket thread and update status.
 * The frontend will separately call the chat-stream endpoint for AI reply.
 */
async function addMessage(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) {
      return next(createError('Ticket not found', 404, 'NOT_FOUND'));
    }

    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      return next(
        createError('Cannot add messages to a resolved or closed ticket', 400, 'TICKET_CLOSED')
      );
    }

    const updatedTicket = await ticketService.addUserMessage(
      req.params.id,
      req.body.message
    );

    return res.status(201).json({ ticket: updatedTicket });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tickets/:id/chat-stream
 * SSE endpoint — streams the AI conversation response back to the client.
 * 
 * Flow:
 *  1. Fetch ticket + message history from DB
 *  2. Open OpenAI streaming chat completion
 *  3. Pipe each chunk as SSE event to client
 *  4. On completion, save full AI message to DB
 *  5. Send [DONE] SSE event with updated ticket
 */
async function streamAiResponse(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      return res.status(400).json({ error: 'Ticket is closed' });
    }

    // Get full message history for context (all messages ordered by time)
    const messages = await ticketService.getMessages(req.params.id);
    
    // The last message should be the user's message just sent
    // Build history excluding the last user message (it's passed separately)
    const historyForAI = messages.slice(0, -1); // all but last
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.sender !== 'User') {
      return res.status(400).json({ error: 'No pending user message to respond to' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Helpers — safely flush buffered data to client
    const flush = () => {
      if (typeof res.flush === 'function') res.flush();
    };

    // Write helper — write SSE event and immediately flush
    const writeSSE = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      flush();
    };

    // Establish connection
    writeSSE('connected', { ts: Date.now() });

    let fullResponse = '';

    try {
      const stream = await aiService.generateConversationResponse(
        historyForAI.map((m) => ({ sender: m.sender, message: m.message })),
        lastMessage.message,
        ticket.category
      );

      // Pipe every OpenAI chunk directly to the client
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          writeSSE('chunk', { chunk: content });
        }
      }

      // Persist full AI response to DB
      const updatedTicket = await ticketService.addAiMessage(req.params.id, fullResponse);

      // Signal completion — send final ticket state
      writeSSE('done', { ticket: updatedTicket });
    } catch (aiError) {
      console.error('[STREAM ERROR]', aiError.message);
      writeSSE('error', { error: 'AI response failed. Please try again.' });
    }

    res.end();
  } catch (err) {
    // SSE headers may already be set, can't use next()
    if (!res.headersSent) {
      next(err);
    } else {
      console.error('[STREAM FATAL]', err.message);
      res.end();
    }
  }
}

/**
 * PUT /api/tickets/:id/resolve
 * Mark ticket as Resolved
 */
async function resolveTicket(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) {
      return next(createError('Ticket not found', 404, 'NOT_FOUND'));
    }
    const updated = await ticketService.resolveTicket(req.params.id);
    return res.json({ ticket: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/tickets/:id/close
 * Mark ticket as Closed
 */
async function closeTicket(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) {
      return next(createError('Ticket not found', 404, 'NOT_FOUND'));
    }
    const updated = await ticketService.closeTicket(req.params.id);
    return res.json({ ticket: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  addMessage,
  streamAiResponse,
  resolveTicket,
  closeTicket,
};
