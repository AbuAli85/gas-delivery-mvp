# Manual Testing Checklist

## Provider Flow

- [ ] Accept order
- [ ] Start delivery
- [ ] Mark `arrived`
- [ ] Confirm delivery

## Failure Flow

- [ ] Mark `failed_delivery` from `out_for_delivery`
- [ ] Mark `failed_delivery` from `arrived`
- [ ] Test each failure reason
- [ ] Add optional failure notes

## Admin Recovery

- [ ] Open failed order in Admin panel
- [ ] Confirm failure reason and notes are visible
- [ ] Click `Reschedule`
- [ ] Verify order returns to assignment flow (`pending` or `assigned`)

## Customer Tracking

- [ ] `arrived` status shows arrival banner
- [ ] `failed_delivery` shows reason + notes
- [ ] Polling stops on `failed_delivery`
- [ ] "Place New Order" action works
