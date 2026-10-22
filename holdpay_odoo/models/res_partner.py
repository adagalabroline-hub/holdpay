from odoo import fields, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    holdpay_role = fields.Selection(
        [
            ("buyer", "Buyer"),
            ("seller", "Seller"),
            ("agent", "Pickup agent"),
        ],
        string="HoldPay account type",
        copy=False,
        index=True,
        groups="base.group_system",
    )
    holdpay_kyc_status = fields.Selection(
        [
            ("not_started", "Not started"),
            ("pending_mobile_app", "Pending mobile app KYC"),
            ("pending_review", "Pending verification review"),
            ("verified", "Verified"),
            ("rejected", "Not approved"),
        ],
        string="HoldPay KYC status",
        default="not_started",
        copy=False,
        index=True,
        groups="base.group_system",
    )
    holdpay_agent_area = fields.Char(
        string="HoldPay pickup operating area",
        copy=False,
        groups="base.group_system",
    )
