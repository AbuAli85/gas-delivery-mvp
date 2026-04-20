CREATE TABLE `order_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`providerId` int NOT NULL,
	`status` enum('pending','accepted','rejected','expired') NOT NULL DEFAULT 'pending',
	`attemptNumber` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`respondedAt` timestamp,
	CONSTRAINT `order_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`city` varchar(64) NOT NULL DEFAULT 'Muscat',
	`centerLat` float NOT NULL,
	`centerLng` float NOT NULL,
	`polygon` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `currency` varchar(8) NOT NULL DEFAULT 'OMR';--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `status` enum('draft','pending','assigned','accepted','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `orders` ADD `zoneId` int;--> statement-breakpoint
ALTER TABLE `providers` ADD `zoneId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `providers` DROP COLUMN `zonePolygon`;--> statement-breakpoint
ALTER TABLE `providers` DROP COLUMN `zoneCenterLat`;--> statement-breakpoint
ALTER TABLE `providers` DROP COLUMN `zoneCenterLng`;--> statement-breakpoint
ALTER TABLE `providers` DROP COLUMN `zoneLabel`;