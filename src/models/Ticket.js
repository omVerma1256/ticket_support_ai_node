const shelf = require('../db/bookshelf');

const Ticket = shelf.model('Ticket', {
  tableName: 'tickets',
  hasTimestamps: true, // created_at, updated_at

  messages() {
    return this.hasMany('Message', 'ticket_id');
  },
});

module.exports = Ticket;
