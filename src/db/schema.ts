import { pgTable, text, timestamp, boolean, numeric, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  md5: text('md5').unique().notNull(),
  amount: numeric('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('pending'), // pending, paid, expired
  createdAt: timestamp('created_at').defaultNow().notNull(),
  paidAt: timestamp('paid_at'),
  downloadUnlocked: boolean('download_unlocked').default(false).notNull(),
});

export const downloads = pgTable('downloads', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  price: numeric('price').notNull(),
  fileUrl: text('file_url').notNull(), // fake file url
  imageUrl: text('image_url'),
  category: text('category'),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export const insertPaymentSchema = createInsertSchema(payments);

export type Download = typeof downloads.$inferSelect;
