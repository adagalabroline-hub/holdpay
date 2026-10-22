import math

from odoo import http
from odoo.http import request


class HoldPayServiceApi(http.Controller):
    @staticmethod
    def _error(code, message):
        return {"ok": False, "error": {"code": code, "message": message}}

    @staticmethod
    def _partner():
        return request.env.user.partner_id.sudo()

    @staticmethod
    def _active_seller(partner):
        return (
            partner.holdpay_role == "seller"
            and partner.holdpay_kyc_status == "verified"
            and partner.holdpay_business_status == "verified"
        )

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
    def _text(value, limit):
        if value is None:
            return ""
        if not isinstance(value, str):
            return None
        return value.strip()[:limit]

    @classmethod
    def _contract_data(cls, contract):
        return {
            "id": contract.id,
            "reference": contract.reference,
            "title": contract.title,
            "category": contract.category,
            "scope": contract.scope,
            "buyer_id": contract.buyer_id.id,
            "buyer_name": contract.buyer_id.name,
            "seller_id": contract.seller_id.id,
            "seller_name": contract.seller_id.name,
            "agreed_price": contract.agreed_price,
            "currency": contract.currency_id.name,
            "approval_mode": contract.approval_mode,
            "state": contract.state,
            "payment_status": contract.payment_status,
            "concern_note": contract.concern_note or "",
            "concern_by_id": contract.concern_by_id.id or None,
            "resolved_by_ids": contract.resolved_by_ids.ids,
            "milestones": [
                {
                    "id": milestone.id,
                    "sequence": milestone.sequence,
                    "description": milestone.description,
                    "amount": milestone.amount,
                    "state": milestone.state,
                }
                for milestone in contract.milestone_ids.sorted(
                    lambda item: (item.sequence, item.id)
                )
            ],
        }

    @http.route(
        "/holdpay/api/v1/service-providers",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def service_providers(self):
        partner = self._partner()
        if (
            partner.holdpay_role != "buyer"
            or partner.holdpay_kyc_status != "verified"
        ):
            return self._error(
                "account_pending", "Complete app verification before hiring a provider."
            )
        providers = request.env["res.partner"].sudo().search(
            [
                ("holdpay_role", "=", "seller"),
                ("holdpay_kyc_status", "=", "verified"),
                ("holdpay_business_status", "=", "verified"),
                ("active", "=", True),
            ],
            order="name",
            limit=100,
        )
        return {
            "ok": True,
            "data": [
                {"id": provider.id, "name": provider.name}
                for provider in providers
                if provider != partner
            ],
        }

    @http.route(
        "/holdpay/api/v1/service-contracts",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def service_contracts(self, action="list", seller_id=None, **values):
        partner = self._partner()
        Contract = request.env["holdpay.service.contract"].sudo()
        if action == "list":
            contracts = Contract.search(
                [
                    "|",
                    ("buyer_id", "=", partner.id),
                    ("seller_id", "=", partner.id),
                ],
                order="create_date desc",
                limit=100,
            )
            return {
                "ok": True,
                "data": [self._contract_data(item) for item in contracts],
            }
        if action != "create":
            return self._error("invalid_action", "Choose list or create.")
        if (
            partner.holdpay_role != "buyer"
            or partner.holdpay_kyc_status != "verified"
        ):
            return self._error(
                "buyer_verification_required",
                "A verified buyer account is required to request a service.",
            )
        provider_id = self._positive_id(seller_id)
        if not provider_id:
            return self._error("invalid_provider", "Choose a valid service provider.")
        provider = request.env["res.partner"].sudo().browse(provider_id).exists()
        if not provider or not self._active_seller(provider) or provider == partner:
            return self._error(
                "provider_unavailable", "This verified service provider is unavailable."
            )
        title = self._text(values.get("title"), 160)
        scope = self._text(values.get("scope"), 10000)
        if title is None or scope is None or not title or not scope:
            return self._error(
                "invalid_scope", "A title and written work scope are required."
            )
        category = values.get("category")
        categories = ("construction", "repairs", "professional", "delivery", "other")
        if category not in categories:
            return self._error("invalid_category", "Choose a supported service category.")
        approval_mode = values.get("approval_mode")
        if approval_mode not in ("per_milestone", "final"):
            return self._error(
                "invalid_approval_mode",
                "Choose per-milestone approval or final approval.",
            )
        try:
            raw_price = values.get("agreed_price")
            if isinstance(raw_price, bool):
                raise ValueError
            price = float(raw_price)
        except (TypeError, ValueError):
            return self._error("invalid_price", "Enter a valid agreed price.")
        if not math.isfinite(price) or price <= 0 or price > 1_000_000_000:
            return self._error(
                "invalid_price", "Agreed price must be greater than zero."
            )
        milestones = values.get("milestones")
        if not isinstance(milestones, list) or not 1 <= len(milestones) <= 20:
            return self._error(
                "invalid_milestones", "Provide between 1 and 20 agreed milestones."
            )
        normalized = []
        for index, item in enumerate(milestones, start=1):
            if not isinstance(item, dict):
                return self._error(
                    "invalid_milestones", "Each milestone must include description and amount."
                )
            description = self._text(item.get("description"), 500)
            try:
                if isinstance(item.get("amount"), bool):
                    raise ValueError
                amount = float(item.get("amount"))
            except (TypeError, ValueError):
                return self._error(
                    "invalid_milestone_amount", "Enter a valid amount for each milestone."
                )
            if not description or not math.isfinite(amount) or amount <= 0:
                return self._error(
                    "invalid_milestone", "Every milestone needs a description and positive amount."
                )
            normalized.append(
                {
                    "sequence": index * 10,
                    "description": description,
                    "amount": amount,
                }
            )
        currency = request.env.ref("base.KES", raise_if_not_found=False) or request.env.company.currency_id
        if currency.compare_amounts(
            sum(item["amount"] for item in normalized), price
        ):
            return self._error(
                "milestone_total_mismatch",
                "Milestone amounts must add up to the agreed price.",
            )
        contract = Contract.create(
            {
                "title": title,
                "category": category,
                "scope": scope,
                "buyer_id": partner.id,
                "seller_id": provider.id,
                "agreed_price": price,
                "currency_id": currency.id,
                "approval_mode": approval_mode,
                "state": "proposed",
                "payment_status": "not_configured",
                "milestone_ids": [(0, 0, item) for item in normalized],
            }
        )
        return {
            "ok": True,
            "data": self._contract_data(contract),
            "notice": "Agreement proposed. No payment is collected or held.",
        }

    @http.route(
        "/holdpay/api/v1/service-contracts/<int:contract_id>/accept",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def accept_contract(self, contract_id):
        partner = self._partner()
        contract = (
            request.env["holdpay.service.contract"].sudo().browse(contract_id).exists()
        )
        if (
            not contract
            or contract.seller_id != partner
            or contract.state != "proposed"
            or not self._active_seller(partner)
        ):
            return self._error(
                "agreement_unavailable",
                "An active agreement proposed to your verified seller account was not found.",
            )
        contract.write({"state": "active"})
        return {"ok": True, "data": self._contract_data(contract)}

    @http.route(
        "/holdpay/api/v1/service-contracts/<int:contract_id>/milestones/<int:milestone_id>/submit",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def submit_milestone(self, contract_id, milestone_id):
        partner = self._partner()
        contract = (
            request.env["holdpay.service.contract"].sudo().browse(contract_id).exists()
        )
        if (
            not contract
            or contract.seller_id != partner
            or contract.state != "active"
            or not self._active_seller(partner)
        ):
            return self._error("agreement_unavailable", "Active agreement not found.")
        milestone = contract.milestone_ids.filtered(
            lambda item: item.id == milestone_id
        )
        ordered = contract.milestone_ids.sorted(
            lambda item: (item.sequence, item.id)
        )
        expected = ordered.filtered(
            lambda item: item.state == "pending"
            if contract.approval_mode == "final"
            else item.state != "approved"
        )[:1]
        if (
            not milestone
            or milestone != expected
            or milestone.state != "pending"
        ):
            return self._error(
                "milestone_not_ready",
                "Submit milestones in order after completing the agreed work.",
            )
        milestone.write({"state": "delivered"})
        return {"ok": True, "data": self._contract_data(contract)}

    @http.route(
        "/holdpay/api/v1/service-contracts/<int:contract_id>/approve",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def approve_service_work(self, contract_id, milestone_id=None):
        partner = self._partner()
        contract = (
            request.env["holdpay.service.contract"].sudo().browse(contract_id).exists()
        )
        if (
            not contract
            or contract.buyer_id != partner
            or contract.state != "active"
            or partner.holdpay_kyc_status != "verified"
        ):
            return self._error(
                "agreement_unavailable", "Active agreement not found for this buyer."
            )
        milestones = contract.milestone_ids.sorted(
            lambda item: (item.sequence, item.id)
        )
        if contract.approval_mode == "per_milestone":
            milestone_id = HoldPayServiceApi._positive_id(milestone_id)
            target = milestones.filtered(lambda item: item.id == milestone_id)
            expected = milestones.filtered(lambda item: item.state != "approved")[:1]
            if not target or target != expected or target.state != "delivered":
                return self._error(
                    "milestone_not_ready",
                    "Approve only the next milestone after the provider submits it.",
                )
            target.write({"state": "approved"})
            if all(item.state == "approved" for item in milestones):
                contract.write(
                    {"state": "completed", "payment_status": "simulated"}
                )
        else:
            if milestone_id:
                return self._error(
                    "invalid_approval",
                    "Final approval applies to the whole agreement, not one milestone.",
                )
            if not milestones or any(
                item.state != "delivered" for item in milestones
            ):
                return self._error(
                    "work_not_ready",
                    "The provider must submit every milestone before final approval.",
                )
            milestones.write({"state": "approved"})
            contract.write({"state": "completed", "payment_status": "simulated"})
        return {
            "ok": True,
            "data": self._contract_data(contract),
            "notice": "Work approval recorded in the prototype. No payment was released.",
        }

    @http.route(
        "/holdpay/api/v1/service-contracts/<int:contract_id>/concern",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def raise_concern(self, contract_id, description=None):
        partner = self._partner()
        contract = (
            request.env["holdpay.service.contract"].sudo().browse(contract_id).exists()
        )
        if (
            not contract
            or partner not in (contract.buyer_id, contract.seller_id)
            or contract.state != "active"
        ):
            return self._error(
                "agreement_unavailable", "Only an active agreement participant can raise a concern."
            )
        if partner.holdpay_kyc_status != "verified":
            return self._error(
                "account_pending", "A verified account is required to raise a concern."
            )
        note = self._text(description, 3000)
        if note is None or not note:
            return self._error(
                "invalid_concern", "Enter a concern of 1 to 3000 characters."
            )
        contract.write(
            {
                "state": "disputed",
                "concern_note": note,
                "concern_by_id": partner.id,
                "concern_previous_state": "active",
                "resolved_by_ids": [(5, 0, 0)],
            }
        )
        return {"ok": True, "data": self._contract_data(contract)}

    @http.route(
        "/holdpay/api/v1/service-contracts/<int:contract_id>/resolve-concern",
        type="json",
        auth="user",
        methods=["POST"],
        csrf=False,
    )
    def resolve_concern(self, contract_id):
        partner = self._partner()
        contract = (
            request.env["holdpay.service.contract"].sudo().browse(contract_id).exists()
        )
        if (
            not contract
            or partner not in (contract.buyer_id, contract.seller_id)
            or contract.state != "disputed"
            or partner.holdpay_kyc_status != "verified"
        ):
            return self._error(
                "agreement_unavailable", "An active concern for your agreement was not found."
            )
        contract.write({"resolved_by_ids": [(4, partner.id)]})
        if contract.buyer_id in contract.resolved_by_ids and contract.seller_id in contract.resolved_by_ids:
            contract.write(
                {
                    "state": contract.concern_previous_state or "active",
                    "concern_note": False,
                    "concern_by_id": False,
                    "concern_previous_state": False,
                    "resolved_by_ids": [(5, 0, 0)],
                }
            )
        return {"ok": True, "data": self._contract_data(contract)}
