# HoldPay Odoo backend API

The Odoo 18 addon in `holdpay_odoo/` is the initial backend foundation for the
website and Flutter clients. Odoo owns account roles, verification state,
listings, orders, pickup milestones, mediation cases, and reviews. The API uses
Odoo's authenticated user session; it does not issue a separate HoldPay token.

This is a prototype backend, not a production payment or escrow service. Do not
record a payment as confirmed until an approved provider integration and its
server-verified confirmation are in place.

## Install and configure

1. Install the addon on an Odoo 18 staging database and update the Apps list.
2. Test with HTTPS, configured database selection, mail, backups, and least
   privilege admin accounts.
3. Use Odoo's signup and login flow. A mobile client authenticates through
   `/web/session/authenticate` and sends the returned session cookie on API
   requests. Keep the cookie in platform-secure storage; never put database
   passwords or Odoo admin credentials in the app.
4. API routes are JSON-RPC endpoints. Send a POST with
   `{"jsonrpc":"2.0","method":"call","params":{...},"id":1}` and include the
   JSON-RPC session cookie. The route argument values go inside `params`.
5. Only an authorized Odoo administrator can approve KYC and seller/agent
   business verification. Verification documents are not accepted by the
   website or these API routes.

Example authentication request:

```json
{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "db": "your-staging-database",
    "login": "account@example.com",
    "password": "provided-out-of-band"
  },
  "id": 1
}
```

POST that body to `/web/session/authenticate`, then call the API using the
session cookie from the response. Never commit real credentials or session
cookies.

## API routes

All routes below require an authenticated Odoo user and use POST. API responses
use `{"ok":true,"data":...}` on success, or
`{"ok":false,"error":{"code":"...","message":"..."}}` for expected validation
and permission failures.

| Route | Purpose |
| --- | --- |
| `/holdpay/api/v1/me` | Return the current user's role, KYC and business verification states, and activation status. |
| `/holdpay/api/v1/account/role` | Set an account role once; agent signup also requires an operating area. |
| `/holdpay/api/v1/listings` | List published listings, create/update a seller's listings, or list reviews with `action: "reviews"` and `listing_id`. |
| `/holdpay/api/v1/agents` | List verified pickup agents, optionally filtered by `operating_area`. |
| `/holdpay/api/v1/deals` | List deals visible to the current participant, or create a buyer order with `action: "create"`. |
| `/holdpay/api/v1/deals/<deal_id>/milestones` | Advance a handover/collection using the `action` parameter. |
| `/holdpay/api/v1/deals/<deal_id>/cases` | Open a delivery concern with `description`. |
| `/holdpay/api/v1/cases` | List cases where the user is the reporter, buyer, or assigned agent. |
| `/holdpay/api/v1/cases/<case_id>/resolve` | Resolve a case assigned to the verified pickup agent with `resolution_note`. |
| `/holdpay/api/v1/deals/<deal_id>/reviews` | Submit a 1–5 buyer rating and optional `comment` after completion. |

### Common request parameters

Role selection:

```json
{"role":"buyer"}
```

Agent role selection:

```json
{"role":"agent","operating_area":"Nakuru"}
```

Create a draft listing (sellers can publish it by using `"state":"published"`):

```json
{
  "action":"create",
  "name":"Handmade basket",
  "description":"Woven locally",
  "price":2500,
  "state":"draft"
}
```

Create an order:

```json
{
  "action":"create",
  "listing_id":12,
  "agent_id":34,
  "payment_method":"mpesa_paybill",
  "buyer_note":"Please contact me when it arrives."
}
```

An order must have an assigned, verified pickup agent. Use `/holdpay/api/v1/agents`
to discover eligible pickup points first.

Supported payment method identifiers are `mpesa_till`, `mpesa_pochi`,
`mpesa_paybill`, and `globalpay`. They identify the buyer's intended method
only. In this backend all new orders have `payment_status: "not_configured"`;
no checkout, collection, settlement, refund, or custody operation is performed.
The seller cannot begin handover until payment is later confirmed by an approved
provider integration. Do not mark payment confirmed manually in production.

Milestone `action` values, in order:

1. `seller_handover` — seller, only after provider payment confirmation.
2. `agent_received` — assigned verified pickup agent.
3. `buyer_collected` — assigned verified pickup agent.
4. `buyer_confirm` — verified buyer; completes the deal.

Only a buyer or seller can open a concern. The assigned verified agent may
record a resolution; the deal returns to its pre-dispute milestone and still
requires the buyer's collection confirmation to complete.

## Authorization and verification

- Account role, KYC state, and business verification are read from the
  server-side contact, never accepted as verified values from a client.
- Buyer activity requires approved identity/age KYC. Sellers and pickup agents
  also require approved business verification.
- API routes use explicit ownership/participation checks. Portal users have
  read-only model ACLs; controlled API operations use server-side validation
  before writing.
- Listing visibility is limited to published listings, plus the current
  seller's own listings.
- Orders are limited to their buyer, seller, and assigned agent. Case details
  are limited to the reporter and the assigned agent/participants.
- Reviews can only be submitted once per completed order by its buyer.
- Model identifiers are database-local integer IDs. Treat them as opaque.

## Not implemented

This addon does not include KYC vendor callbacks, document storage, email/SMS
verification, payment provider credentials/webhooks, automatic settlement,
refunds, pickup-network integrations, native push notifications, rate limiting,
or production monitoring. These need security, privacy, provider, and operating
model decisions before launch. The browser marketplace and Flutter app have
not yet been wired to these API routes.
