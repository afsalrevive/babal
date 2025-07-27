# applications/model.py
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from itertools import chain

db = SQLAlchemy()

# association tables…
role_permissions = db.Table('role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permissions.id'), primary_key=True)
)
user_permissions = db.Table('user_permissions',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permissions.id'), primary_key=True)
)

class Permission(db.Model):
    __tablename__ = 'permissions'
    id             = db.Column(db.Integer, primary_key=True)
    page_id        = db.Column(db.Integer, db.ForeignKey('pages.id',ondelete='CASCADE'), nullable=False)
    crud_operation = db.Column(db.String(10), nullable=False)   # 'read','write'
    __table_args__ = (db.UniqueConstraint('page_id','crud_operation', name='uq_page_crud'),)
    page = db.relationship('Page', back_populates='permissions')

class Role(db.Model):
    __tablename__ = 'roles'
    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    permissions = db.relationship('Permission', secondary=role_permissions, backref='roles')
    users       = db.relationship('User', back_populates='role')


class Page(db.Model):
    __tablename__ = 'pages'
    id    = db.Column(db.Integer, primary_key=True)
    name  = db.Column(db.String(100), unique=True, nullable=False)
    route = db.Column(db.String(100), unique=True, nullable=False)
    def to_dict(self):
        return {"id":self.id,"name":self.name,"route":self.route}
    permissions = db.relationship('Permission', back_populates='page', cascade='all, delete-orphan',passive_deletes=True)

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(50), unique=True, nullable=False)
    full_name     = db.Column(db.String(100), nullable=False)
    password      = db.Column(db.String(128), nullable=False)
    last_seen     = db.Column(db.DateTime, default=datetime.now)
    role_id       = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    emp_id        = db.Column(db.Integer, unique=True, nullable=True)
    email         = db.Column(db.String(50), nullable=True)
    status        = db.Column(db.String(10), default="active", nullable=True)

    role        = db.relationship('Role', back_populates='users')
    permissions = db.relationship('Permission', secondary=user_permissions, backref='users')
    session_version = db.Column(db.Integer, default=1, nullable=False)

    def set_password(self,pw): self.password=generate_password_hash(pw)
    def check_password(self,pw): return check_password_hash(self.password,pw)
    @property
    def is_admin(self): return bool(self.role and self.role.name=='admin')
    def has_permission(self,perm_str):
        page,op=perm_str.split('.')
        # explicit user override
        for p in self.permissions:
            if p.page.name==page and p.crud_operation==op: return True
        # fall back to role
        for p in self.role.permissions:
            if p.page.name==page and p.crud_operation==op: return True
        return False
    def validate(self):
        if not self.name: raise ValueError("Username required")
        if not self.full_name: raise ValueError("Full Name required")
        if not self.password: raise ValueError("Password required")
        if not self.role_id: raise ValueError("Role required")
            
    def to_jwt_claims(self):
        return {
            "perms": self.effective_permissions,
            "is_admin": self.is_admin,
            "session_version": self.session_version
        }
    @property
    def effective_permissions(self):
        if self.is_admin:
            # Return both read+write for all pages to support legacy checks
            return [f"{page.name.lower()}.write" for page in Page.query.all()]

        perms = {}
        # Process permissions with priority
        for perm in chain(self.role.permissions, self.permissions):
            page_name = perm.page.name.lower()
            current = perms.get(page_name, 'none')
            # Hierarchy: write > read > none
            if perm.crud_operation == 'write' or \
               (perm.crud_operation == 'read' and current != 'write'):
                perms[page_name] = perm.crud_operation

        return [f"{page}.{op}" for page, op in perms.items() if op != 'none']
    

    #<!-- Model for TravelAgency -->

class Particular(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(40), unique=True, nullable=False)
    active = db.Column(db.Boolean, default=True)
    tickets = db.relationship('Ticket', backref='particular', cascade='all, delete-orphan', passive_deletes=True)

class TravelLocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    active = db.Column(db.Boolean, default=True)
    tickets = db.relationship('Ticket', backref='travel_location', cascade='all, delete-orphan', passive_deletes=True)

class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120),unique=True, nullable=False)
    contact = db.Column(db.String(40))
    email = db.Column(db.String(120))
    active = db.Column(db.Boolean, default=True)  # active/inactive
    wallet_balance = db.Column(db.Float, default=0.0)
    credit_limit = db.Column(db.Float, default=0.0)
    credit_used = db.Column(db.Float, default=0.0)
    passenger = db.relationship('Passenger', back_populates='customer', cascade='all, delete-orphan', passive_deletes=True)
class Passenger(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120),nullable=False, unique=True)
    contact = db.Column(db.String(40))
    passport_number = db.Column(db.String(40), unique=True, nullable=True)
    __table_args__ = (
        db.UniqueConstraint('passport_number', name='uq_passport_not_null'),
    )
    active = db.Column(db.Boolean, default=True)
    customer_id =   db.Column(db.Integer, db.ForeignKey('customer.id'),nullable=False) 
    customer = db.relationship('Customer', back_populates='passenger') # link to customer if exists
class Agent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    contact = db.Column(db.String(40))
    email = db.Column(db.String(120))
    active = db.Column(db.Boolean, default=True)  # active/inactive
    wallet_balance = db.Column(db.Float, default=0.0)
    credit_limit = db.Column(db.Float, default=0.0)
    credit_balance = db.Column(db.Float, default=0.0)

class Partner(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    contact = db.Column(db.String(40))
    email = db.Column(db.String(120))
    active = db.Column(db.Boolean, default=True)  # active/inactive
    wallet_balance = db.Column(db.Float, default=0.0)
    allow_negative_wallet = db.Column(db.Boolean, default=False)  # allow negative wallet balance

class Ticket(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    # Core relationships
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=False)
    agent_id = db.Column(db.Integer, db.ForeignKey('agent.id'), nullable=True)
    partner_id = db.Column(db.Integer, db.ForeignKey('partner.id'), nullable=True)
    travel_location_id = db.Column(db.Integer, db.ForeignKey('travel_location.id'), nullable=True)
    passenger_id = db.Column(db.Integer, db.ForeignKey('passenger.id'), nullable=True)

    # Ticket status & refund
    status = db.Column(db.String(20), default='booked')  # booked, cancelled, completed

    # Financials
    date = db.Column(db.DateTime, default=datetime.now)
    ref_no = db.Column(db.String(100), nullable=False)

    particular_id = db.Column(db.Integer, db.ForeignKey('particular.id'), nullable=True)
    
    customer_charge = db.Column(db.Float, nullable=False, default=0.0)  # amount charged to customer
    agent_paid = db.Column(db.Float, nullable=False, default=0.0)       # amount paid to agent or airline
    profit = db.Column(db.Float, nullable=False, default=0.0)           # derived: customer_charge - agent_paid

    customer_payment_mode = db.Column(db.String(20), nullable=True)  # cash / online
    agent_payment_mode = db.Column(db.String(20), nullable=True)     # cash / online

    # Refund breakdown
    customer_refund_amount = db.Column(db.Float, default=0)
    customer_refund_mode = db.Column(db.String(20))
    agent_recovery_amount = db.Column(db.Float, default=0)
    agent_recovery_mode = db.Column(db.String(20))

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, onupdate=datetime.now)

    updated_by = db.Column(db.String(100), default='system')
    
    def __repr__(self):
        return f"<Ticket {self.id} | {self.status} | {self.customer_charge} - {self.agent_paid} = {self.profit}>"



class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ref_no = db.Column(db.String(100),unique=True, nullable=False)
    entity_type = db.Column(db.String(20), nullable=False)  # customer, agent, partner
    entity_id = db.Column(db.Integer)  # ID of customer, agent, or partner
    pay_type = db.Column(db.String(20), nullable=False)  # cash_deposit, cash_withdrawal, account_transfer
    transaction_type = db.Column(db.String(20), nullable=False)  # payment, receipt, refund
    mode = db.Column(db.String(20), nullable=False)  # cash / online /credit /wallet
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, default=datetime.now)
    description = db.Column(db.String(255))
    particular_id = db.Column(db.Integer, db.ForeignKey('particular.id'))
    
    # Refund breakdown fields
    customer_refund_amount = db.Column(db.Float, default=0.0)
    agent_deduction_amount = db.Column(db.Float, default=0.0)
    mode_for_customer = db.Column(db.String(20), default='cash')   # cash/online
    mode_for_agent = db.Column(db.String(20), default='wallet')    # wallet/online
    
    updated_by = db.Column(db.String(100), default='system')
    extra_data = db.Column(db.JSON, default={})
    def __repr__(self):
        return f"<Transaction {self.id} | {self.transaction_type} | {self.amount}>"


class CompanyAccountBalance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    mode = db.Column(db.String(20), nullable=False)  # cash / online
    credited_amount = db.Column(db.Float, default=0)
    credited_date = db.Column(db.DateTime, default=datetime.now())
    balance = db.Column(db.Float, default=0)

    ref_no = db.Column(db.String(100))               # Transaction/Ticket reference
    transaction_type = db.Column(db.String(20))      # payment, receipt, refund, ticket
    action = db.Column(db.String(20))                # add, update, delete, cancel
    updated_by = db.Column(db.String(100))           # User who performed it
    updated_at = db.Column(db.DateTime, default=datetime.now(), onupdate=datetime.now)

class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=False)
    particular_id = db.Column(db.Integer, db.ForeignKey('particular.id'), nullable=True)
    date = db.Column(db.DateTime, default=datetime.now)
    ref_no = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default='booked')  # booked, cancelled
    
    customer_charge = db.Column(db.Float, nullable=False, default=0.0)
    customer_payment_mode = db.Column(db.String(20), nullable=True)  # cash, online, wallet
    
    # Refund fields (if cancelled)
    customer_refund_amount = db.Column(db.Float, default=0.0)
    customer_refund_mode = db.Column(db.String(20))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, onupdate=datetime.now)
    updated_by = db.Column(db.String(100), default='system')
    
    def __repr__(self):
        return f"<Service {self.id} | {self.ref_no} | {self.status}>"