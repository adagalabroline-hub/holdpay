import math

from odoo import http
from odoo.http import request


class HoldPayWebsite(http.Controller):
    @http.route("/holdpay", type="http", auth="public", website=True, sitemap=True)
    def home(self, **kwargs):
        return request.render("holdpay_odoo.holdpay_home", {})

    @http.route(
        "/my/holdpay",
        type="http",
        auth="user",
        website=True,
        methods=["GET"],
        sitemap=False,
    )
    def account(self, **kwargs):
        partner = request.env.user.partner_id.sudo()
        if not partner.holdpay_role:
            return request.redirect("/my/holdpay/role")
        if not self._is_active(partner):
            return request.render(
                "holdpay_odoo.holdpay_kyc_pending",
                {"partner": partner},
            )
        return request.render("holdpay_odoo.holdpay_account_ready", {"partner": partner})

    @http.route(
        "/my/holdpay/role",
        type="http",
        auth="user",
        website=True,
        methods=["GET", "POST"],
        sitemap=False,
    )
    def choose_role(self, **post):
        partner = request.env.user.partner_id.sudo()
        if request.httprequest.method == "POST":
            role = post.get("holdpay_role")
            area = (post.get("holdpay_agent_area") or "").strip()[:80]
            if role not in ("buyer", "seller", "agent"):
                return request.render(
                    "holdpay_odoo.holdpay_role_form",
                    {"error": "Choose a valid account type.", "selected_role": False},
                )
            if partner.holdpay_role and partner.holdpay_role != role:
                return request.render(
                    "holdpay_odoo.holdpay_role_form",
                    {
                        "error": "Contact support to change your account type.",
                        "selected_role": partner.holdpay_role,
                    },
                )
            if role == "agent" and not area and not partner.holdpay_agent_area:
                return request.render(
                    "holdpay_odoo.holdpay_role_form",
                    {
                        "error": "Pickup agents must enter their operating area.",
                        "selected_role": role,
                    },
                )
            values = {
                "holdpay_role": role,
                "holdpay_agent_area": area or partner.holdpay_agent_area,
                "holdpay_kyc_status": partner.holdpay_kyc_status
                if partner.holdpay_kyc_status == "verified"
                else "pending_mobile_app",
            }
            if role in ("seller", "agent"):
                values["holdpay_business_status"] = (
                    partner.holdpay_business_status
                    if partner.holdpay_business_status == "verified"
                    else "pending_mobile_app"
                )
            else:
                values["holdpay_business_status"] = "not_required"
            partner.write(values)
            return request.redirect("/my/holdpay")
        if partner.holdpay_role and self._is_active(partner):
            return request.redirect("/my/holdpay")
        return request.render(
            "holdpay_odoo.holdpay_role_form",
            {"error": False, "selected_role": partner.holdpay_role or ""},
        )

    @staticmethod
    def _api_error(code, message):
        return {"ok": False, "error": {"code": code, "message": message}}

    @staticmethod
    def _active_partner():
        return request.env.user.partner_id.sudo()

    @staticmethod
    def _is_active(partner):
        if partner.holdpay_kyc_status != "verified":
            return False
        if partner.holdpay_role in ("seller", "agent"):
            return partner.holdpay_business_status == "verified"
        return partner.holdpay_role == "buyer"

    @staticmethod
    def _positive_id(value):
        if isinstance(value, bool):
            return None
        if isinstance(value, int) and value > 0:
            return value
        if (
            isinstance(value, str)
            and len(value) <= 19
            and value.isdecimal()
            and int(value) > 0
        ):
            return int(value)
        return None

    @staticmethod
    def _clean_text(value, max_length):
        if value is None:
            return ""
        if not isinstance(value, str):
            return None
        return value.strip()[:max_length]

    @http.route(
        "/holdpay/api/v1/me",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def api_me(self):
        partner = self._active_partner()
        return {
            "ok": True,
            "data": {
                "id": partner.id,
                "name": partner.name,
                "email": partner.email,
                "role": partner.holdpay_role,
                "kyc_status": partner.holdpay_kyc_status,
                "business_status": partner.holdpay_business_status,
                "active": self._is_active(partner),
            },
        }

    @http.route(
        "/holdpay/api/v1/account/role",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def api_set_role(self, role=None, operating_area=None):
        partner = self._active_partner()
        if role not in ("buyer", "seller", "agent"):
            return self._api_error("invalid_role", "Choose buyer, seller, or agent.")
        if partner.holdpay_role and partner.holdpay_role != role:
            return self._api_error(
                "role_change_not_allowed",
                "Contact support to change an existing account type.",
            )
        area = self._clean_text(operating_area, 80)
        if area is None:
            return self._api_error(
                "invalid_operating_area", "Operating area must be text."
            )
        if role == "agent" and not area and not partner.holdpay_agent_area:
            return self._api_error(
                "operating_area_required",
                "Pickup agents must provide their operating area.",
            )
        values = {
            "holdpay_role": role,
            "holdpay_agent_area": area or partner.holdpay_agent_area,
            "holdpay_kyc_status": partner.holdpay_kyc_status
            if partner.holdpay_kyc_status == "verified"
            else "pending_mobile_app",
            "holdpay_business_status": (
                partner.holdpay_business_status
                if partner.holdpay_business_status == "verified"
                else "pending_mobile_app"
            )
            if role in ("seller", "agent")
            else "not_required",
        }
        partner.write(values)
        return self.api_me()

    @http.route(
        "/holdpay/api/v1/listings",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def api_listings(self, action="list", listing_id=None, **values):
        partner = self._active_partner()
        Listing = request.env["holdpay.listing"].sudo()
        if action == "list":
            if not self._is_active(partner):
                return self._api_error(
                    "account_pending",
                    "Complete app verification before using the marketplace.",
                )
            domain = [("state", "=", "published"), ("active", "=", True)]
            if partner.holdpay_role == "seller":
                domain = [
                    "|",
                    ("seller_id", "=", partner.id),
                    "&",
                    ("state", "=", "published"),
                    ("active", "=", True),
                ]
            listings = Listing.search(domain, order="create_date desc", limit=100)
            return {"ok": True, "data": [self._listing_data(item) for item in listings]}
        if action == "create":
            if not self._is_active(partner) or partner.holdpay_role != "seller":
                return self._api_error(
                    "seller_verification_required",
                    "A verified seller account is required to create listings.",
                )
            name = self._clean_text(values.get("name"), 160)
            description = self._clean_text(values.get("description"), 5000)
            if name is None or description is None:
                return self._api_error(
                    "invalid_listing", "Listing name and description must be text."
                )
            try:
                if isinstance(values.get("price"), bool):
                    raise ValueError
                price = float(values.get("price"))
            except (TypeError, ValueError):
                return self._api_error("invalid_price", "Enter a valid listing price.")
            if not name or not math.isfinite(price) or price <= 0:
                return self._api_error(
                    "invalid_listing", "A listing name and positive price are required."
                )
            state = values.get("state", "draft")
            if state not in ("draft", "published"):
                return self._api_error(
                    "invalid_listing_state", "Listings must be draft or published."
                )
            listing = Listing.create(
                {
                    "name": name[:160],
                    "description": description,
                    "price": price,
                    "seller_id": partner.id,
                    "state": state,
                }
            )
            return {"ok": True, "data": self._listing_data(listing)}
        if action == "update":
            listing_id = self._positive_id(listing_id)
            if not listing_id:
                return self._api_error("listing_id_required", "A listing ID is required.")
            listing = Listing.browse(listing_id).exists()
            if not listing or listing.seller_id.id != partner.id:
                return self._api_error("listing_not_found", "Listing not found.")
            if not self._is_active(partner) or partner.holdpay_role != "seller":
                return self._api_error(
                    "seller_verification_required",
                    "A verified seller account is required to update listings.",
                )
            updates = {}
            if "name" in values:
                name = self._clean_text(values.get("name"), 160)
                if name is None or not name:
                    return self._api_error("invalid_name", "Listing name is required.")
                updates["name"] = name[:160]
            if "description" in values:
                description = self._clean_text(values.get("description"), 5000)
                if description is None:
                    return self._api_error(
                        "invalid_description", "Listing description must be text."
                    )
                updates["description"] = description
            if "price" in values:
                try:
                    if isinstance(values["price"], bool):
                        raise ValueError
                    price = float(values["price"])
                except (TypeError, ValueError):
                    return self._api_error(
                        "invalid_price", "Enter a valid listing price."
                    )
                if not math.isfinite(price) or price <= 0:
                    return self._api_error(
                        "invalid_price", "Listing price must be greater than zero."
                    )
                updates["price"] = price
            if "state" in values:
                if values["state"] not in ("draft", "published", "archived"):
                    return self._api_error(
                        "invalid_listing_state", "Choose a valid listing status."
                    )
                updates["state"] = values["state"]
            listing.write(updates)
            return {"ok": True, "data": self._listing_data(listing)}
        if action == "reviews":
            if not self._is_active(partner):
                return self._api_error(
                    "account_pending",
                    "Complete app verification before using the marketplace.",
                )
            listing_id = self._positive_id(listing_id)
            if not listing_id:
                return self._api_error(
                    "invalid_listing", "A valid listing ID is required."
                )
            listing = Listing.browse(listing_id).exists()
            if not listing or listing.state != "published" or not listing.active:
                return self._api_error("listing_unavailable", "This listing is unavailable.")
            reviews = request.env["holdpay.review"].sudo().search(
                [("listing_id", "=", listing.id)], order="create_date desc", limit=100
            )
            return {
                "ok": True,
                "data": [self._review_data(review) for review in reviews],
            }
        return self._api_error("invalid_action", "Choose list, create, or update.")

    @http.route(
        "/holdpay/api/v1/agents",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def api_agents(self, operating_area=None):
        partner = self._active_partner()
        if not self._is_active(partner):
            return self._api_error(
                "account_pending", "Complete app verification before choosing an agent."
            )
        domain = [
            ("holdpay_role", "=", "agent"),
            ("holdpay_kyc_status", "=", "verified"),
            ("holdpay_business_status", "=", "verified"),
            ("active", "=", True),
        ]
        area = self._clean_text(operating_area, 80)
        if area is None:
            return self._api_error(
                "invalid_operating_area", "Operating area must be text."
            )
        if area:
            domain.append(("holdpay_agent_area", "ilike", area[:80]))
        agents = request.env["res.partner"].sudo().search(
            domain, order="name", limit=100
        )
        return {
            "ok": True,
            "data": [
                {
                    "id": agent.id,
                    "name": agent.name,
                    "operating_area": agent.holdpay_agent_area,
                }
                for agent in agents
            ],
        }

    @http.route(
        "/holdpay/api/v1/deals",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def api_deals(self, action="list", **values):
        partner = self._active_partner()
        Deal = request.env["holdpay.deal"].sudo()
        if action == "list":
            deals = Deal.search(
                [
                    "|",
                    "|",
                    ("buyer_id", "=", partner.id),
                    ("seller_id", "=", partner.id),
                    ("agent_id", "=", partner.id),
                ],
                order="create_date desc",
                limit=100,
            )
            return {"ok": True, "data": [self._deal_data(item) for item in deals]}
        if action != "create":
            return self._api_error("invalid_action", "Choose list or create.")
        if not self._is_active(partner) or partner.holdpay_role != "buyer":
            return self._api_error(
                "buyer_verification_required",
                "A verified buyer account is required to start a deal.",
            )
        listing_id = self._positive_id(values.get("listing_id"))
        if not listing_id:
            return self._api_error("invalid_listing", "A valid listing ID is required.")
        listing = request.env["holdpay.listing"].sudo().browse(listing_id).exists()
        if not listing or listing.state != "published" or not listing.active:
            return self._api_error("listing_unavailable", "This listing is unavailable.")
        if listing.seller_id == partner:
            return self._api_error("self_purchase", "You cannot buy your own listing.")
        if not self._is_active(listing.seller_id):
            return self._api_error(
                "seller_verification_required",
                "This seller is not currently verified.",
            )
        method = values.get("payment_method", "mpesa_paybill")
        allowed_methods = ("mpesa_till", "mpesa_pochi", "mpesa_paybill", "globalpay")
        if method not in allowed_methods:
            return self._api_error("invalid_payment_method", "Choose a supported method.")
        buyer_note = self._clean_text(values.get("buyer_note"), 2000)
        if buyer_note is None:
            return self._api_error("invalid_buyer_note", "Buyer note must be text.")
        agent_id = self._positive_id(values.get("agent_id"))
        if not agent_id:
            return self._api_error(
                "agent_required", "Choose a verified pickup agent for this order."
            )
        agent = request.env["res.partner"].sudo().browse(agent_id).exists()
        if not agent or agent.holdpay_role != "agent" or not self._is_active(agent):
            return self._api_error(
                "agent_unavailable", "This pickup agent is unavailable."
            )
        deal = Deal.create(
            {
                "listing_id": listing.id,
                "buyer_id": partner.id,
                "seller_id": listing.seller_id.id,
                "agent_id": agent.id,
                "amount": listing.price,
                "currency_id": listing.currency_id.id,
                "payment_method": method,
                "payment_status": "not_configured",
                "buyer_note": buyer_note,
            }
        )
        return {
            "ok": True,
            "data": self._deal_data(deal),
            "notice": "Payment is not enabled; no funds were requested or transferred.",
        }

    @http.route(
        "/holdpay/api/v1/deals/<int:deal_id>/milestones",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def api_deal_milestone(self, deal_id, action=None):
        partner = self._active_partner()
        deal = request.env["holdpay.deal"].sudo().browse(deal_id).exists()
        if not deal or partner not in (deal.buyer_id, deal.seller_id, deal.agent_id):
            return self._api_error("deal_not_found", "Deal not found.")
        if action == "seller_handover":
            if partner != deal.seller_id or deal.state != "awaiting_payment":
                return self._api_error(
                    "invalid_transition", "Only the seller can start a paid handover."
                )
            if deal.payment_status != "confirmed":
                return self._api_error(
                    "payment_not_confirmed",
                    "The configured payment provider has not confirmed payment.",
                )
            deal.write({"state": "seller_handover"})
        elif action == "agent_received":
            if (
                partner != deal.agent_id
                or deal.state != "seller_handover"
                or not self._is_active(partner)
            ):
                return self._api_error(
                    "invalid_transition", "Only the assigned agent can confirm receipt."
                )
            deal.write({"state": "agent_received"})
        elif action == "buyer_collected":
            if (
                partner != deal.agent_id
                or deal.state != "agent_received"
                or not self._is_active(partner)
            ):
                return self._api_error(
                    "invalid_transition",
                    "Only the assigned agent can record buyer collection.",
                )
            deal.write({"state": "buyer_collected"})
        elif action == "buyer_confirm":
            if (
                partner != deal.buyer_id
                or deal.state != "buyer_collected"
                or not self._is_active(partner)
            ):
                return self._api_error(
                    "invalid_transition",
                    "Only the buyer can confirm a collected order.",
                )
            deal.write({"state": "completed"})
        else:
            return self._api_error("invalid_action", "Choose a valid deal milestone.")
        return {"ok": True, "data": self._deal_data(deal)}

    @http.route(
        "/holdpay/api/v1/deals/<int:deal_id>/cases",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def api_create_case(self, deal_id, description=None):
        partner = self._active_partner()
        deal = request.env["holdpay.deal"].sudo().browse(deal_id).exists()
        if not deal or partner not in (deal.buyer_id, deal.seller_id):
            return self._api_error("deal_not_found", "Deal not found.")
        if not self._is_active(partner):
            return self._api_error(
                "account_pending", "A verified account is required to report a concern."
            )
        text = self._clean_text(description, 3000)
        if text is None:
            return self._api_error(
                "invalid_description", "Concern description must be text."
            )
        if not text or len(text) > 3000:
            return self._api_error(
                "invalid_description", "Enter a concern of 1 to 3000 characters."
            )
        if deal.state in ("completed", "cancelled", "disputed"):
            return self._api_error(
                "deal_closed", "A concern cannot be opened for a closed deal."
            )
        Case = request.env["holdpay.case"].sudo()
        if Case.search_count(
            [("deal_id", "=", deal.id), ("state", "in", ("open", "in_review"))]
        ):
            return self._api_error(
                "case_already_open", "This deal already has an active concern."
            )
        case = Case.create(
            {
                "deal_id": deal.id,
                "reported_by_id": partner.id,
                "description": text,
                "deal_state_before_dispute": deal.state,
                "state": "open",
            }
        )
        deal.write({"state": "disputed"})
        return {"ok": True, "data": self._case_data(case)}

    @http.route(
        "/holdpay/api/v1/cases/<int:case_id>/resolve",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def api_resolve_case(self, case_id, resolution_note=None):
        partner = self._active_partner()
        case = request.env["holdpay.case"].sudo().browse(case_id).exists()
        if (
            not case
            or case.agent_id != partner
            or not self._is_active(partner)
            or case.state not in ("open", "in_review")
        ):
            return self._api_error(
                "case_not_found", "An active case assigned to you was not found."
            )
        note = self._clean_text(resolution_note, 3000)
        if note is None:
            return self._api_error(
                "invalid_resolution", "Resolution note must be text."
            )
        if not note or len(note) > 3000:
            return self._api_error(
                "invalid_resolution", "Enter a resolution note of 1 to 3000 characters."
            )
        case.write({"state": "resolved", "resolution_note": note})
        if case.deal_id.state == "disputed":
            case.deal_id.write(
                {"state": case.deal_state_before_dispute or "awaiting_payment"}
            )
        return {"ok": True, "data": self._case_data(case)}

    @http.route(
        "/holdpay/api/v1/cases",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def api_cases(self):
        partner = self._active_partner()
        cases = request.env["holdpay.case"].sudo().search(
            [
                "|",
                "|",
                ("reported_by_id", "=", partner.id),
                ("deal_id.buyer_id", "=", partner.id),
                ("agent_id", "=", partner.id),
            ],
            order="create_date desc",
            limit=100,
        )
        return {"ok": True, "data": [self._case_data(case) for case in cases]}

    @http.route(
        "/holdpay/api/v1/deals/<int:deal_id>/reviews",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def api_create_review(self, deal_id, rating=None, comment=None):
        partner = self._active_partner()
        deal = request.env["holdpay.deal"].sudo().browse(deal_id).exists()
        if (
            not deal
            or partner != deal.buyer_id
            or deal.state != "completed"
            or not self._is_active(partner)
        ):
            return self._api_error(
                "review_not_allowed", "Only the buyer can review a completed deal."
            )
        try:
            if isinstance(rating, bool):
                raise ValueError
            score = int(rating)
            if isinstance(rating, float) and rating != score:
                raise ValueError
        except (TypeError, ValueError):
            return self._api_error("invalid_rating", "Rating must be a whole number 1–5.")
        if score < 1 or score > 5:
            return self._api_error("invalid_rating", "Rating must be a whole number 1–5.")
        Review = request.env["holdpay.review"].sudo()
        if Review.search_count([("deal_id", "=", deal.id)]):
            return self._api_error("review_exists", "This deal already has a review.")
        review_comment = self._clean_text(comment, 2000)
        if review_comment is None:
            return self._api_error("invalid_comment", "Review comment must be text.")
        review = Review.create(
            {
                "deal_id": deal.id,
                "listing_id": deal.listing_id.id,
                "buyer_id": partner.id,
                "seller_id": deal.seller_id.id,
                "rating": score,
                "comment": review_comment,
            }
        )
        return {"ok": True, "data": self._review_data(review)}

    @staticmethod
    def _listing_data(listing):
        return {
            "id": listing.id,
            "name": listing.name,
            "description": listing.description or "",
            "seller_id": listing.seller_id.id,
            "seller_name": listing.seller_id.name,
            "price": listing.price,
            "currency": listing.currency_id.name,
            "state": listing.state,
        }

    @staticmethod
    def _deal_data(deal):
        return {
            "id": deal.id,
            "reference": deal.reference,
            "listing_id": deal.listing_id.id,
            "listing_name": deal.listing_id.name,
            "buyer_id": deal.buyer_id.id,
            "seller_id": deal.seller_id.id,
            "agent_id": deal.agent_id.id or None,
            "amount": deal.amount,
            "currency": deal.currency_id.name,
            "payment_method": deal.payment_method,
            "payment_status": deal.payment_status,
            "payment_reference": deal.payment_reference or None,
            "state": deal.state,
            "buyer_note": deal.buyer_note or "",
        }

    @staticmethod
    def _case_data(case):
        return {
            "id": case.id,
            "deal_id": case.deal_id.id,
            "reported_by_id": case.reported_by_id.id,
            "agent_id": case.agent_id.id or None,
            "description": case.description,
            "resolution_note": case.resolution_note or "",
            "state": case.state,
        }

    @staticmethod
    def _review_data(review):
        return {
            "id": review.id,
            "deal_id": review.deal_id.id,
            "listing_id": review.listing_id.id,
            "seller_id": review.seller_id.id,
            "rating": review.rating,
            "comment": review.comment or "",
        }
