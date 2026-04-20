ALTER TABLE `providers` ADD `pinHash` varchar(64);--> statement-breakpoint
ALTER TABLE `providers` ADD `providerStatus` enum('pending_review','approved','rejected') DEFAULT 'pending_review' NOT NULL;--> statement-breakpoint
ALTER TABLE `providers` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `providers` ADD `vehicleType` varchar(64);--> statement-breakpoint
ALTER TABLE `providers` ADD `vehiclePlate` varchar(32);--> statement-breakpoint
ALTER TABLE `providers` ADD `nationalId` varchar(64);--> statement-breakpoint
ALTER TABLE `providers` ADD `adminCreated` boolean DEFAULT false NOT NULL;