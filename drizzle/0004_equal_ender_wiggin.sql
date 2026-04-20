ALTER TABLE `orders` MODIFY COLUMN `paymentStatus` enum('pending','confirmed','failed','refunded') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `paymentMethod` enum('cash','online','bank_transfer') NOT NULL DEFAULT 'cash';--> statement-breakpoint
ALTER TABLE `orders` ADD `commissionAmount` decimal(10,3) DEFAULT '0.100' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `providerCommissionStatus` enum('unpaid','pending_settlement','settled') DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `assignedAt` timestamp;--> statement-breakpoint
ALTER TABLE `providers` ADD `acceptedOrders` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `providers` ADD `rejectedOrders` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `providers` ADD `totalOrders` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `providers` ADD `totalCommission` decimal(10,3) DEFAULT '0.000' NOT NULL;