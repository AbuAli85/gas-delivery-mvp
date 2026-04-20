CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerPhone` varchar(32),
	`customerName` varchar(128),
	`customerLat` float NOT NULL,
	`customerLng` float NOT NULL,
	`customerAddress` text,
	`gasAmount` decimal(10,2) NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'USD',
	`estimatedMinutes` int NOT NULL DEFAULT 30,
	`status` enum('pending','assigned','accepted','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`assignedProviderId` int,
	`rejectedProviderIds` json,
	`paymentStatus` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`paymentIntentId` varchar(256),
	`paymentMethod` varchar(64) DEFAULT 'mock',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`acceptedAt` timestamp,
	`deliveredAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`zonePolygon` json NOT NULL,
	`zoneCenterLat` float NOT NULL,
	`zoneCenterLng` float NOT NULL,
	`zoneLabel` varchar(128) NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`activeOrderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','provider') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);