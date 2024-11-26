import { blob, int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const promptsTable = sqliteTable('prompts', {
    promptId: text().primaryKey().notNull(),
    clientId: text().notNull(),
    text: text().notNull(),
    enhancedText: text(),
    workflow: text({ enum: ['realistic', 'fantasy', 'anime'] }).notNull(),
    layout: text({ enum: ['square', 'portrait', 'landscape'] }).notNull(),
    seed: int().notNull(),
    createdAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const resultsTable = sqliteTable('results', {
    promptId: text().references(() => promptsTable.promptId),
    status: text({ enum: ['pending', 'completed'] }).default('pending').notNull(),
    statusMessage: text().default('In queue').notNull(),
    progress: real().default(0).notNull(),
    error: text(),
    result: blob({ mode: 'buffer' }),
    createdAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});