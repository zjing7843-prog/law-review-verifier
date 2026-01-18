import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 10 }).notNull(), // 'pdf' or 'docx'
  fileKey: varchar("fileKey", { length: 255 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(), // S3 URL
  totalFootnotes: int("totalFootnotes"),
  extractedFootnotes: int("extractedFootnotes"),
  status: mysqlEnum("status", ["uploaded", "extracting", "extracted", "correcting", "corrected", "validating", "completed", "error"]).default("uploaded").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export const footnotes = mysqlTable("footnotes", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  number: int("number").notNull(),
  article: text("article"),
  authors: text("authors"),
  year: varchar("year", { length: 10 }),
  originalText: text("originalText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Footnote = typeof footnotes.$inferSelect;
export type InsertFootnote = typeof footnotes.$inferInsert;

export const verificationResults = mysqlTable("verificationResults", {
  id: int("id").autoincrement().primaryKey(),
  footnoteId: int("footnoteId").notNull(),
  status: mysqlEnum("status", ["correct", "incorrect", "unsure"]).notNull(),
  explanation: text("explanation"),
  searchResults: text("searchResults"), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VerificationResult = typeof verificationResults.$inferSelect;
export type InsertVerificationResult = typeof verificationResults.$inferInsert;