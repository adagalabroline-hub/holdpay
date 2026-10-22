{
    "name": "HoldPay Marketplace Backend",
    "summary": "HoldPay onboarding, marketplace, order, and mobile API foundation",
    "version": "18.0.2.0.0",
    "category": "Website",
    "license": "LGPL-3",
    "depends": ["website", "portal", "auth_signup"],
    "data": [
        "security/ir.model.access.csv",
        "security/service_contract_access.csv",
        "security/holdpay_rules.xml",
        "security/service_contract_rules.xml",
        "data/holdpay_sequence.xml",
        "data/service_contract_sequence.xml",
        "views/partner_views.xml",
        "views/marketplace_views.xml",
        "views/service_contract_views.xml",
        "views/service_contract_views.xml",
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
