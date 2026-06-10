const express = require('express');
const router = express.Router();
const controller = require('../controllers/ticketController');
const {
  validateBody,
  validateQuery,
  createTicketSchema,
  addMessageSchema,
  listTicketsSchema,
} = require('../validators/ticketValidators');

// POST /api/tickets — Create new ticket (classify + AI response)
router.post('/', validateBody(createTicketSchema), controller.createTicket);

// GET /api/tickets — List tickets with optional filters
router.get('/', validateQuery(listTicketsSchema), controller.listTickets);

// GET /api/tickets/:id — Get single ticket with messages
router.get('/:id', controller.getTicket);

// POST /api/tickets/:id/messages — Add a user message
router.post('/:id/messages', validateBody(addMessageSchema), controller.addMessage);

// GET /api/tickets/:id/chat-stream — SSE stream for AI conversation reply
router.get('/:id/chat-stream', controller.streamAiResponse);

// PUT /api/tickets/:id/resolve — Mark as Resolved
router.put('/:id/resolve', controller.resolveTicket);

// PUT /api/tickets/:id/close — Mark as Closed
router.put('/:id/close', controller.closeTicket);

module.exports = router;
