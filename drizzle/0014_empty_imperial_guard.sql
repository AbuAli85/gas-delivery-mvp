ALTER TABLE `orders` ADD `smsDeliveryStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `smsDeliveredAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `smsSid` varchar(64);