-- Add arrived + failed_delivery lifecycle states and failure metadata.
ALTER TABLE `orders`
MODIFY COLUMN `status` enum(
  'draft',
  'pending',
  'assigned',
  'accepted',
  'out_for_delivery',
  'arrived',
  'delivered',
  'failed_delivery',
  'cancelled'
) NOT NULL DEFAULT 'draft';

ALTER TABLE `orders`
ADD COLUMN `arrivedAt` timestamp NULL,
ADD COLUMN `failureReason` enum(
  'customer_unavailable',
  'wrong_address',
  'customer_refused',
  'unsafe_location',
  'payment_issue',
  'other'
) NULL,
ADD COLUMN `failureNotes` text NULL;

CREATE INDEX `idx_orders_status_failureReason` ON `orders` (`status`, `failureReason`);
CREATE INDEX `idx_orders_arrivedAt` ON `orders` (`arrivedAt`);
