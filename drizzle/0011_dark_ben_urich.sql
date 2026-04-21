CREATE TABLE `otp_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`verified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sub_zones` MODIFY COLUMN `polygon` json NOT NULL;