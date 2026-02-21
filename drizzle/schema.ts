import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, index } from "drizzle-orm/mysql-core";

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

/**
 * Tracked Amazon products table.
 * Stores product information and tracking details for each user.
 */
export const trackedProducts = mysqlTable("tracked_products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  asin: varchar("asin", { length: 20 }).notNull(),
  productName: text("productName").notNull(),
  productUrl: text("productUrl").notNull(),
  productImage: text("productImage"),
  currentPrice: decimal("currentPrice", { precision: 10, scale: 2 }).notNull(),
  targetPrice: decimal("targetPrice", { precision: 10, scale: 2 }).notNull(),
  notificationEmail: varchar("notificationEmail", { length: 320 }).notNull(),
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  lastCheckedAt: timestamp("lastCheckedAt"),
  priceDropNotifiedAt: timestamp("priceDropNotifiedAt"), // Track when notification was sent
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_userId").on(table.userId),
  asinIdx: index("idx_asin").on(table.asin),
  userAsinIdx: index("idx_userId_asin").on(table.userId, table.asin),
}));

export type TrackedProduct = typeof trackedProducts.$inferSelect;
export type InsertTrackedProduct = typeof trackedProducts.$inferInsert;

/**
 * Price history table.
 * Stores historical price data for tracking price trends.
 */
export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
}, (table) => ({
  productIdIdx: index("idx_productId").on(table.productId),
  checkedAtIdx: index("idx_checkedAt").on(table.checkedAt),
}));

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;
