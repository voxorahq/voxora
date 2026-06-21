# Voxora Payment Security & SaaS Database Architecture

## Purpose

This document defines the secure payment, billing, webhook, tenant-isolation, and database architecture for Voxora.

It is intended to be used as a technical handoff document for developers and AI coding agents working on the Voxora SaaS backend.

The scope of this file is limited to:

- Payment gateway security
- Stripe Checkout and Stripe Billing
- Stripe webhook verification and idempotency
- Vapi usage billing protection
- Multi-tenant SaaS database structure
- Wallet and usage ledgers
- Billing audit logs
- Concurrent call protection
- Secure backend coding rules
- Failure cases and their solutions

This document does not define the complete product architecture, frontend design, or client dashboard.

---

# 1. Core Security Principle

Voxora must never directly process or store raw card details.

Use Stripe-hosted payment pages such as:

- Stripe Checkout
- Stripe Customer Portal

The Voxora frontend redirects the customer to Stripe, Stripe collects the card details, and Stripe sends trusted webhook events to the Voxora backend.

Voxora stores only payment references and SaaS billing state.

## Never store

- Card number
- CVV
- Card expiry
- Raw bank details
- Full payment credentials
- Stripe secret keys in the frontend
- Raw webhook secrets in source control

## Safe values to store

- `stripeCustomerId`
- `stripeSubscriptionId`
- `stripePriceId`
- `stripeCheckoutSessionId`
- Subscription status
- Subscription tier
- Billing period dates
- Base-minute usage
- Wallet balance
- Payment event IDs
- Billing transaction history

---

# 2. High-Level Payment Architecture

```text
Customer
   ↓
Voxora Pricing Page
   ↓
Server creates Stripe Checkout Session
   ↓
Stripe-hosted Checkout
   ↓
Customer completes payment
   ↓
Stripe sends signed webhook event
   ↓
Voxora verifies webhook signature
   ↓
Voxora checks event idempotency
   ↓
Voxora updates subscription and billing ledgers
   ↓
Internal admin system reflects the new state
```

The frontend must never be trusted to activate a subscription, add wallet balance, or reset included minutes.

Only verified server-side webhook events may perform financial state changes.

---

# 3. Environment Variables

Use server-only environment variables for all payment secrets.

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
VAPI_WEBHOOK_SECRET=
MONGODB_URI=
JWT_SECRET=
```

## Exposure rules

Only the following value may be exposed to the browser:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

Never expose:

```env
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
VAPI_WEBHOOK_SECRET
MONGODB_URI
JWT_SECRET
```

## Operational rules

- Store production secrets in the hosting provider's secret manager.
- Use separate test and production keys.
- Rotate keys immediately if leaked.
- Prefer restricted Stripe API keys where possible.
- Never commit `.env.local` or production environment files.
- Use different webhook secrets for development, staging, and production.

---

# 4. Required Database Collections

The payments and SaaS security architecture requires the following MongoDB collections:

```text
users
organizations
subscriptions
calls
stripe_events
wallet_transactions
billing_events
call_reservations
```

## Schema Specifications for Key Collections

To ensure strict TypeScript safety across database transactions, define Mongoose models matching the following shapes for the core SaaS collections:

### Users Collection
```ts
interface UserDocument {
  _id: ObjectId;
  email: string;
  name?: string;
  role: "admin" | "user" | "staff";
  orgId: ObjectId; // Multi-tenant link
  createdAt: Date;
  updatedAt: Date;
}
```

### Organizations Collection
```ts
interface OrganizationDocument {
  _id: ObjectId;
  name: string;
  stripeCustomerId?: string; // Shared handle with Stripe
  createdAt: Date;
  updatedAt: Date;
}
```

### Calls Collection
```ts
interface CallDocument {
  _id: ObjectId;
  orgId: ObjectId;
  callId: string; // External unique ID from Vapi
  customerPhone?: string;
  assistantId: string;
  status: "initiated" | "active" | "completed" | "failed";
  durationSeconds: number;
  
  // Ledger breakdown fields
  costUSD: number; // Combined total billing cost
  billingType: "base_minutes" | "overage_wallet" | "mixed";
  baseMinutesCharged: number;
  walletUSDCharged: number;
  
  createdAt: Date;
  endedAt?: Date;
}
```

Optional future collections:

```text
invoices
refunds
admin_actions
security_events
```

---

# 5. Multi-Tenant Security Model

Every business customer is represented by an organization.

Every organization-owned record must contain an `orgId`.

```text
User → Organization → Subscription
                  → Calls
                  → Wallet Transactions
                  → Billing Events
                  → Call Reservations
```

## Critical rule

Every tenant-specific database query must include `orgId`.

### Bad

```ts
await db.collection("calls").find({}).toArray();
```

### Correct

```ts
await db.collection("calls").find({ orgId }).toArray();
```

A missing `orgId` filter can expose one client's financial or call data to another client.

## Recommended authorization helper

```ts
export async function requireOrganizationAccess(
  userId: ObjectId,
  orgId: ObjectId
) {
  const user = await db.collection("users").findOne({
    _id: userId,
    orgId,
  });

  if (!user) {
    throw new Error("Forbidden");
  }

  return user;
}
```

---

# 6. Subscription Collection

The subscription document is the current billing-state snapshot for an organization.

```ts
interface SubscriptionDocument {
  _id: ObjectId;
  orgId: ObjectId;

  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;

  subscriptionTier: "free" | "starter" | "professional" | "custom";
  subscriptionStatus:
    | "inactive"
    | "trialing"
    | "active"
    | "past_due"
    | "paused"
    | "canceled";

  baseMinutesAllocated: number;
  baseMinutesUsed: number;

  walletBalanceUSD: number;

  reservedBaseMinutes: number;
  reservedWalletUSD: number;

  // Cached operational metric only. The reservation collection is the source of truth.
  activeCallsCount: number;

  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

## Required indexes

```ts
SubscriptionSchema.index({ orgId: 1 }, { unique: true });
SubscriptionSchema.index(
  { stripeCustomerId: 1 },
  { unique: true, sparse: true }
);
SubscriptionSchema.index(
  { stripeSubscriptionId: 1 },
  { unique: true, sparse: true }
);
```

## Important separation

The subscription collection stores the current state.

It must not be treated as the complete financial history.

The complete history belongs in `wallet_transactions` and `billing_events`.

---

# 7. Dual-Ledger Billing Model

Voxora uses two separate usage ledgers.

## Ledger A: Included base minutes

```text
baseMinutesAllocated
baseMinutesUsed
```

Calls consume included base minutes first.

## Ledger B: Wallet balance

```text
walletBalanceUSD
```

After base minutes are exhausted, calls consume the wallet at the plan's overage rate.

Example rates:

```text
Starter overage: $0.45 per minute
Professional overage: $0.35 per minute
```

## Dynamic Overage Rates Resolution

To avoid hardcoding pricing structures directly in backend logic, the system should resolve overage rates dynamically:

1. **Configuration Map**: Maintain a static plan configuration dictionary:
   ```ts
   export const PLAN_CONFIGS = {
     free: { baseMinutes: 10, overageRate: 0.00 },
     starter: { baseMinutes: 100, overageRate: 0.45 },
     professional: { baseMinutes: 500, overageRate: 0.35 },
     custom: { baseMinutes: 1000, overageRate: 0.25 }
   } as const;
   ```
2. **Stripe Product Metadata (Alternative)**: Read metadata fields directly from the Stripe Price objects fetched dynamically during runtime operations.

## Courtesy overdraft

The wallet may reach a maximum negative balance of:

```text
-$15.00
```

After the overdraft is exhausted, new calls must be routed to a fallback voicemail assistant or blocked according to business policy.

---

# 8. Wallet Transaction Ledger

Every change to `walletBalanceUSD` must create an immutable transaction record.

```ts
interface WalletTransactionDocument {
  _id: ObjectId;
  orgId: ObjectId;

  type:
    | "topup"
    | "overage_deduction"
    | "refund"
    | "renewal_overdraft_forgiveness"
    | "manual_adjustment"
    | "reservation"
    | "reservation_release";

  amountUSD: number;
  balanceBefore: number;
  balanceAfter: number;

  stripeEventId?: string;
  stripeCheckoutSessionId?: string;
  callId?: string;
  reservationId?: ObjectId;

  idempotencyKey: string;
  description?: string;

  createdAt: Date;
}
```

## Required indexes

```ts
WalletTransactionSchema.index(
  { idempotencyKey: 1 },
  { unique: true }
);

WalletTransactionSchema.index({ orgId: 1, createdAt: -1 });
WalletTransactionSchema.index({ callId: 1 });
WalletTransactionSchema.index({ stripeEventId: 1 });
```

## Why this ledger is required

It allows Voxora to answer:

- Why did the wallet change?
- Which call caused a deduction?
- Was a top-up applied twice?
- What was the balance before and after the transaction?
- Which Stripe event caused the change?
- Was an admin adjustment made?

---

# 9. Stripe Event Idempotency

Stripe may deliver the same webhook event more than once.

Every event must be processed only once.

## Stripe event collection

```ts
interface StripeEventDocument {
  _id: ObjectId;
  eventId: string;
  eventType: string;
  livemode: boolean;
  status: "processing" | "processed" | "failed" | "ignored";
  attempts: number;
  lastError?: string;
  receivedAt: Date;
  processedAt?: Date;
}
```

## Required unique index

```ts
StripeEventSchema.index({ eventId: 1 }, { unique: true });
```

## Processing flow

```text
Receive webhook
↓
Verify Stripe signature
↓
Insert stripe_events skeleton using event.id
↓
Duplicate key?
   Yes → return HTTP 200 already_processed
   No  → continue
↓
Process event
↓
Mark event processed
```

## Example

```ts
try {
  await db.collection("stripe_events").insertOne({
    eventId: event.id,
    eventType: event.type,
    livemode: event.livemode,
    status: "processing",
    attempts: 1,
    receivedAt: new Date(),
  });
} catch (error: any) {
  if (error.code === 11000) {
    return Response.json({ status: "already_processed" });
  }

  throw error;
}
```

---

# 10. Stripe Webhook Signature Verification

Stripe webhooks must be verified using the raw request body.

Do not parse Stripe webhook requests with `req.json()` before signature verification.

```ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return Response.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  // Run idempotency gate before changing financial state.
  return processStripeEvent(event);
}
```

## Webhook Timeout and Retry Handling

Stripe requires webhooks to be acknowledged within **3 seconds** (up to 10 seconds maximum connection limit). If processing a webhook requires slow database transactions or API responses:
1. **Respond Immediately**: Verify the signature, insert the placeholder in `stripe_events`, and send a `200 OK` status immediately. Start the actual business logic asynchronously or offload to a background task queue.
2. **Handle Retries Safely**: Stripe automatically retries failed events with exponential backoff for up to 3 days. The unique index on `stripe_events.eventId` prevents multiple retries from executing billing adjustments more than once.

---

# 11. Trusted Top-Up Amounts

Never trust a wallet-credit amount stored only in Stripe metadata.

Metadata may be incorrect, stale, or misconfigured.

For wallet top-ups, calculate the credited amount using the trusted Stripe transaction amount.

```ts
const amountPaidUSD = (session.amount_total ?? 0) / 100;
```

Metadata may identify the transaction type:

```ts
session.metadata?.type === "wallet_topup"
```

But metadata must not be the source of truth for the amount credited.

## Safe top-up flow

```text
checkout.session.completed
↓
Verify event signature
↓
Check event idempotency
↓
Confirm payment_status is paid
↓
Read session.amount_total
↓
Resolve organization from trusted customer/session mapping
↓
Atomically increment wallet
↓
Create wallet transaction record
```

## Example

```ts
const amountUSD = (session.amount_total ?? 0) / 100;

if (session.payment_status !== "paid" || amountUSD <= 0) {
  throw new Error("Invalid or unpaid top-up session");
}
```

---

# 12. Subscription Initialization and Renewal Safety

A first subscription checkout can produce multiple related Stripe events, including:

- `checkout.session.completed`
- `customer.subscription.created`
- `invoice.paid`

These events must not double-initialize or double-credit the subscription.

## Recommended responsibility split

### `checkout.session.completed`

Use it to:

- Link Stripe customer to organization
- Save the subscription ID
- Record the selected plan
- Record checkout completion
- Handle one-time wallet top-ups

Do not treat it as the authoritative monthly renewal event.

### `invoice.paid`

Use it to:

- Activate the subscription
- Set the current billing period
- Reset monthly base usage exactly once per invoice
- Forgive a negative overdraft if policy allows

### `customer.subscription.updated`

Use it to:

- Synchronize tier changes
- Synchronize cancellation-at-period-end
- Synchronize pause or status changes

### `customer.subscription.deleted`

Use it to:

- Mark the subscription as canceled
- Disable paid AI call handling
- Route future calls to fallback mode

## Prevent duplicate monthly resets

Store the latest processed invoice ID or billing-period key.

```ts
lastResetInvoiceId?: string;
```

Before resetting monthly usage:

```ts
if (sub.lastResetInvoiceId === invoice.id) {
  return;
}
```

Then atomically set:

```ts
{
  baseMinutesUsed: 0,
  reservedBaseMinutes: 0,
  reservedWalletUSD: 0,
  activeCallsCount: 0,
  lastResetInvoiceId: invoice.id,
  currentPeriodStart,
  currentPeriodEnd,
  subscriptionStatus: "active"
}
```

If `walletBalanceUSD < 0`, set it to zero according to the courtesy-overdraft policy.

If `walletBalanceUSD > 0`, preserve it.

---

# 13. Concurrent Call Race Conditions

A business may receive multiple calls at the same time.

If all calls read the same remaining minutes and wallet before any call finishes, every call may believe that the full balance is available.

This can cause the wallet to exceed the `-$15.00` limit.

## Required protection

Use call reservations.

Before approving a call, reserve a portion of the customer's remaining call capacity.

Cached subscription fields:

```ts
activeCallsCount: number;
reservedBaseMinutes: number;
reservedWalletUSD: number;
```

These cached fields must never replace reservation records as the source of truth.

Use a dedicated `call_reservations` collection. This collection is the financial source of truth for concurrent-call capacity. `activeCallsCount` on the subscription document is only a cached operational metric.

```ts
interface CallReservationDocument {
  _id: ObjectId;
  orgId: ObjectId;
  subscriptionId: ObjectId;
  callId: string;

  reservedBaseMinutes: number;
  reservedWalletUSD: number;
  maxDurationSeconds: number;

  status: "active" | "settled" | "released" | "expired";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  settledAt?: Date;
  releasedAt?: Date;
}
```

## Required indexes

```ts
CallReservationSchema.index({ callId: 1 }, { unique: true });
CallReservationSchema.index({ subscriptionId: 1, status: 1 });
CallReservationSchema.index({ orgId: 1, status: 1 });
CallReservationSchema.index({ expiresAt: 1 });
```

Do not use an automatic TTL deletion index if reservation history is needed for financial audits. Prefer a cleanup job that marks stale reservations as `expired`, releases capacity idempotently, and archives or deletes old settled records only after the required retention period.

## Reservation flow

```text
assistant-request received
↓
Load subscription and active reservations
↓
Subtract existing reservations from available capacity
↓
Calculate safe max duration
↓
safeSeconds < 60?
   Yes → immediately return voicemail fallback
   No  → attempt an atomic reservation
↓
Reservation succeeds?
   Yes → return assistant configuration
   No  → immediately return voicemail fallback
```

The minimum funded call threshold is a named policy constant:

```ts
export const MINIMUM_FUNDED_CALL_SECONDS = 60;
```

A new concurrent call must never borrow, decrement, or disturb capacity that has already been reserved for an active call.

## Call end flow

```text
end-of-call-report received
↓
Load matching reservation
↓
Calculate actual billing
↓
Apply actual usage
↓
Release reservation
↓
Mark reservation settled
```

## Idempotent reservation release

Release a reservation only when it is still active:

```ts
const releaseResult = await db.collection("call_reservations").updateOne(
  {
    callId,
    subscriptionId,
    status: "active",
  },
  {
    $set: {
      status: "released",
      releasedAt: new Date(),
      updatedAt: new Date(),
    },
  },
  { session }
);

if (releaseResult.modifiedCount === 1) {
  await db.collection("subscriptions").updateOne(
    { _id: subscriptionId },
    [
      {
        $set: {
          activeCallsCount: {
            $max: [
              0,
              {
                $subtract: [
                  { $ifNull: ["$activeCallsCount", 0] },
                  1,
                ],
              },
            ],
          },
        },
      },
    ],
    { session }
  );
}
```

A second release attempt modifies zero reservation records and therefore does not decrement the cached counter.

## Failed or abandoned call

If Vapi never sends an end-of-call report (e.g., due to network disconnection or provider outage), an expiration job must release the reservation after a safe timeout (e.g., 30 minutes).

### Reservation Expiration Cron Implementation

We must implement a periodic background worker (e.g., executing every 5 minutes) that runs the following atomic queries to free locked capacity for abandoned calls:

1. **Find Expired Reservations**: Query `call_reservations` for records where `status: "active"` and `expiresAt` is less than the current time.
2. **Atomic Lock Release and Expiration**:
```ts
const expiredReservations = await db.collection("call_reservations").find({
  status: "active",
  expiresAt: { $lt: new Date() }
}).toArray();

for (const res of expiredReservations) {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Mark reservation expired
      const updateRes = await db.collection("call_reservations").updateOne(
        { _id: res._id, status: "active" },
        { $set: { status: "expired", updatedAt: new Date() } },
        { session }
      );

      if (updateRes.modifiedCount === 1) {
        // 2. Decrement locked reservations on subscription
        await db.collection("subscriptions").updateOne(
          { _id: res.subscriptionId },
          [
            {
              $set: {
                activeCallsCount: { $max: [0, { $subtract: ["$activeCallsCount", 1] }] },
                reservedBaseMinutes: { $max: [0, { $subtract: ["$reservedBaseMinutes", res.reservedBaseMinutes] }] },
                reservedWalletUSD: { $max: [0, { $subtract: ["$reservedWalletUSD", res.reservedWalletUSD] }] }
              }
            }
          ],
          { session }
        );

        // 3. Log a critical audit event
        await db.collection("billing_events").insertOne({
          orgId: res.orgId,
          source: "system",
          eventType: "reservation_expired",
          severity: "warning",
          message: `Stale call reservation ${res.callId} expired and capacity was released.`,
          metadata: { callId: res.callId },
          createdAt: new Date()
        }, { session });
      }
    });
  } catch (err) {
    console.error(`💥 Failed to expire reservation ${res.callId}:`, err);
  } finally {
    await session.endSession();
  }
}
```

Reservation release must be idempotent. Only a reservation currently in `active` state may be settled, released, or expired. If an end-of-call report arrives without a matching active reservation, do not decrement counters or release funds that were never reserved. Log a billing warning and continue processing the actual call using the normal idempotent call-billing path.

---

# 14. Safe Maximum Call Duration

The maximum call duration must consider both remaining base minutes and available wallet/overdraft capacity.

Do not automatically allow 30 minutes just because at least one base minute remains.

## Formula

```text
Available base minutes
+
Available wallet-funded minutes
=
Maximum financially safe call duration
```

Where:

```text
availableWalletCapacityUSD = walletBalanceUSD - (-15.00)
```

And:

```text
walletMinutes = availableWalletCapacityUSD / overageRate
```

## Example implementation

```ts
export function calculateSafeMaxDurationSeconds({
  baseMinutesAllocated,
  baseMinutesUsed,
  reservedBaseMinutes,
  walletBalanceUSD,
  reservedWalletUSD,
  overageRate,
  absoluteSafetyCapSeconds = 1800,
}: {
  baseMinutesAllocated: number;
  baseMinutesUsed: number;
  reservedBaseMinutes: number;
  walletBalanceUSD: number;
  reservedWalletUSD: number;
  overageRate: number;
  absoluteSafetyCapSeconds?: number;
}) {
  const baseMinutesRemaining = Math.max(
    0,
    baseMinutesAllocated - baseMinutesUsed - reservedBaseMinutes
  );

  const availableWalletCapacityUSD = Math.max(
    0,
    walletBalanceUSD - reservedWalletUSD - -15
  );

  const walletMinutesRemaining =
    overageRate > 0 ? availableWalletCapacityUSD / overageRate : 0;

  const safeMinutes = baseMinutesRemaining + walletMinutesRemaining;
  const safeSeconds = Math.floor(safeMinutes * 60);

  return Math.max(
    0,
    Math.min(absoluteSafetyCapSeconds, safeSeconds)
  );
}
```

If the result is less than `MINIMUM_FUNDED_CALL_SECONDS`, immediately return the voicemail fallback assistant.

```ts
const safeSeconds = calculateSafeMaxDurationSeconds(subscriptionState);

if (safeSeconds < MINIMUM_FUNDED_CALL_SECONDS) {
  return buildVoicemailFallbackResponse();
}
```

This prevents a second concurrent call from consuming capacity already locked by another active reservation and avoids starting calls that cannot be funded for at least one minute.

---

# 15. Call Idempotency and Vapi Webhook Security

Every Vapi webhook must verify a shared secret or supported signature mechanism.

```ts
const providedSecret = req.headers.get("x-vapi-secret");

if (providedSecret !== process.env.VAPI_WEBHOOK_SECRET) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

Every call must have a unique `callId`.

```ts
CallSchema.index({ callId: 1 }, { unique: true });
```

## End-of-call idempotency flow

```text
Receive end-of-call-report
↓
Verify Vapi secret
↓
Insert skeleton call record using unique callId
↓
Duplicate key?
   Yes → return HTTP 200 already_processed
   No  → continue
↓
Settle reservation
↓
Apply billing
↓
Store telemetry
↓
Mark processed
```

---

# 16. Billing Events Audit Collection

Use a general billing event collection for operational and debugging history.

```ts
interface BillingEventDocument {
  _id: ObjectId;
  orgId?: ObjectId;

  source: "stripe" | "vapi" | "admin" | "system";
  eventType: string;
  externalEventId?: string;

  status: "processing" | "processed" | "failed" | "ignored";
  severity: "info" | "warning" | "critical";

  message: string;
  metadata?: Record<string, unknown>;
  error?: string;

  createdAt: Date;
  processedAt?: Date;
}
```

## Examples

```text
Stripe invoice paid
Stripe payment failed
Wallet top-up applied
Duplicate Stripe event ignored
Duplicate Vapi call ignored
Call entered overage billing
Overdraft limit reached
Voicemail fallback activated
Reservation expired and released
Manual wallet adjustment
```

---

# 17. Atomic Database Updates

Financial operations must be atomic.

Do not perform unsafe read-modify-write logic when multiple webhooks or calls may run concurrently.

## Unsafe

```ts
const sub = await subscriptions.findOne({ orgId });
const newBalance = sub.walletBalanceUSD + amount;
await subscriptions.updateOne(
  { orgId },
  { $set: { walletBalanceUSD: newBalance } }
);
```

Two requests can overwrite each other.

## Better

```ts
await subscriptions.updateOne(
  { orgId },
  { $inc: { walletBalanceUSD: amount } }
);
```

## Best for multi-document financial changes

When available in your MongoDB deployment, use a transaction for:

- Updating subscription balance
- Creating wallet transaction
- Updating call record
- Releasing call reservation

```ts
const session = client.startSession();

await session.withTransaction(async () => {
  // Update subscription.
  // Insert wallet transaction.
  // Update call.
  // Settle reservation.
});
```

If a transaction cannot be used, every operation needs a stable idempotency key and reconciliation strategy.

## MongoDB transaction deployment requirement

MongoDB multi-document transactions work only on replica sets and sharded clusters. They do not work on a standalone `mongod` process.

Production should use MongoDB Atlas or another transaction-capable replica-set deployment.

For local development, initialize MongoDB as a single-node replica set:

```bash
mongod --dbpath ./data --replSet rs0
```

Then run once:

```bash
mongosh
rs.initiate()
```

For Docker-based development:

```yaml
services:
  mongodb:
    image: mongo:latest
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
```

The application should fail clearly during startup or integration testing if transactions are required but the connected deployment does not support them. Do not silently downgrade production financial operations to unsafe non-transactional behavior.

## Safe cached active-call counter updates

Never blindly run:

```ts
{ $inc: { activeCallsCount: -1 } }
```

A duplicate report, missing reservation, or unusual network sequence could push the counter below zero.

Only decrement after an active reservation was successfully transitioned out of `active`. Clamp the cached counter atomically with an aggregation-pipeline update:

```ts
await db.collection("subscriptions").updateOne(
  { _id: subscriptionId },
  [
    {
      $set: {
        activeCallsCount: {
          $max: [
            0,
            {
              $subtract: [
                { $ifNull: ["$activeCallsCount", 0] },
                1,
              ],
            },
          ],
        },
      },
    },
  ],
  { session }
);
```

The reservation collection remains the source of truth. Reconcile the cached count periodically:

```ts
const actualActiveCalls = await db
  .collection("call_reservations")
  .countDocuments({
    subscriptionId,
    status: "active",
    expiresAt: { $gt: new Date() },
  });
```

---

# 18. Secure Checkout Session Creation

The client must never choose arbitrary Stripe price IDs or wallet-credit amounts.

The frontend sends a safe internal plan key:

```json
{
  "plan": "professional"
}
```

The backend maps it to a trusted Stripe price ID.

```ts
const PLAN_PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID!,
  professional: process.env.STRIPE_PRO_PRICE_ID!,
} as const;
```

## Secure route example

```ts
export async function POST(req: Request) {
  const user = await requireAuthenticatedUser(req);
  const { plan } = await req.json();

  if (plan !== "starter" && plan !== "professional") {
    return Response.json({ error: "Invalid plan" }, { status: 400 });
  }

  const org = await getOrganizationForUser(user.id);
  const priceId = PLAN_PRICE_IDS[plan];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: org.stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/billing/success`,
    cancel_url: `${process.env.APP_URL}/billing/cancel`,
    client_reference_id: org._id.toString(),
    metadata: {
      orgId: org._id.toString(),
      purpose: "subscription_checkout",
    },
  });

  return Response.json({ url: session.url });
}
```

The backend must verify that the authenticated user belongs to the organization before creating the checkout session.

---

# 19. Customer Portal Security

Use Stripe Customer Portal for:

- Card updates
- Invoice downloads
- Subscription cancellation
- Billing-information changes

Create portal sessions only from an authenticated backend route.

```ts
const portalSession = await stripe.billingPortal.sessions.create({
  customer: subscription.stripeCustomerId,
  return_url: `${process.env.APP_URL}/billing`,
});
```

Never accept a Stripe customer ID directly from the frontend.

Resolve the customer ID from the authenticated organization's database record.

---

# 20. Refund and Chargeback Handling

Future production code should handle:

- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`
- Relevant invoice/payment-failure events

## Refund rules

A refund must not blindly add money back to the internal wallet.

The system must determine what the original payment represented:

- Subscription payment
- Wallet top-up
- Manual invoice
- Setup fee

Create a compensating wallet transaction instead of deleting history.

## Chargeback rules

When a dispute is opened:

- Create a critical billing alert.
- Optionally pause future wallet top-ups.
- Do not automatically delete customer data.
- Preserve all billing records and call logs for evidence.

---

# 21. Logging and Data Privacy

Do not log:

- Stripe secret keys
- Webhook secrets
- Full authorization headers
- Full payment payloads containing unnecessary personal information
- Raw card or bank information

Safe logging examples:

```text
Stripe event ID
Stripe event type
Organization ID
Subscription ID
Call ID
Transaction ID
Processing result
Error category
```

Mask sensitive values in logs.

```ts
function maskIdentifier(value?: string) {
  if (!value || value.length < 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
```

---

# 22. Rate Limiting and Abuse Protection

Apply rate limits to:

- Checkout-session creation
- Customer Portal session creation
- Authentication routes
- Admin billing-adjustment routes
- Public demo-call routes

Do not rely on rate limiting as webhook authentication.

Webhook security still requires cryptographic signature or shared-secret validation.

---

# 23. Admin Financial Actions

Manual financial actions should be rare and fully audited.

Examples:

- Add wallet credit
- Remove wallet credit
- Forgive debt
- Pause billing
- Change subscription tier

Require:

- Admin authentication
- Admin role authorization
- Reason field
- Idempotency key
- Immutable audit record
- Before and after balances

```ts
interface AdminAdjustment {
  orgId: ObjectId;
  adminUserId: ObjectId;
  amountUSD: number;
  reason: string;
  idempotencyKey: string;
}
```

---

# 24. Recommended API Structure

```text
src/
  app/
    api/
      billing/
        checkout/route.ts
        portal/route.ts
        wallet-topup/route.ts
      webhooks/
        stripe/route.ts
        vapi/route.ts
      admin/
        billing/
          adjust-wallet/route.ts
          subscriptions/route.ts
          events/route.ts

  lib/
    auth/
      require-user.ts
      require-admin.ts
      require-org-access.ts
    billing/
      calculate-call-billing.ts
      calculate-safe-duration.ts
      create-wallet-transaction.ts
      settle-call-reservation.ts
      stripe-event-handler.ts
    stripe/
      client.ts
      prices.ts
    vapi/
      verify-webhook.ts
    db/
      mongodb.ts
      transactions.ts

  models/
    Subscription.ts
    StripeEvent.ts
    WalletTransaction.ts
    BillingEvent.ts
    CallReservation.ts
    Call.ts
```

---

# 25. Critical Failure Cases and Solutions

## Failure: forged Stripe webhook

**Risk:** An attacker activates plans or adds wallet balance.

**Solution:** Verify Stripe's webhook signature using the raw request body.

---

## Failure: duplicate Stripe event

**Risk:** A subscription resets twice or a wallet top-up is applied twice.

**Solution:** Unique index on `stripe_events.eventId`.

---

## Failure: duplicate Vapi end-of-call webhook

**Risk:** One call is billed multiple times.

**Solution:** Unique index on `calls.callId` and insert the skeleton record first.

---

## Failure: frontend activates subscription

**Risk:** A user modifies a request and receives service without payment.

**Solution:** Only verified Stripe webhooks may activate billing state.

---

## Failure: client chooses arbitrary price ID

**Risk:** A user purchases a cheaper or unintended product.

**Solution:** Frontend sends an internal plan name; backend maps it to a fixed price ID.

---

## Failure: wallet top-up amount comes from metadata

**Risk:** Wrong wallet credit is applied.

**Solution:** Use Stripe's trusted `amount_total`, not a metadata amount.

---

## Failure: concurrent calls overspend wallet

**Risk:** Several simultaneous calls read the same available balance.

**Solution:** Reserve call capacity atomically before approving each call.

---

## Failure: one remaining base minute allows a 30-minute call

**Risk:** The call pushes the wallet far beyond the courtesy limit.

**Solution:** Calculate `maxDurationSeconds` using base minutes plus safe wallet capacity.

---

## Failure: first checkout double-initializes subscription

**Risk:** Related Stripe events overwrite or reset state incorrectly.

**Solution:** Assign clear responsibilities to each Stripe event and track processed invoice IDs.

---

## Failure: positive wallet balance is erased at renewal

**Risk:** Customer loses prepaid funds.

**Solution:** Preserve positive wallet balances; only forgive negative balances according to policy.

---

## Failure: database update succeeds but audit insert fails

**Risk:** Current balance changes without transaction history.

**Solution:** Use a MongoDB transaction for state and ledger changes.

---

## Failure: reservation never settles

**Risk:** Available minutes remain locked forever.

**Solution:** Add expiration timestamps and a cleanup/reconciliation job.

---

## Failure: safe duration is under one minute

**Risk:** A new concurrent call starts even though the remaining unreserved capacity cannot fund a useful call.

**Solution:** If `safeSeconds < MINIMUM_FUNDED_CALL_SECONDS`, return voicemail immediately and do not modify the active call's reservation.

---

## Failure: active call counter becomes negative

**Risk:** Duplicate reports or missing reservation setup cause counter drift and incorrect concurrency decisions.

**Solution:** Release only an existing active reservation, clamp the cached counter atomically to zero, and periodically reconcile it from `call_reservations`.

---

## Failure: local MongoDB cannot run transactions

**Risk:** `startSession()` or `withTransaction()` fails at runtime in development or staging.

**Solution:** Run local MongoDB as a single-node replica set and fail clearly if the deployment does not support required transactions.

---

## Failure: cross-tenant data exposure

**Risk:** One customer accesses another customer's financial data.

**Solution:** Scope every tenant query by `orgId` and enforce server-side authorization.

---

# 26. Required Tests

## Stripe webhook tests

- Reject missing signature.
- Reject invalid signature.
- Process valid event once.
- Ignore duplicate event.
- Ignore unsupported event safely.
- Do not expose internal errors to Stripe.

## Wallet top-up tests

- Credit exact `amount_total / 100`.
- Do not use metadata amount.
- Reject unpaid session.
- Do not apply duplicate top-up.
- Create wallet ledger record.

## Subscription tests

- First checkout does not double-initialize.
- `invoice.paid` resets base usage once.
- Positive wallet carries over.
- Negative wallet is forgiven according to policy.
- Cancellation enables fallback mode.

## Call billing tests

- Base-only call.
- Wallet-only call.
- Mixed base and wallet call.
- Call at overdraft boundary.
- Call when no capacity remains.
- Duplicate call webhook.
- Simultaneous calls.
- Second concurrent call with less than 60 safe seconds receives voicemail.
- Failed atomic reservation receives voicemail.
- End-of-call report without an active reservation does not decrement the counter.
- Duplicate reservation release is harmless.
- `activeCallsCount` never becomes negative.
- Reservation expiration.
- Counter reconciliation repairs drift.

## Tenant-security tests

- User cannot read another organization's subscription.
- User cannot create a portal for another Stripe customer.
- User cannot alter another organization's wallet.
- Admin action requires admin role.

---

# 27. Production Monitoring

Create alerts for:

- Invalid Stripe webhook signature
- Repeated webhook failures
- Stripe event stuck in `processing`
- Duplicate event spike
- Wallet below zero
- Wallet at or below `-$15`
- Reservation expired
- End-of-call report without active reservation
- Active-call counter mismatch
- Subscription marked `past_due`
- Vapi call missing final report
- Wallet transaction balance mismatch
- Subscription balance and transaction ledger mismatch

Run a periodic reconciliation job that compares:

```text
Current subscription wallet balance
versus
Sum of wallet transaction amounts
```

### Automated Reconciliation Query Implementation

To detect balance inconsistencies programmatically, implement a background worker with this aggregation logic:

```ts
import { MongoClient, ObjectId } from "mongodb";

export async function runWalletReconciliation(client: MongoClient) {
  const db = client.db();

  // Sum transaction amounts grouped by organization
  const transactionSums = await db.collection("wallet_transactions").aggregate([
    {
      $group: {
        _id: "$orgId",
        totalBalanceCalculated: { $sum: "$amountUSD" }
      }
    }
  ]).toArray();

  const discrepancies: Array<{
    orgId: ObjectId;
    cachedBalance: number;
    calculatedBalance: number;
    difference: number;
  }> = [];

  for (const record of transactionSums) {
    const orgId = record._id;
    const calculatedBalance = record.totalBalanceCalculated;

    const subscription = await db.collection("subscriptions").findOne({ orgId });
    if (!subscription) {
      discrepancies.push({
        orgId,
        cachedBalance: 0,
        calculatedBalance,
        difference: calculatedBalance
      });
      continue;
    }

    const cachedBalance = subscription.walletBalanceUSD;
    const difference = Math.abs(cachedBalance - calculatedBalance);

    // Filter out minor floating point representation drift (tolerance < 0.0001 USD)
    if (difference > 0.0001) {
      discrepancies.push({
        orgId,
        cachedBalance,
        calculatedBalance,
        difference: cachedBalance - calculatedBalance
      });

      // Write warning into the system billing logs
      await db.collection("billing_events").insertOne({
        orgId,
        source: "system",
        eventType: "reconciliation_mismatch_detected",
        severity: "critical",
        message: `Wallet balance mismatch: subscription has $${cachedBalance.toFixed(4)}, transactions sum is $${calculatedBalance.toFixed(4)}.`,
        metadata: { cachedBalance, calculatedBalance, difference: cachedBalance - calculatedBalance },
        createdAt: new Date()
      });
    }
  }

  return discrepancies;
}
```

Any mismatch should create a critical alert.

---

# 28. Non-Negotiable Engineering Rules

1. Never store raw card details.
2. Never expose Stripe secret keys to the browser.
3. Never trust the frontend for financial state.
4. Never trust metadata as the source of a paid amount.
5. Always verify Stripe webhook signatures.
6. Always verify Vapi webhook authentication.
7. Always make Stripe and Vapi event processing idempotent.
8. Always scope tenant data by `orgId`.
9. Always use atomic updates for balances and counters.
10. Prefer MongoDB transactions for multi-document financial changes.
11. Record every wallet change in an immutable ledger.
12. Reserve capacity for concurrent calls.
13. Calculate safe call duration before approving a call.
14. Preserve positive prepaid balances at renewal.
15. Do not delete financial history; create compensating transactions.
16. Audit every manual admin adjustment.
17. Log event IDs and outcomes, not payment secrets.
18. Add automated reconciliation and alerts before scaling.
19. Return voicemail when safe funded capacity is below 60 seconds.
20. Treat `call_reservations` as the source of truth for concurrent capacity.
21. Never decrement `activeCallsCount` without successfully releasing an active reservation.
22. Clamp cached counters atomically and reconcile them periodically.
23. Require a replica-set or sharded MongoDB deployment for transaction-based billing.

---

# 29. AI Coding Agent Prompt

Use the following prompt when handing payment work to Antigravity AI, Claude Code, Cursor, or another coding agent.

```text
You are a senior backend and payments engineer working on Voxora, a multi-tenant AI receptionist SaaS.

Read VOXORA_PAYMENT_SECURITY_AND_SAAS_DATABASE.md completely before changing any billing, Stripe, Vapi, subscription, wallet, call, or database code.

Technology stack:
- Next.js App Router
- TypeScript strict mode
- MongoDB Atlas
- Stripe Checkout and Stripe Billing
- Vapi webhooks

Non-negotiable architecture rules:
- Card data must never touch Voxora servers.
- Stripe-hosted Checkout and Customer Portal must be used.
- Stripe webhook signatures must be verified using the raw request body.
- Stripe events must be idempotent using a unique event ID index.
- Vapi call reports must be idempotent using a unique callId index.
- Every tenant-owned query must include orgId.
- The frontend must never activate subscriptions or modify wallet balances.
- Wallet top-ups must use Stripe amount_total, not metadata amounts.
- All wallet changes must create immutable wallet transaction records.
- Atomic database updates or MongoDB transactions must be used for financial operations.
- Concurrent calls must reserve available base minutes and wallet capacity atomically.
- maxDurationSeconds must include both available base minutes and wallet/overdraft capacity.
- If safeSeconds is below 60, immediately return voicemail and do not disturb existing reservations.
- call_reservations is the source of truth; activeCallsCount is only a cached metric.
- Reservation release must be idempotent and keyed by callId.
- Never decrement activeCallsCount unless an active reservation was successfully released.
- Clamp activeCallsCount atomically so it can never become negative.
- MongoDB transactions require a replica set or sharded cluster; local development must use a single-node replica set.
- Positive prepaid wallet balances must survive subscription renewal.
- Negative wallet balances may be forgiven only according to the documented renewal policy.
- Manual financial adjustments must be admin-only and fully audited.

Before writing code:
1. Explain which collections and routes will change.
2. Identify all idempotency keys.
3. Identify all unique indexes required.
4. Identify all tenant-isolation checks.
5. Explain how race conditions are prevented.
6. Explain how partial database failures are handled.
7. List the tests that will prove the implementation is safe.
8. Explain what happens when safe funded capacity is below 60 seconds.
9. Explain how reservation release remains idempotent when reports are missing or duplicated.
10. Confirm the MongoDB environment supports multi-document transactions.

Do not simplify or remove financial safeguards to reduce code size.
Do not use placeholder billing logic in production paths.
Do not silently swallow webhook or transaction errors.
```

---

# 30. Implementation Completion Checklist

Before enabling real payments, verify:

- [ ] Stripe test and production keys are separated.
- [ ] Stripe webhook signature verification is implemented.
- [ ] Vapi webhook authentication is implemented.
- [ ] `stripe_events.eventId` has a unique index.
- [ ] `calls.callId` has a unique index.
- [ ] `wallet_transactions.idempotencyKey` has a unique index.
- [ ] All tenant records contain `orgId`.
- [ ] Every tenant API checks authorization.
- [ ] Checkout uses backend-controlled price IDs.
- [ ] Wallet top-ups use `session.amount_total`.
- [ ] First subscription checkout cannot double-initialize.
- [ ] Invoice resets are idempotent by invoice ID.
- [ ] Positive wallet balance carries over.
- [ ] Negative wallet reset follows policy.
- [ ] Concurrent call reservations are implemented atomically.
- [ ] Safe call-duration calculation is implemented.
- [ ] Calls with less than 60 safe seconds route immediately to voicemail.
- [ ] Failed reservation attempts route immediately to voicemail.
- [ ] Reservation release is idempotent by callId.
- [ ] End-of-call reports without active reservations do not decrement counters.
- [ ] `activeCallsCount` is atomically clamped to zero.
- [ ] Cached active-call counts reconcile from `call_reservations`.
- [ ] Reservations expire and reconcile.
- [ ] Development, staging, and production MongoDB deployments support transactions.
- [ ] Local MongoDB runs as a single-node replica set when transactions are tested.
- [ ] Wallet changes create ledger records.
- [ ] Multi-document financial updates use transactions where available.
- [ ] Admin adjustments are audited.
- [ ] Payment failures and disputes create alerts.
- [ ] Financial reconciliation job exists.
- [ ] Billing and tenant-security tests pass.

---

# Final Architecture Summary

```text
Browser
   ↓
Authenticated Voxora backend
   ↓
Stripe Checkout / Customer Portal
   ↓
Signed Stripe webhook
   ↓
Webhook idempotency gate
   ↓
Subscription state update
   ↓
Immutable wallet and billing ledgers
```

```text
Incoming call
   ↓
Authenticated Vapi assistant request
   ↓
Tenant subscription lookup
   ↓
Calculate safe funded capacity
   ↓
Below 60 seconds? → voicemail fallback
   ↓
Atomic call-capacity reservation
   ↓
Safe maxDurationSeconds
   ↓
Call completion webhook
   ↓
Call idempotency gate
   ↓
Actual billing settlement
   ↓
Reservation release
   ↓
Call, wallet, and billing audit records
```

This structure keeps payment credentials outside Voxora, prevents duplicate financial operations, protects against concurrent-call overspending, provides complete auditability, and maintains strict isolation between SaaS customers.
