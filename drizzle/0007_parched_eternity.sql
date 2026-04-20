CREATE TABLE `customer_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`otpHash` varchar(64),
	`otpExpiresAt` timestamp,
	`verified` boolean NOT NULL DEFAULT false,
	`sessionToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provider_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`lat` float NOT NULL,
	`lng` float NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_locations_providerId_unique` UNIQUE(`providerId`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
