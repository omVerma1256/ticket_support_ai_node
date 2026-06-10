const shelf = require('../db/bookshelf');

const Message = shelf.model('Message', {
  tableName: 'messages',
  hasTimestamps: false, // only created_at, managed manually

  ticket() {
    return this.belongsTo('Ticket', 'ticket_id');
  },
});

module.exports = Message;
