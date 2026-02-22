import { eq, and, desc, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, trackedProducts, priceHistory, TrackedProduct, PriceHistory, InsertTrackedProduct, InsertPriceHistory } from "../drizzle/schema";
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

// Product tracking queries

export async function addTrackedProduct(product: InsertTrackedProduct): Promise<TrackedProduct> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(trackedProducts).values(product);
  const id = result[0].insertId;
  
  const inserted = await db.select().from(trackedProducts).where(eq(trackedProducts.id, Number(id))).limit(1);
  if (!inserted.length) {
    throw new Error("Failed to retrieve inserted product");
  }
  
  return inserted[0];
}

export async function getUserTrackedProducts(userId: number): Promise<TrackedProduct[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(trackedProducts).where(eq(trackedProducts.userId, userId));
}

export async function getTrackedProductsByEmail(email: string): Promise<TrackedProduct[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(trackedProducts).where(eq(trackedProducts.notificationEmail, email));
}

export async function getTrackedProductById(productId: number): Promise<TrackedProduct | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(trackedProducts).where(eq(trackedProducts.id, productId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTrackedProduct(productId: number, updates: Partial<InsertTrackedProduct>): Promise<TrackedProduct> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(trackedProducts).set(updates).where(eq(trackedProducts.id, productId));
  
  const updated = await db.select().from(trackedProducts).where(eq(trackedProducts.id, productId)).limit(1);
  if (!updated.length) {
    throw new Error("Failed to retrieve updated product");
  }
  
  return updated[0];
}

export async function deleteTrackedProduct(productId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(trackedProducts).where(eq(trackedProducts.id, productId));
}

export async function getActiveTrackedProducts(): Promise<TrackedProduct[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return db.select().from(trackedProducts).where(eq(trackedProducts.isActive, 1));
}

// Price history queries

export async function addPriceHistory(history: InsertPriceHistory): Promise<PriceHistory> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(priceHistory).values(history);
  const id = result[0].insertId;
  
  const inserted = await db.select().from(priceHistory).where(eq(priceHistory.id, Number(id))).limit(1);
  if (!inserted.length) {
    throw new Error("Failed to retrieve inserted price history");
  }
  
  return inserted[0];
}

export async function getProductPriceHistory(productId: number, days: number = 30): Promise<PriceHistory[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return db.select()
    .from(priceHistory)
    .where(
      and(
        eq(priceHistory.productId, productId),
        gte(priceHistory.checkedAt, cutoffDate)
      )
    )
    .orderBy(desc(priceHistory.checkedAt));
}
