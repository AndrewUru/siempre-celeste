import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const songs = sqliteTable('songs', {
  slug: text('slug').primaryKey(),
  content: text('content').notNull(),
  revision: integer('revision').notNull(),
});
