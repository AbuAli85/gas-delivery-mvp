CREATE TABLE `provider_working_hours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`openTime` varchar(5) NOT NULL DEFAULT '08:00',
	`closeTime` varchar(5) NOT NULL DEFAULT '22:00',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_working_hours_id` PRIMARY KEY(`id`)
);
