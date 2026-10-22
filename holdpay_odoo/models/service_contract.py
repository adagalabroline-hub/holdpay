from odoo import api, fields, models
from odoo.exceptions import ValidationError


class HoldPayServiceContract(models.Model):
    _name = "holdpay.service.contract"
    _description = "HoldPay service agreement"
    _order = "create_date desc, id desc"

    reference = fields.Char(required=True, copy=False, default="New", index=True)
    title = fields.Char(required=True, index=True)
    category = fields.Selection(
        [
            ("construction", "Construction or renovation"),
            ("repairs", "Repairs and maintenance"),
            ("professional", "Professional services"),
            ("delivery", "Delivery"),
            ("other", "Other services"),
        ],
        required=True,
        index=True,
    )
    scope = fields.Text(required=True)
    buyer_id = fields.Many2one(
        "res.partner", required=True, ondelete="restrict", index=True
    )
    seller_id = fields.Many2one(
        "res.partner", required=True, ondelete="restrict", index=True
    )
    agreed_price = fields.Monetary(required=True, currency_field="currency_id")
    currency_id = fields.Many2one(
        "res.currency",
        required=True,
        default=lambda self: self.env.ref(
            "base.KES", raise_if_not_found=False
        )
        or self.env.company.currency_id,
    )
    approval_mode = fields.Selection(
        [
            ("per_milestone", "Client approves every milestone"),
            ("final", "Client approves the full job at the end"),
        ],
        required=True,
        default="per_milestone",
    )
    state = fields.Selection(
        [
            ("proposed", "Awaiting provider agreement"),
            ("active", "Work in progress"),
            ("disputed", "Concern raised"),
            ("completed", "Completed"),
            ("cancelled", "Cancelled"),
        ],
        required=True,
        default="proposed",
        index=True,
    )
    milestone_ids = fields.One2many(
        "holdpay.service.milestone", "contract_id", string="Agreed milestones"
    )
    concern_note = fields.Text(copy=False)
    concern_by_id = fields.Many2one("res.partner", copy=False, ondelete="restrict")
    concern_previous_state = fields.Selection(
        [
            ("proposed", "Awaiting provider agreement"),
            ("active", "Work in progress"),
        ],
        copy=False,
    )
    resolved_by_ids = fields.Many2many(
        "res.partner", "holdpay_service_contract_resolver_rel", copy=False
    )
    payment_status = fields.Selection(
        [
            ("not_configured", "Provider not configured"),
            ("simulated", "Demo approval only"),
        ],
        required=True,
        default="not_configured",
        index=True,
    )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("reference", "New") == "New":
                vals["reference"] = self.env["ir.sequence"].next_by_code(
                    "holdpay.service.contract"
                ) or "New"
        return super().create(vals_list)

    @api.constrains("agreed_price")
    def _check_agreed_price(self):
        for contract in self:
            if contract.agreed_price <= 0:
                raise ValidationError("An agreed service price must be positive.")

    @api.constrains("agreed_price", "milestone_ids", "currency_id")
    def _check_milestone_total(self):
        for contract in self:
            if not contract.milestone_ids:
                raise ValidationError("A service agreement needs at least one milestone.")
            milestone_total = sum(contract.milestone_ids.mapped("amount"))
            if contract.currency_id.compare_amounts(
                milestone_total, contract.agreed_price
            ):
                raise ValidationError(
                    "Milestone amounts must add up to the agreed service price."
                )


class HoldPayServiceMilestone(models.Model):
    _name = "holdpay.service.milestone"
    _description = "HoldPay service milestone"
    _order = "sequence, id"

    contract_id = fields.Many2one(
        "holdpay.service.contract",
        required=True,
        ondelete="cascade",
        index=True,
    )
    sequence = fields.Integer(required=True, default=10)
    description = fields.Char(required=True)
    amount = fields.Monetary(required=True, currency_field="currency_id")
    currency_id = fields.Many2one(
        "res.currency", related="contract_id.currency_id", store=True
    )
    state = fields.Selection(
        [
            ("pending", "Not submitted"),
            ("delivered", "Awaiting client approval"),
            ("approved", "Approved in demo"),
        ],
        required=True,
        default="pending",
        index=True,
    )

    @api.constrains("amount")
    def _check_amount(self):
        for milestone in self:
            if milestone.amount <= 0:
                raise ValidationError("A milestone amount must be positive.")

    @api.constrains("description")
    def _check_description(self):
        for milestone in self:
            if not milestone.description or not milestone.description.strip():
                raise ValidationError("A milestone needs a description.")
