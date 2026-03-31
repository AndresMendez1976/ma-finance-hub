# Billing Integration Path

## Current State

Tier assignment is internal-only via `POST /api/v1/tiers/internal/assign`.
Requires `x-internal-signature` header (HMAC-SHA256) in production mode.

## Integration Pattern

```
Stripe Webhook → Billing Service → POST /tiers/internal/assign
```

### Flow

1. Tenant owner initiates plan change via billing UI (future)
2. Billing UI creates Stripe Checkout Session
3. Stripe processes payment
4. Stripe sends webhook to Billing Service
5. Billing Service validates webhook signature
6. Billing Service calls `POST /api/v1/tiers/internal/assign` with HMAC signature
7. MA Finance Hub validates HMAC, validates downgrade limits, assigns tier
8. Response includes new tier + entitlements

### Required for billing integration

1. Billing Service (separate microservice or module)
2. Stripe API integration (checkout sessions, subscriptions, webhooks)
3. Webhook endpoint with Stripe signature verification
4. Mapping: Stripe price_id → tier_id
5. INTERNAL_OPS_SECRET shared between billing service and MA Finance Hub

### What MA Finance Hub already provides

- Internal tier assignment endpoint with HMAC auth
- Downgrade validation (blocks if usage exceeds new limits)
- Audit logging of tier changes
- Cache invalidation on tier change
- Entitlement enforcement across all modules

### What MA Finance Hub does NOT provide (and should not)

- Stripe integration (belongs in billing service)
- Payment processing
- Invoice generation
- Subscription management UI
- Price management

### Security requirements for billing service

- Stripe webhook signature verification
- HMAC signing for internal API calls
- Idempotency handling (Stripe sends duplicate webhooks)
- Audit trail of billing events
