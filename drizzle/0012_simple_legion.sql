CREATE TABLE `customer_offer_redemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`offerId` int NOT NULL,
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_offer_redemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(128) NOT NULL,
	`titleAr` varchar(128) NOT NULL,
	`discountType` enum('percentage','fixed','free_delivery') NOT NULL,
	`discountValue` decimal(10,3) NOT NULL DEFAULT '0.000',
	`minTier` enum('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
	`pointsCost` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`sessionToken` varchar(128),
	`name` varchar(128),
	`email` varchar(320),
	`customerType` enum('individual','restaurant','business') NOT NULL DEFAULT 'individual',
	`points` int NOT NULL DEFAULT 0,
	`tier` enum('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
	`totalOrders` int NOT NULL DEFAULT 0,
	`totalSpent` decimal(10,3) NOT NULL DEFAULT '0.000',
	`referralCode` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_phone_unique` UNIQUE(`phone`),
	CONSTRAINT `customers_sessionToken_unique` UNIQUE(`sessionToken`),
	CONSTRAINT `customers_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviterId` int NOT NULL,
	`inviteeId` int NOT NULL,
	`status` enum('pending','rewarded') NOT NULL DEFAULT 'pending',
	`inviterPoints` int NOT NULL DEFAULT 50,
	`inviteePoints` int NOT NULL DEFAULT 20,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`rewardedAt` timestamp,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
