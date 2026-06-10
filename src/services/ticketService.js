const db = require('../db/knex');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique ticket ID in format TKT-XXXXXXXX
 */
function generateTicketId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TKT-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Ensure ticket ID is unique
 */
async function generateUniqueTicketId() {
  let id;
  let exists = true;
  while (exists) {
    id = generateTicketId();
    const row = await db('tickets').where({ id }).first();
    exists = !!row;
  }
  return id;
}

/**
 * Format a raw DB ticket + messages into the frontend shape
 */
function formatTicket(ticket, messages = []) {
  return {
    id: ticket.id,
    customerName: ticket.customer_name,
    email: ticket.email,
    subject: ticket.subject,
    question: ticket.question,
    category: ticket.category,
    status: ticket.status,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      message: m.message,
      timestamp: m.created_at,
    })),
  };
}

const ticketService = {
  /**
   * Create a new ticket with an initial question message and AI response message.
   */
  async createTicket({
    customerName,
    email,
    subject,
    question,
    category,
    initialAiResponse,
  }) {
    const id = await generateUniqueTicketId();
    const now = new Date();

    await db.transaction(async (trx) => {
      // Insert ticket
      await trx('tickets').insert({
        id,
        customer_name: customerName,
        email,
        subject,
        question,
        category,
        status: 'AI Responded',
        created_at: now,
        updated_at: now,
      });

      // Insert user's initial question as first message
      await trx('messages').insert({
        id: uuidv4(),
        ticket_id: id,
        sender: 'User',
        message: question,
        created_at: now,
      });

      // Insert AI's initial response as second message
      await trx('messages').insert({
        id: uuidv4(),
        ticket_id: id,
        sender: 'AI',
        message: initialAiResponse,
        created_at: new Date(now.getTime() + 100),
      });
    });

    return this.getTicketById(id);
  },

  /**
   * Get all tickets with optional filters, sorted by updated_at DESC.
   */
  async getTickets({ category, status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    let query = db('tickets').orderBy('updated_at', 'desc').limit(limit).offset(offset);

    if (category && category !== 'All') {
      query = query.where({ category });
    }
    if (status && status !== 'All') {
      if (status === 'Open') {
        query = query.whereNotIn('status', ['Resolved', 'Closed']);
      } else if (status === 'Closed') {
        query = query.whereIn('status', ['Resolved', 'Closed']);
      } else {
        query = query.where({ status });
      }
    }

    const tickets = await query;
    // Get message count for each ticket (for display)
    const ticketIds = tickets.map((t) => t.id);
    
    let messageCounts = {};
    if (ticketIds.length > 0) {
      const counts = await db('messages')
        .whereIn('ticket_id', ticketIds)
        .select('ticket_id')
        .count('id as count')
        .groupBy('ticket_id');
      counts.forEach((row) => {
        messageCounts[row.ticket_id] = parseInt(row.count);
      });
    }

    return tickets.map((t) => ({
      ...formatTicket(t),
      messageCount: messageCounts[t.id] || 0,
    }));
  },

  /**
   * Get a single ticket by ID, including all messages ordered by created_at.
   */
  async getTicketById(id) {
    const ticket = await db('tickets').where({ id: id.trim().toUpperCase() }).first()
      || await db('tickets').where({ id: id.trim() }).first();

    if (!ticket) return null;

    const messages = await db('messages')
      .where({ ticket_id: ticket.id })
      .orderBy('created_at', 'asc');

    return formatTicket(ticket, messages);
  },

  /**
   * Add a user message to a ticket and update its status + updated_at.
   */
  async addUserMessage(ticketId, messageText) {
    const ticket = await db('tickets').where({ id: ticketId }).first();
    if (!ticket) throw new Error('Ticket not found');

    const now = new Date();
    const messageId = uuidv4();

    await db.transaction(async (trx) => {
      await trx('messages').insert({
        id: messageId,
        ticket_id: ticketId,
        sender: 'User',
        message: messageText,
        created_at: now,
      });

      await trx('tickets').where({ id: ticketId }).update({
        status: 'Waiting For User',
        updated_at: now,
      });
    });

    return this.getTicketById(ticketId);
  },

  /**
   * Save the AI's streaming response after it completes, update status.
   */
  async addAiMessage(ticketId, messageText) {
    const ticket = await db('tickets').where({ id: ticketId }).first();
    if (!ticket) throw new Error('Ticket not found');

    const now = new Date();

    await db.transaction(async (trx) => {
      await trx('messages').insert({
        id: uuidv4(),
        ticket_id: ticketId,
        sender: 'AI',
        message: messageText,
        created_at: now,
      });

      await trx('tickets').where({ id: ticketId }).update({
        status: 'AI Responded',
        updated_at: now,
      });
    });

    return this.getTicketById(ticketId);
  },

  /**
   * Get messages for a ticket (for streaming context).
   */
  async getMessages(ticketId) {
    return db('messages')
      .where({ ticket_id: ticketId })
      .orderBy('created_at', 'asc');
  },

  /**
   * Mark ticket as Resolved.
   */
  async resolveTicket(ticketId) {
    const ticket = await db('tickets').where({ id: ticketId }).first();
    if (!ticket) throw new Error('Ticket not found');

    await db('tickets').where({ id: ticketId }).update({
      status: 'Resolved',
      updated_at: new Date(),
    });

    return this.getTicketById(ticketId);
  },

  /**
   * Mark ticket as Closed.
   */
  async closeTicket(ticketId) {
    const ticket = await db('tickets').where({ id: ticketId }).first();
    if (!ticket) throw new Error('Ticket not found');

    await db('tickets').where({ id: ticketId }).update({
      status: 'Closed',
      updated_at: new Date(),
    });

    return this.getTicketById(ticketId);
  },
};

module.exports = ticketService;
