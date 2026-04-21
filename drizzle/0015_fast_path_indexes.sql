-- Hot-path indexes for orders, providers, assignments, and sub-zone coverage.
-- MySQL-compatible (no partial-index WHERE clauses).

CREATE INDEX `idx_orders_status_createdAt` ON `orders` (`status`, `createdAt`);
CREATE INDEX `idx_orders_assignedProvider_status` ON `orders` (`assignedProviderId`, `status`);
CREATE INDEX `idx_orders_zone_status` ON `orders` (`zoneId`, `status`);
CREATE INDEX `idx_orders_customerPhone_createdAt` ON `orders` (`customerPhone`, `createdAt`);

CREATE INDEX `idx_providers_zone_available_status` ON `providers` (`zoneId`, `isAvailable`, `providerStatus`);

CREATE INDEX `idx_order_assignments_order_status` ON `order_assignments` (`orderId`, `status`);
CREATE INDEX `idx_order_assignments_provider_status_createdAt` ON `order_assignments` (`providerId`, `status`, `createdAt`);

CREATE INDEX `idx_provider_sub_zones_subZone_provider` ON `provider_sub_zones` (`subZoneId`, `providerId`);
