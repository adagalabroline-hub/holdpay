from odoo import api, fields, models
from odoo.exceptions import ValidationError


class HoldPayListing(models.Model):
    _name = "holdpay.listing"
    _description = "HoldPay seller listing"
    _order = "create_date desc, id desc"

    name = fields.Char(required=True, index=True)
    description = fields.Text()
    seller_id = fields.Many2one(
        "res.partner", required=True, index=True, ondelete="restrict"
    )
    price = fields.Monetary(required=True, currency_field="currency_id")
    currency_id = fields.Many2one(
        "res.currency",
        required=True,
        default=lambda self: self.env.ref(
            "base.KES", raise_if_not_found=False
        )
        or self.env.company.currency_id,
    )
    state = fields.Selection(
        [("draft", "Draft"), ("published", "Published"), ("archived", "Archived")],
        default="draft",
        required=True,
        index=True,
    )
    active = fields.Boolean(default=True)

    @api.constrains("price")
    def _check_price(self):
        for listing in self:
            if listing.price <= 0:
                raise ValidationError("A listing price must be greater than zero.")

    @api.constrains("name")
    def _check_name(self):
        for listing in self:
            if not listing.name or not listing.name.strip():
                raise ValidationError("A listing must have a name.")


class HoldPayDeal(models.Model):
    _name = "holdpay.deal"
    _description = "HoldPay order and pickup journey"
    _order = "create_date desc, id desc"

    reference = fields.Char(required=True, copy=False, default="New", index=True)
    listing_id = fields.Many2one(
        "holdpay.listing", required=True, ondelete="restrict", index=True
    )
    buyer_id = fields.Many2one(
        "res.partner", required=True, ondelete="restrict", index=True
    )
    seller_id = fields.Many2one(
        "res.partner", required=True, ondelete="restrict", index=True
    )
    agent_id = fields.Many2one(
        "res.partner", required=True, ondelete="restrict", index=True
    )
    amount = fields.Monetary(required=True, currency_field="currency_id")
    currency_id = fields.Many2one("res.currency", required=True)
    payment_method = fields.Selection(
        [
            ("mpesa_till", "M-Pesa Till"),
            ("mpesa_pochi", "Pochi la Biashara"),
            ("mpesa_paybill", "M-Pesa Paybill"),
            ("globalpay", "GlobalPay"),
        ],
        required=True,
        default="mpesa_paybill",
    )
    payment_status = fields.Selection(
        [
            ("not_configured", "Provider not configured"),
            ("pending", "Pending provider confirmation"),
            ("confirmed", "Confirmed by provider"),
            ("failed", "Failed"),
            ("refunded", "Refunded by provider"),
        ],
        default="not_configured",
        required=True,
        index=True,
    )
    payment_reference = fields.Char(copy=False, index=True)
    state = fields.Selection(
        [
            ("awaiting_payment", "Awaiting payment setup"),
            ("seller_handover", "Awaiting seller handover"),
            ("agent_received", "Received by pickup agent"),
            ("buyer_collected", "Collected by buyer"),
            ("completed", "Completed"),
            ("disputed", "Under review"),
            ("cancelled", "Cancelled"),
        ],
        default="awaiting_payment",
        required=True,
        index=True,
    )
    buyer_note = fields.Text()

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("reference", "New") == "New":
                vals["reference"] = self.env["ir.sequence"].next_by_code(
                    "holdpay.deal"
                ) or "New"
        return super().create(vals_list)


class HoldPayCase(models.Model):
    _name = "holdpay.case"
    _description = "HoldPay delivery concern"
    _order = "create_date desc, id desc"

    deal_id = fields.Many2one(
        "holdpay.deal", required=True, ondelete="restrict", index=True
    )
    reported_by_id = fields.Many2one(
        "res.partner", required=True, ondelete="restrict", index=True
    )
    agent_id = fields.Many2one(
        "res.partner", related="deal_id.agent_id", store=True, index=True
    )
    description = fields.Text(required=True)
    deal_state_before_dispute = fields.Selection(
        [
            ("awaiting_payment", "Awaiting payment setup"),
            ("seller_handover", "Awaiting seller handover"),
            ("agent_received", "Received by pickup agent"),
            ("buyer_collected", "Collected by buyer"),
        ],
        required=True,
        copy=False,
    )
    resolution_note = fields.Text()
    state = fields.Selection(
        [
            ("open", "Open"),
            ("in_review", "In review"),
            ("resolved", "Resolved"),
        ],
        default="open",
        required=True,
        index=True,
    )


class HoldPayReview(models.Model):
    _name = "holdpay.review"
    _description = "HoldPay buyer review"
    _order = "create_date desc, id desc"

    deal_id = fields.Many2one(
        "holdpay.deal", required=True, ondelete="restrict", index=True
    )
    listing_id = fields.Many2one(
        "holdpay.listing", required=True, ondelete="restrict", index=True
    )
    buyer_id = fields.Many2one(
        "res.partner", required=True, ondelete="restrict", index=True
    )
    seller_id = fields.Many2one(
        "res.partner", required=True, ondelete="restrict", index=True
    )
    rating = fields.Integer(required=True)
    comment = fields.Text()

    _sql_constraints = [
        (
            "holdpay_review_deal_unique",
            "unique(deal_id)",
            "A deal can only have one buyer review.",
        ),
        (
            "holdpay_review_rating_range",
            "check(rating >= 1 AND rating <= 5)",
            "A review rating must be between 1 and 5.",
        ),
    ]
