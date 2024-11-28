import { int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const promptsTable = sqliteTable('prompts', {
    id: text().primaryKey().notNull(),
    clientId: text().notNull(),
    text: text().notNull(),
    enhancedText: text(),
    workflow: text({ enum: ['realistic', 'fantasy', 'anime'] }).notNull(),
    layout: text({ enum: ['square', 'portrait', 'landscape'] }).notNull(),
    seed: int().notNull(),
});

export const resultsTable = sqliteTable('results', {
    promptId: text().primaryKey().references(() => promptsTable.id),
    status: text({ enum: ['pending', 'completed', 'failed'] }).default('pending').notNull(),
    statusMessage: text().default('In queue').notNull(),
    progress: real().default(0).notNull(),
    s3Key: text(),
});