CREATE TABLE `saved_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionKey` varchar(64) NOT NULL,
	`label` enum('home','work','other') NOT NULL DEFAULT 'other',
	`lat` float NOT NULL,
	`lng` float NOT NULL,
	`address` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryLat` float;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryLng` float;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryAddress` text;