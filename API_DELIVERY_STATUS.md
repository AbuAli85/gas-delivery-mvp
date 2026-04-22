# Delivery Status API

This document describes the added delivery lifecycle APIs:

- `arrived`
- `failed_delivery`
- reschedule path for failed orders

## Provider Endpoints

### `providers.markArrived`

Mark that the assigned provider reached the delivery location.

Input:

```json
{
  "orderId": 123,
  "providerId": 45,
  "pinHash": "<sha256-pin>"
}
```

Response:

```json
{
  "success": true
}
```

### `providers.markFailedDelivery`

Mark delivery as failed, with required reason and optional notes.

Input:

```json
{
  "orderId": 123,
  "providerId": 45,
  "pinHash": "<sha256-pin>",
  "failureReason": "customer_unavailable",
  "failureNotes": "Customer phone off"
}
```

Response:

```json
{
  "success": true
}
```

## Admin Endpoint

### `providers.rescheduleFailedOrder`

Admin-only operation to move a failed order back to assignment flow.

Input:

```json
{
  "orderId": 123,
  "adminPin": "1234"
}
```

Response:

```json
{
  "success": true,
  "reassigned": true,
  "status": "assigned"
}
```
