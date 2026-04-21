CREATE TABLE `provider_sub_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`subZoneId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `provider_sub_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sub_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zoneId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`centerLat` float NOT NULL,
	`centerLng` float NOT NULL,
	`polygon` json NOT NULL DEFAULT ('[]'),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sub_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `subZoneId` int;