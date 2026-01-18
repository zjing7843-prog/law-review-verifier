import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, documents, footnotes, verificationResults, InsertDocument, Footnote, InsertFootnote, InsertVerificationResult } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  // Get the inserted document ID
  const insertedId = Number(result[0].insertId);
  return { id: insertedId, ...result };
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0];
}

export async function updateDocumentStatus(id: number, status: string, extractedCount?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status, updatedAt: new Date() };
  if (extractedCount !== undefined) {
    updateData.extractedFootnotes = extractedCount;
  }
  await db.update(documents).set(updateData).where(eq(documents.id, id));
}

export async function createFootnotes(data: InsertFootnote[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(footnotes).values(data);
}

export async function getFootnotesByDocumentId(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(footnotes).where(eq(footnotes.documentId, documentId));
}

export async function updateFootnote(id: number, data: Partial<Footnote>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(footnotes).set({ ...data, updatedAt: new Date() }).where(eq(footnotes.id, id));
}

export async function createVerificationResult(data: InsertVerificationResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(verificationResults).values(data);
}

export async function getVerificationResultsByDocumentId(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select()
    .from(verificationResults)
    .innerJoin(footnotes, eq(verificationResults.footnoteId, footnotes.id))
    .where(eq(footnotes.documentId, documentId));
}
