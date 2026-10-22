{
    "name": "HoldPay Website",
    "summary": "HoldPay Kenya website and mobile-app KYC onboarding",
    "version": "18.0.1.0.0",
    "category": "Website",
    "license": "LGPL-3",
    "depends": ["website", "portal", "auth_signup"],
    "data": [
        "views/partner_views.xml",
        "views/website_templates.xml",
    ],
    "assets": {
        "web.assets_frontend": [
            "holdpay_odoo/static/src/css/holdpay.css",
        ],
    },
    "application": False,
    "installable": True,
}
