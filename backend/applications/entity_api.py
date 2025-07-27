from flask import request, jsonify, abort
from flask_restful import Resource
from sqlalchemy.exc import IntegrityError
from applications.utils import check_permission
from applications.model import db, Customer, Agent, Partner, Particular,Passenger, TravelLocation,Ticket, Transaction
import re

MODEL_MAP = {
    "customer": Customer,
    "agent": Agent,
    "partner": Partner,
    "particular": Particular,
    "passenger": Passenger,
    "travel_location": TravelLocation
}

def pre_process_customer(data, is_update=False):
    wallet_balance = data.get('wallet_balance', 0.0)
    credit_limit = data.get('credit_limit', 0.0)
    if wallet_balance < 0:
        data['credit_used'] = min(abs(wallet_balance), credit_limit)
    return data

def pre_process_agent(data, is_update=False):
    wallet_balance = data.get('wallet_balance', 0.0)
    credit_limit = data.get('credit_limit', 0.0)

    if not is_update:
        # On creation: credit_balance = credit_limit
        data['credit_balance'] = credit_limit
    else:
        # On update: if wallet_balance becomes negative, adjust credit_balance
        if wallet_balance < 0:
            data['credit_balance'] = min(abs(wallet_balance), credit_limit)

    return data


def pre_process_partner(data, is_update=False):
    if data.get('wallet_balance') is None:
        data['wallet_balance'] = 0.0
    if data.get('allow_negative_wallet') is None:
        data['allow_negative_wallet'] = False
    return data
def pre_process_passenger(data, is_update=False):
    if not data.get('passport_number'):
        data['passport_number'] = None
    return data

PRE_PROCESS_HOOKS = {
    'customer': pre_process_customer,
    'agent': pre_process_agent,
    'partner': pre_process_partner,
    'passenger': pre_process_passenger
}

def get_model_columns(model):
    return [col.name for col in model.__table__.columns]

def extract_unique_constraint_error(err_msg):
    match = re.search(r"UNIQUE constraint failed: (\w+)\.(\w+)", err_msg)
    if match:
        _, column = match.groups()
        return f"Duplicate value for field '{column}'."
    match = re.search(r'duplicate key value violates unique constraint ".*?_(\w+)_key"', err_msg)
    if match:
        return f"Duplicate value for field '{match.group(1)}'."
    match = re.search(r"Duplicate entry .* for key '(\w+)'", err_msg)
    if match:
        return f"Duplicate value for field '{match.group(1)}'."
    return "Duplicate entry or unique constraint violated."
def validate_entity_input(entity_type, data, is_update=False):
    errors = {}

    required_fields = {
        'customer': ['name'],
        'agent': ['name'],
        'partner': ['name'],
        'passenger': ['name', 'customer_id'],
        'particular': ['name'],
        'travel_location': ['name'],
    }

    email_fields = ['customer', 'agent', 'partner']
    numeric_fields = {
        'customer': ['wallet_balance', 'credit_limit', 'credit_used'],
        'agent': ['wallet_balance', 'credit_limit', 'credit_balance'],
        'partner': ['wallet_balance'],
    }

    # Static required field check
    if entity_type in required_fields:
        for field in required_fields[entity_type]:
            value = data.get(field)
            if not is_update or field in data:
                if value is None or (isinstance(value, str) and value.strip() == ""):
                    errors[field] = f"{field.capitalize()} is required."

    # Dynamic check from SQLAlchemy model
    model = MODEL_MAP.get(entity_type)
    if model:
        for column in model.__table__.columns:
            if not column.nullable and not column.primary_key:
                if not is_update or column.name in data:
                    if data.get(column.name) in (None, "", []):
                        errors[column.name] = f"{column.name.replace('_', ' ').capitalize()} is required."

    # Email format validation
    if entity_type in email_fields and 'email' in data and data.get('email'):
        import re
        if not re.match(r"[^@]+@[^@]+\.[^@]+", data['email']):
            errors['email'] = "Invalid email format."

    # Numeric field checks
    if entity_type in numeric_fields:
        for field in numeric_fields[entity_type]:
            if field in data:
                try:
                    float(data[field])
                except (TypeError, ValueError):
                    errors[field] = f"{field} must be a valid number."

    # Business rule: partner wallet
    if entity_type == 'partner' and 'wallet_balance' in data:
        if data.get('wallet_balance', 0) < 0 and not data.get('allow_negative_wallet', False):
            errors['wallet_balance'] = "Negative wallet balance not allowed unless explicitly permitted."

    # Foreign key check for passenger
    if entity_type == 'passenger' and 'customer_id' in data:
        if not Customer.query.get(data['customer_id']):
            errors['customer_id'] = "Referenced customer does not exist."

    return errors

class EntityResource(Resource):
    @check_permission()
    def get(self, entity_type):
        model = MODEL_MAP.get(entity_type.lower())
        if not model:
            abort(400, f"Unknown entity type: {entity_type}")
        
        customer_id = request.args.get('customer_id')
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        # Build base query
        query = model.query
        
        # Apply active filter if requested
        if active_only and hasattr(model, 'active'):
            query = query.filter_by(active=True)
        
        # For passengers with customer filter
        if entity_type.lower() == 'passenger' and customer_id:
            try:
                # Ensure customer_id is integer
                customer_id_int = int(customer_id)
                records = model.query.filter_by(customer_id=customer_id_int).all()
            except Exception as e:
                abort(400, f"Invalid customer filter: {str(e)}")
        # For all other entities
        else:
            records = model.query.all()

        records = model.query.all()

        result = []
        for r in records:
            base = {k: v for k, v in r.__dict__.items() if not k.startswith('_')}

            # Add relationship flags conditionally
            if entity_type.lower() == 'particular':
                base['name'] = r.name
            if entity_type.lower() == 'customer':
                base['has_passenger'] = bool(r.passenger)
                base['has_tickets'] = bool(Ticket.query.filter_by(customer_id=r.id).first())
                base['has_transactions'] = bool(Transaction.query.filter_by(entity_type='customer', entity_id=r.id).first())

            elif entity_type.lower() == 'agent':
                base['has_tickets'] = bool(Ticket.query.filter_by(agent_id=r.id).first())
                base['has_transactions'] = bool(Transaction.query.filter_by(entity_type='agent', entity_id=r.id).first())
                base['credit_used'] = float(r.credit_limit or 0) - float(r.credit_balance or 0)

            elif entity_type.lower() == 'partner':
                base['has_transactions'] = bool(Transaction.query.filter_by(entity_type='partner', entity_id=r.id).first())
            elif entity_type.lower() == 'passenger':
                base['customer_name'] = r.customer.name if r.customer else None

            result.append(base)

        return result

    @check_permission()
    def post(self, entity_type):
        model = MODEL_MAP.get(entity_type.lower())
        if not model:
            abort(400, f"Unknown entity type: {entity_type}")

        data = request.json or {}

        # ✅ Validate input
        errors = validate_entity_input(entity_type.lower(), data, is_update=False)
        if errors:
            return {"field_errors": errors}, 400

        hook = PRE_PROCESS_HOOKS.get(entity_type.lower())
        if hook:
            data = hook(data, is_update=False)

        allowed = get_model_columns(model)
        try:
            instance = model(**{k: v for k, v in data.items() if k in allowed})
            db.session.add(instance)
            db.session.commit()
            return {"message": f"{entity_type.capitalize()} created", "id": instance.id}
        except IntegrityError as e:
            db.session.rollback()
            return {"error": extract_unique_constraint_error(str(e.orig))}, 409
        except Exception as e:
            db.session.rollback()
            return {"error": f"Failed to create {entity_type}: {str(e)}"}, 500


    @check_permission()
    def patch(self, entity_type):
        model = MODEL_MAP.get(entity_type.lower())
        if not model:
            abort(400, f"Unknown entity type: {entity_type}")

        data = request.json or {}
        obj_id = data.get("id")
        if not obj_id:
            abort(400, "Missing id for update")

        instance = model.query.get(obj_id)
        if not instance:
            abort(404, f"{entity_type.capitalize()} with id {obj_id} not found")

        # ✅ Validate input for update
        errors = validate_entity_input(entity_type.lower(), data, is_update=True)
        if errors:
            return {"field_errors": errors}, 400

        hook = PRE_PROCESS_HOOKS.get(entity_type.lower())
        if hook:
            data = hook(data, is_update=True)

        allowed = get_model_columns(model)
        for key, value in data.items():
            if key in allowed and key != "id":
                setattr(instance, key, value)

        try:
            db.session.commit()
            return {"message": f"{entity_type.capitalize()} updated"}
        except IntegrityError as e:
            db.session.rollback()
            return {"error": extract_unique_constraint_error(str(e.orig))}, 409
        except Exception as e:
            db.session.rollback()
            return {"error": f"Failed to update {entity_type}: {str(e)}"}, 500
        
    @check_permission()
    def delete(self, entity_type):
        model = MODEL_MAP.get(entity_type.lower())
        if not model:
            abort(400, f"Unknown entity type: {entity_type}")

        try:
            obj_id = int(request.args.get("id"))
        except (TypeError, ValueError):
            abort(400, "Invalid ID format")

        if not obj_id:
            abort(400, "Missing id for delete")

        # Check dependencies after obj_id is resolved
        if entity_type in ['customer', 'agent', 'partner']:
            linked_ticket = Ticket.query.filter_by(**{f"{entity_type}_id": obj_id}).first()
            linked_txn = Transaction.query.filter_by(entity_type=entity_type, entity_id=obj_id).first()
            if linked_ticket or linked_txn:
                return {"error": f"{entity_type.capitalize()} is linked to records and cannot be deleted."}, 400

        instance = model.query.get(obj_id)
        if not instance:
            abort(404, f"{entity_type.capitalize()} with id {obj_id} not found")

        try:
            db.session.delete(instance)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return {"error": f"Failed to delete: {str(e)}"}, 500

        return {"message": f"{entity_type.capitalize()} deleted"}

