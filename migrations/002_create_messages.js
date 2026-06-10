/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .string('ticket_id', 20)
      .notNullable()
      .references('id')
      .inTable('tickets')
      .onDelete('CASCADE');
    table.enu('sender', ['User', 'AI']).notNullable();
    table.text('message').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes for thread loading
    table.index('ticket_id', 'idx_messages_ticket_id');
    table.index('created_at', 'idx_messages_created_at');
    table.index(['ticket_id', 'created_at'], 'idx_messages_ticket_created');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('messages');
};
