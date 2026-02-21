CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracked_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`asin` varchar(20) NOT NULL,
	`productName` text NOT NULL,
	`productUrl` text NOT NULL,
	`productImage` text,
	`currentPrice` decimal(10,2) NOT NULL,
	`targetPrice` decimal(10,2) NOT NULL,
	`notificationEmail` varchar(320) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`lastCheckedAt` timestamp,
	`priceDropNotifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tracked_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_productId` ON `price_history` (`productId`);--> statement-breakpoint
CREATE INDEX `idx_checkedAt` ON `price_history` (`checkedAt`);--> statement-breakpoint
CREATE INDEX `idx_userId` ON `tracked_products` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_asin` ON `tracked_products` (`asin`);--> statement-breakpoint
CREATE INDEX `idx_userId_asin` ON `tracked_products` (`userId`,`asin`);