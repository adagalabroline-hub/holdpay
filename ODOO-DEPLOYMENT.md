# HoldPay on Odoo

## Recommendation

Use **Odoo.sh** or a self-hosted Odoo deployment for HoldPay. The custom addon in `holdpay_odoo/` targets Odoo **18.0** and integrates with Odoo Website, Portal, and the standard `auth_signup` flow. Odoo's documentation states that Odoo Online is incompatible with custom modules; use Odoo Online only if you are willing to rebuild this as standard website-builder pages without this Python addon.

Official references:

- [Odoo.sh](https://www.odoo.com/documentation/18.0/administration/odoo_sh.html)
- [Odoo Online](https://www.odoo.com/documentation/18.0/administration/odoo_online.html)

## What the addon does

- Provides `/holdpay` as a QWeb website landing page using the Odoo website layout.
- Uses Odoo's native account registration and login pages.
- Lets a logged-in account choose buyer, seller, or pickup-agent role.
- Stores role, KYC status, and seller/agent business-verification status on the Odoo contact record. These fields are restricted to Odoo system administrators; website and API onboarding set only the logged-in user's role and pending state.
- Sends incomplete profiles to an app-KYC pending page. Only an Odoo administrator can change the status from the backend partner form.
- Provides Odoo models and authenticated JSON-RPC routes for listings, deals, pickup milestones, mediation cases, and post-completion reviews.
- Restricts portal model access to reads; controlled API routes validate the caller and business state before creating or updating records.
- Does not collect KYC documents, process payments, or provide a provider-backed checkout/settlement integration.

Website role enrollment is not KYC verification. A production phone app must submit an authenticated verification result to a secure backend before any account is marked verified. The website must not trust a client-side flag.

## Proposal: HoldPay for Odoo merchants and marketplace sellers

HoldPay could also be proposed to Odoo as an optional vendor-commerce extension: an installable integration for Odoo eCommerce merchants and, where a separate marketplace-vendor module is installed, its participating sellers. In Odoo, “vendor” can mean a purchasing supplier, so the proposal should explicitly say **eCommerce seller / marketplace seller**, not imply that every supplier record is a marketplace shop.

Odoo eCommerce already provides website product pages, product management, and customer-facing product ratings. The proposed extension would build on those existing workflows rather than duplicate them:

- Let a participating seller opt eligible products into a “HoldPay delivery assurance” flow.
- Carry the selected pickup point and the seller/buyer agreement into the Odoo sales order.
- Add clear order milestones for seller handover, agent receipt, buyer collection, and buyer confirmation.
- Offer participating sellers a dashboard view of eligible orders and handover status.
- Provide an auditable way to record a delivery concern and route it to the merchant’s agreed support process.
- Keep standard Odoo checkout available unless a separately approved payment integration is configured.

### Suggested product positioning

> **HoldPay for Odoo** is a proposed extension that helps Odoo eCommerce merchants offer a more transparent local delivery journey—connecting order details, participating pickup points, and confirmation milestones in one customer experience. Payment collection and settlement remain with an appropriately approved provider and are not represented as escrow by default.

### A sensible first release

Start with the narrower **single-merchant Odoo eCommerce integration**: product eligibility, a selected pickup point, order milestones, buyer confirmation, and a concern-reporting workflow. Consider multi-vendor marketplace support only after choosing a specific Odoo marketplace-vendor module and defining its seller permissions, order ownership, refunds, and support responsibilities.

Before proposing a payment feature, jointly establish who accepts and safeguards funds, what regulatory model applies, how settlement/refunds work, and which party owns complaints. Avoid saying “escrow” in an Odoo listing or payment flow until the service structure has been reviewed and approved.

### Draft outreach to Odoo

**Subject: Concept proposal — HoldPay local delivery-assurance extension for Odoo eCommerce**

> Hello Odoo team,  
>  
> I am developing HoldPay, a concept for helping Kenyan buyers and eCommerce sellers coordinate local pickup and delivery with clearer order milestones. I would like to explore whether this could be useful as an optional Odoo eCommerce extension for merchants—and potentially for marketplace sellers through a compatible vendor module.  
>  
> A first version could connect eligible product orders to participating pickup points, record handover and collection milestones, and provide a clear path for customers to raise delivery concerns. The initial proposal would not process or hold money; any payment or settlement integration would be designed separately with an appropriately approved provider.  
>  
> Would Odoo be open to an introductory product/technical discussion about the use case, suitable integration points, and the requirements for an Odoo Apps listing?  
>  
> Regards,  
> HoldPay

Odoo's published [eCommerce product documentation](https://www.odoo.com/documentation/18.0/applications/websites/ecommerce/products.html) describes product-page management and customer ratings; this proposal is an optional concept, not an existing Odoo capability, approved integration, or partnership.

## Install

1. Add `holdpay_odoo/` to the custom-addons path of an Odoo 18.0 Odoo.sh project or self-hosted server.
2. Restart/update the Odoo service and refresh the Apps list.
3. Install **HoldPay Website**.
4. Add a website menu item linking to `/holdpay`, or configure `/holdpay` as the website homepage.
5. Enable Odoo's built-in signup only after configuring email delivery, signup policy, spam protection, and account security.
6. Test with a staging database and non-production email settings before launch.

## Product decisions before production

- Do not enable Odoo eCommerce checkout as an escrow flow. Odoo checkout/payment providers normally collect funds under their configured payment/settlement model; escrow custody and release need a separately approved operating and legal model.
- Integrate the mobile app's KYC service server-to-server with authentication, signed/verified callbacks, audit logging, least privilege, and an explicit approval state transition.
- Decide whether sellers and agents are individuals, registered businesses, or both; define document requirements and verification ownership in the app.
- Add server-enforced access rules for catalogue publication, checkout, agent assignment, reviews, and order transitions once those Odoo modules are implemented.
- Configure privacy notices, retention/deletion schedules, backups, access control, incident response, and Kenya-specific legal/regulatory review.

The addon now provides a backend prototype, but it is not a production marketplace or escrow system. Payment methods are recorded as preferences only; new orders remain `not_configured` until a real provider integration is built. The API details and example requests are in [BACKEND-API.md](./BACKEND-API.md).

## Android and iOS starter

The Flutter source in `holdpay_mobile/` is the shared Android/iOS app starter. See [holdpay_mobile/README.md](./holdpay_mobile/README.md) for generating the native Android and iOS runners and running the app. The starter demonstrates role signup and app-only KYC screens but does not upload identity documents, verify users, or connect to Odoo. The addon now has authenticated mobile API routes, but the Flutter and browser clients are not wired to them; verification-provider integration is also required before production.
