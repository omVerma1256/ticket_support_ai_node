/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('tickets', (table) => {
    table.string('id', 20).primary(); // TKT-XXXXXXXX
    table.string('customer_name', 100).notNullable();
    table.string('email', 150).notNullable();
    table.string('subject', 300).notNullable();
    table.text('question').notNullable();
    table
      .enu('category', ['Technical', 'Billing', 'Account', 'General'])
      .notNullable()
      .defaultTo('General');
    table
      .enu('status', [
        'Open',
        'AI Responded',
        'Waiting For User',
        'Resolved',
        'Closed',
      ])
      .notNullable()
      .defaultTo('Open');
    table.timestamps(true, true); // created_at, updated_at

    // Indexes for common query patterns
    table.index('email', 'idx_tickets_email');
    table.index('status', 'idx_tickets_status');
    table.index('category', 'idx_tickets_category');
    table.index('created_at', 'idx_tickets_created_at');
    table.index(['status', 'category'], 'idx_tickets_status_category');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('tickets');
};
