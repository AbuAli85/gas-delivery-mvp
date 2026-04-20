CREATE TABLE `order_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`providerId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`customerPhone` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_reviews_orderId_unique` UNIQUE(`orderId`)
);
