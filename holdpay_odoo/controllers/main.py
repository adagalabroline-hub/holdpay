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
        if partner.holdpay_kyc_status != "verified":
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
            area = (post.get("holdpay_agent_area") or "").strip()
            if role not in ("buyer", "seller", "agent"):
                return request.render(
                    "holdpay_odoo.holdpay_role_form",
                    {
                        "error": "Choose a valid account type.",
                        "selected_role": False,
                    },
                )
            if role == "agent" and not area:
                return request.render(
                    "holdpay_odoo.holdpay_role_form",
                    {
                        "error": "Pickup agents must enter their operating area.",
                        "selected_role": role,
                    },
                )
            partner.write(
                {
                    "holdpay_role": role,
                    "holdpay_agent_area": area if role == "agent" else False,
                    "holdpay_kyc_status": "pending_mobile_app",
                }
            )
            return request.redirect("/my/holdpay")
        if partner.holdpay_kyc_status == "verified" and partner.holdpay_role:
            return request.redirect("/my/holdpay")
        return request.render(
            "holdpay_odoo.holdpay_role_form",
            {
                "error": False,
                "selected_role": partner.holdpay_role or "",
            },
        )
