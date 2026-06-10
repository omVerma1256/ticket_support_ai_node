const Joi = require('joi');

const createTicketSchema = Joi.object({
  customerName: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().trim().email().max(150).required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  subject: Joi.string().trim().min(3).max(300).required().messages({
    'string.empty': 'Subject is required',
    'string.min': 'Subject must be at least 3 characters',
    'string.max': 'Subject must not exceed 300 characters',
    'any.required': 'Subject is required',
  }),
  question: Joi.string().trim().min(10).max(5000).required().messages({
    'string.empty': 'Question is required',
    'string.min': 'Question must be at least 10 characters',
    'string.max': 'Question must not exceed 5000 characters',
    'any.required': 'Question is required',
  }),
});

const addMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(5000).required().messages({
    'string.empty': 'Message cannot be empty',
    'string.max': 'Message must not exceed 5000 characters',
    'any.required': 'Message is required',
  }),
});

const listTicketsSchema = Joi.object({
  category: Joi.string()
    .valid('All', 'Technical', 'Billing', 'Account', 'General')
    .default('All'),
  status: Joi.string()
    .valid('All', 'Open', 'Closed', 'AI Responded', 'Waiting For User', 'Resolved')
    .default('All'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Middleware factory for validating request bodies against a Joi schema.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({ error: 'Validation failed', details: messages, code: 'VALIDATION_ERROR' });
    }
    req.body = value;
    next();
  };
}

/**
 * Middleware factory for validating query params against a Joi schema.
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({ error: 'Validation failed', details: messages, code: 'VALIDATION_ERROR' });
    }
    req.query = value;
    next();
  };
}

module.exports = {
  validateBody,
  validateQuery,
  createTicketSchema,
  addMessageSchema,
  listTicketsSchema,
};
