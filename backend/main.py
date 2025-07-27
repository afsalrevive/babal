# main.py

import os
from datetime import timedelta
from flask import Flask
from flask_restful import Api
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from applications.bootstrap import initialize_system
from applications.model import db
from applications.login_api import LoginAPI, SignupAPI, VerifyTokenAPI
from applications.user_api import UserAPI,CurrentUserAPI, UserPermissionAPI,PagePermissionsAPI,BulkUserAPI,BulkDeleteAPI,BulkUserCreateAPI,UserDuplicateCheckAPI
from applications.setting_api import RoleAPI, RolePermissionAPI, PageAPI
from applications.generic_api import GenericAPI
from applications.entity_api import EntityResource
from applications.transaction_api import TransactionResource,CompanyBalanceResource
from applications.ticket_api import TicketResource
from applications.service_api import ServiceResource
from applications.dashboard import CompanyBalancesAPI, DashboardMetricsAPI, CustomerWalletCreditAPI, AgentWalletCreditAPI, PartnerWalletCreditAPI
from sqlalchemy import text

def create_app():
    app = Flask(__name__)
    # app.config['PROPAGATE_EXCEPTIONS'] = True
    current_dir = os.path.abspath(os.path.dirname(__file__))

    # Database
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///" + os.path.join(current_dir, "ts.sqlite3")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # JWT
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "revive_token_key")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=10)

    # CORS
    CORS(app,
        resources={ r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://83.229.39.190:5173",  # add your public IP
                "http://83.229.39.190"        # in case it's served without port 5173
            ],
            "supports_credentials": True,
            "allow_headers": ["Authorization", "Content-Type"],
            "expose_headers": ["Authorization"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
        }}
    )

    # Extensions
    db.init_app(app)
    JWTManager(app)
    api = Api(app)

    @app.before_request
    def enable_foreign_keys():
        if 'sqlite' in db.engine.url.drivername:
            db.session.execute(text('PRAGMA foreign_keys = ON'))

    # Routes
    api.add_resource(LoginAPI,        "/api/login")
    api.add_resource(SignupAPI,       "/api/signup", "/api/signup/<int:user_id>")
    api.add_resource(VerifyTokenAPI,  "/api/verify-token")

    api.add_resource(UserAPI,               "/api/users", "/api/users/<int:user_id>")
    api.add_resource(CurrentUserAPI,        '/api/me')
    api.add_resource(UserPermissionAPI,     "/api/users/<int:user_id>/permissions")
    api.add_resource(PagePermissionsAPI,    "/api/users/<int:uid>/page_permissions")
    api.add_resource(BulkUserAPI,          '/api/users/bulk-update')
    api.add_resource(BulkDeleteAPI,        '/api/users/bulk-delete')
    api.add_resource(BulkUserCreateAPI,     '/api/users/bulk')
    api.add_resource(UserDuplicateCheckAPI, '/api/users/check-duplicates')
    
    api.add_resource(RoleAPI,             "/api/roles", "/api/roles/<int:role_id>")
    api.add_resource(RolePermissionAPI,   '/api/permissions',"/api/roles/<int:role_id>/permissions")
    api.add_resource(PageAPI,             "/api/pages", "/api/pages/<int:page_id>")
    api.add_resource(GenericAPI,
        '/api/<string:resource>',
        '/api/<string:resource>/<int:id>'
    )
    api.add_resource(EntityResource,       "/api/manage/<string:entity_type>")
    api.add_resource(TransactionResource,
        '/api/transactions',                    
        '/api/transactions/<string:transaction_type>',  
        '/api/transactions/<int:transaction_id>',
        '/api/transactions/refno/<string:transaction_type>'
    )
    api.add_resource(
    TicketResource,
    '/api/tickets',
    endpoint='ticket_operations'
    )
    api.add_resource(ServiceResource, '/api/services')
    api.add_resource(CompanyBalancesAPI, "/api/dashboard/balances")
    api.add_resource(DashboardMetricsAPI, "/api/dashboard/metrics","/api/dashboard/export/pdf")
    api.add_resource(CustomerWalletCreditAPI, "/api/dashboard/customer_balances")
    api.add_resource(AgentWalletCreditAPI, "/api/dashboard/agent_balances")
    api.add_resource(PartnerWalletCreditAPI, "/api/dashboard/partner_balances")
    api.add_resource(CompanyBalanceResource, '/api/company_balance/<string:mode>')

    # Create tables & seed
    with app.app_context():
        db.create_all()
        initialize_system()

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

