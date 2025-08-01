from flask import request,g,send_file
from flask_restful import Resource
from applications.utils import check_permission
from applications.model import db, Customer, Agent, Partner, Transaction ,Passenger, CompanyAccountBalance, Particular
from datetime import datetime, timedelta
from dateutil.parser import parse as parse_date
import pandas as pd
from io import BytesIO
from fpdf import FPDF
import re

TRANSACTION_TYPES = ['payment', 'receipt', 'refund', 'wallet_transfer']

MODEL_MAP = {
    'customer': Customer,
    'agent': Agent,
    'partner': Partner,
    'passenger': Passenger
}

REF_NO_PREFIXES = {
    'payment': 'P',
    'receipt': 'R',
    'refund': 'E',
    'wallet_transfer': 'WT'
}

def get_entity(entity_type, entity_id):
    if entity_id is None or entity_type == 'others':
        return None
    model = MODEL_MAP.get(entity_type)
    return model.query.get(entity_id) if model else None

def adjust_company_balance(mode, amount, direction='out', ref_no=None, transaction_type=None, action='add', updated_by='system'):
    if not mode:
        raise ValueError("Missing mode for company balance adjustment.")

    # NEW: Only allow specific modes
    if mode not in ['cash', 'online']:
        return  # Prevent creating invalid company balance rows

    last = CompanyAccountBalance.query.filter_by(mode=mode).order_by(CompanyAccountBalance.id.desc()).first()
    prev = last.balance if last else 0
    delta = amount if direction == 'in' else -amount
    new_balance = prev + delta

    db.session.add(CompanyAccountBalance(
        mode=mode,
        credited_amount=delta,
        balance=new_balance,
        ref_no=ref_no,
        transaction_type=transaction_type,
        action=action,
        updated_by=updated_by
    ))


def get_entity_name(entity_type, entity_id):
    if entity_id is None:
        return None
    entity = get_entity(entity_type, entity_id)
    return entity.name if entity else None

def get_particular_name(particular_id):
    if not particular_id:
        return None
    p = Particular.query.get(particular_id)
    return p.name if p else None


def get_transaction_payload(t: Transaction):
    payload = {
        "id": t.id,
        "ref_no": t.ref_no,
        "entity_type": t.entity_type,
        "entity_id": t.entity_id,
        "entity_name": get_entity_name(t.entity_type, t.entity_id),
        "transaction_type": t.transaction_type,
        "pay_type": t.pay_type,
        "mode": t.mode,
        "amount": t.amount,
        "date": t.date.isoformat() if t.date else None,
        "timestamp": t.date.timestamp() * 1000 if t.date else None,
        "description": t.description,
        "particular_id": t.particular_id,
        "particular_name": get_particular_name(t.particular_id),
        "ticket_id": getattr(t, 'ticket_id', None)
    }
    
    # Ensure all extra_data fields are included and properly formatted
    if t.extra_data:
        payload.update({
            k: v for k, v in t.extra_data.items()
            if v is not None  # Exclude null values
        })
        
        # Ensure refund_direction is always included for refunds
        if t.transaction_type == 'refund' and 'refund_direction' in t.extra_data:
            payload['refund_direction'] = t.extra_data['refund_direction'].lower()
        if 'from_entity_name' in t.extra_data:
            payload['from_entity_name'] = t.extra_data['from_entity_name']
        if 'to_entity_name' in t.extra_data:
            payload['to_entity_name'] = t.extra_data['to_entity_name']
    
    return payload

def generate_ref_no(transaction_type):
    """Generate unique reference number for transaction"""
    year = datetime.now().year
    prefix = REF_NO_PREFIXES.get(transaction_type, 'T')
    
    last_trans = Transaction.query.filter(
        Transaction.ref_no.like(f"{year}/{prefix}/%")
    ).order_by(Transaction.ref_no.desc()).first()
    
    if last_trans:
        try:
            last_seq = int(last_trans.ref_no.split('/')[-1])
        except (ValueError, IndexError):
            last_seq = 0
        seq = last_seq + 1
    else:
        seq = 1

    return f"{year}/{prefix}/{seq:04d}"
def apply_credit_wallet_logic(entity, amount, entity_type, mode='deduct'):
    """Apply wallet/credit logic based on entity type
    
    Args:
        entity: The entity object (Customer, Agent, Partner)
        amount: The amount to process
        entity_type: Type of entity ('customer', 'agent', 'partner')
        mode: 'deduct' or 'revert' the amount
    """
    if entity_type == 'customer':
        if mode == 'deduct':
            wallet = entity.wallet_balance
            credit_available = entity.credit_limit - entity.credit_used
            if wallet + credit_available < amount:
                raise ValueError("Insufficient funds")
            # Deduct from wallet first, then credit
            deduct_wallet = min(wallet, amount)
            entity.wallet_balance -= deduct_wallet
            entity.credit_used += (amount - deduct_wallet)
        elif mode == 'revert':
            # First reduce credit used, then add to wallet
            repay_credit = min(entity.credit_used, amount)
            entity.credit_used -= repay_credit
            entity.wallet_balance += (amount - repay_credit)
            
    elif entity_type == 'agent':
        if mode == 'deduct':
            if entity.wallet_balance + entity.credit_balance < amount:
                raise ValueError("Insufficient funds")
            # Deduct from wallet first, then credit balance
            deduct_wallet = min(entity.wallet_balance, amount)
            entity.wallet_balance -= deduct_wallet
            entity.credit_balance -= (amount - deduct_wallet)
        elif mode == 'revert':
            # First fill credit balance deficit, then add to wallet
            credit_deficit = entity.credit_limit - entity.credit_balance
            repay_credit = min(credit_deficit, amount)
            entity.credit_balance += repay_credit
            entity.wallet_balance += (amount - repay_credit)
            
    elif entity_type == 'partner':
        if mode == 'deduct':
            if not entity.allow_negative_wallet and entity.wallet_balance < amount:
                raise ValueError("Insufficient wallet balance")
            entity.wallet_balance -= amount
        elif mode == 'revert':
            entity.wallet_balance += amount

def apply_company_adjustment(transaction, direction):
    adjust_company_balance(transaction.mode, transaction.amount, direction)

def parse_transaction_date(raw_date):
    if isinstance(raw_date, (int, float)):
        return datetime.fromtimestamp(raw_date / 1000)
    elif isinstance(raw_date, str):
        return parse_date(raw_date)
    return datetime.now()

def process_wallet_transfer(transaction):
    """Apply wallet-to-wallet transfer between entities with credit and wallet logic"""
    extra = transaction.extra_data or {}
    from_type = extra.get('from_entity_type')
    to_type = extra.get('to_entity_type')
    from_id = extra.get('from_entity_id')
    to_id = extra.get('to_entity_id')
    amount = transaction.amount

    from_entity = get_entity(from_type, from_id)
    to_entity = get_entity(to_type, to_id)

    if not from_entity or not to_entity:
        raise ValueError("Both source and destination entities must exist")

    # Deduct from sender (wallet + credit logic)
    apply_credit_wallet_logic(from_entity, amount, from_type, mode='deduct')
    if hasattr(from_entity, '_deduct_breakdown'):
        transaction.extra_data.update({
            "from_wallet_deducted": from_entity._deduct_breakdown.get("wallet_deducted", 0),
            "from_credit_used": from_entity._deduct_breakdown.get("credit_used", 0)
        })

    # Add to receiver (credit repayment first, then wallet)
    apply_credit_wallet_logic(to_entity, amount, to_type, mode='revert')
    if hasattr(to_entity, '_revert_breakdown'):
        transaction.extra_data.update({
            "to_credit_repaid": to_entity._revert_breakdown.get("credit_repaid", 0),
            "to_wallet_added": to_entity._revert_breakdown.get("wallet_added", 0)
        })

    # Add extra info for UI/debug
    transaction.extra_data.update({
        "from_entity_name": from_entity.name,
        "to_entity_name": to_entity.name
    })

    db.session.add(from_entity)
    db.session.add(to_entity)

def update_wallet_and_company(transaction):
    etype = transaction.entity_type
    ttype = transaction.transaction_type
    pay_type = transaction.pay_type
    amount = transaction.amount
    extra = transaction.extra_data or {}
    ref_no = transaction.ref_no
    updated_by = transaction.updated_by or 'system'

    def log_company(mode, direction='out', action='add'):
        if mode not in ['cash', 'online']:
            return
        adjust_company_balance(
            mode=mode,
            amount=amount,
            direction=direction,
            ref_no=ref_no,
            transaction_type=ttype,
            action=action,
            updated_by=updated_by
        )
        transaction.extra_data["company_adjusted"] = True

    if ttype == 'payment':
        entity = get_entity(etype, transaction.entity_id)
        if etype == 'agent':
            if pay_type == 'cash_deposit':
                # For cash deposit, always credit agent's account
                apply_credit_wallet_logic(entity, amount, entity_type='agent', mode='revert')
                transaction.extra_data["credited_entity"] = True
            elif pay_type == 'other_expense' and extra.get('deduct_from_account'):
                # Only deduct if toggle is enabled
                apply_credit_wallet_logic(entity, amount, entity_type='agent', mode='deduct')
                transaction.extra_data["debited_entity"] = True
            log_company(transaction.mode, direction='out')

        elif etype in ['customer', 'partner']:
            if pay_type == 'cash_withdrawal':
                # Always deduct for cash withdrawal
                apply_credit_wallet_logic(entity, amount, entity_type=etype, mode='deduct')
                transaction.extra_data["debited_entity"] = True
            elif pay_type == 'other_expense' and extra.get('deduct_from_account'):
                # Only deduct if toggle is enabled
                apply_credit_wallet_logic(entity, amount, entity_type=etype, mode='deduct')
                transaction.extra_data["debited_entity"] = True
            log_company(transaction.mode, direction='out')

        if entity:  # Only add if entity exists (not for 'others')
            db.session.add(entity)

    elif ttype == 'receipt':
        entity = get_entity(etype, transaction.entity_id)
        if etype == 'customer':
            if pay_type == 'cash_deposit' or (pay_type == 'other_receipt' and extra.get('credit_to_account')):
                apply_credit_wallet_logic(entity, amount, entity_type='customer', mode='revert')
                transaction.extra_data["credited_entity"] = True
            log_company(transaction.mode, direction='in')
            
        elif etype == 'partner':
            if pay_type == 'cash_deposit' or (pay_type == 'other_receipt' and extra.get('credit_to_account')):
                entity.wallet_balance += amount
                transaction.extra_data["credited_entity"] = True
            log_company(transaction.mode, direction='in')
            
        elif etype == 'agent':
            if pay_type == 'other_receipt' and extra.get('credit_to_account'):
                # Actually deduct from agent for receipt (since we're receiving money)
                apply_credit_wallet_logic(entity, amount, entity_type='agent', mode='deduct')
                transaction.extra_data["debited_entity"] = True
            log_company(transaction.mode, direction='in')
            
        elif etype == 'others':
            log_company(transaction.mode, direction='in')

        if entity:  # Only add if entity exists (not for 'others')
            db.session.add(entity)

    elif ttype == 'refund':
        direction = extra.get('refund_direction')
        f_type = extra.get('from_entity_type')
        f_id = extra.get('from_entity_id')
        f_mode = extra.get('mode_for_from')
        t_type = extra.get('to_entity_type')
        t_id = extra.get('to_entity_id')
        t_mode = extra.get('mode_for_to')
        credit_to_account = extra.get('credit_to_account')
        deduct_from_account = extra.get('deduct_from_account')

        if direction == 'incoming':
            # Entity → Company
            entity = get_entity(f_type, f_id) if f_type != 'others' else None
            
            if f_type == 'others' or f_mode == 'cash':
                # For 'others' or cash payments, update company account
                log_company(t_mode, direction='in')
                
                # For non-others, handle entity wallet if requested
                if f_type != 'others' and credit_to_account:
                    if f_type in ['customer', 'partner']:
                        apply_credit_wallet_logic(entity, amount, entity_type=f_type, mode='revert')
                        transaction.extra_data["credited_entity"] = True
                    elif f_type == 'agent':
                        apply_credit_wallet_logic(entity, amount, entity_type='agent', mode='revert')
                        transaction.extra_data["credited_entity"] = True
            
            elif f_mode == 'wallet':
                # Direct deduction from wallet (no company account update)
                if f_type in ['customer', 'partner']:
                    apply_credit_wallet_logic(entity, amount, entity_type=f_type, mode='deduct')
                    transaction.extra_data["debited_entity"] = True
                elif f_type == 'agent':
                    apply_credit_wallet_logic(entity, amount, entity_type='agent', mode='deduct')
                    transaction.extra_data["debited_entity"] = True

            if entity:  # Only add if entity exists
                db.session.add(entity)

        elif direction == 'outgoing':
            # Company → Entity
            entity = get_entity(t_type, t_id) if t_type != 'others' else None
            
            if f_mode != 'service_availed':
                # Update company account for non-service-availed refunds
                log_company(f_mode, direction='out')
            
            if t_type in ['customer', 'partner']:
                if deduct_from_account:
                    # Deduct from entity account
                    apply_credit_wallet_logic(entity, amount, entity_type=t_type, mode='deduct')
                    transaction.extra_data["debited_entity"] = True
                elif credit_to_account:
                    # Credit to entity account
                    apply_credit_wallet_logic(entity, amount, entity_type=t_type, mode='revert')
                    transaction.extra_data["credited_entity"] = True
            
            elif t_type == 'agent' and credit_to_account:
                # Always credit agent account
                apply_credit_wallet_logic(entity, amount, entity_type='agent', mode='revert')
                transaction.extra_data["credited_entity"] = True
            
            if entity:  # Only add if entity exists
                db.session.add(entity)


def revert_wallet_and_company(transaction):
    ttype = transaction.transaction_type
    amount = transaction.amount
    mode = transaction.mode
    etype = transaction.entity_type
    extra = transaction.extra_data or {}
    ref_no = transaction.ref_no
    updated_by = transaction.updated_by or 'system'

    def log_company(mode, direction):
        """Log company balance adjustment in reverse direction"""
        if not mode:
            raise ValueError("Missing mode for company balance adjustment during revert.")
        reverse_direction = 'in' if direction == 'out' else 'out'
        adjust_company_balance(
            mode=mode,
            amount=amount,
            direction=reverse_direction,
            ref_no=ref_no,
            transaction_type=ttype,
            action='delete',
            updated_by=updated_by
        )

    if ttype in ['payment', 'receipt']:
        entity = get_entity(etype, transaction.entity_id)
        if entity:
            if extra.get("debited_entity"):
                # Reverse debit: add back the deducted amount
                if etype == 'customer':
                    apply_credit_wallet_logic(entity, amount, entity_type='customer', mode='revert')
                elif etype == 'agent':
                    apply_credit_wallet_logic(entity, amount, entity_type='agent', mode='revert')
                elif etype == 'partner':
                    apply_credit_wallet_logic(entity, amount, entity_type='partner', mode='revert')
            
            if extra.get("credited_entity"):
                # Reverse credit: deduct the credited amount
                if etype == 'customer':
                    apply_credit_wallet_logic(entity, amount, entity_type='customer', mode='deduct')
                elif etype == 'agent':
                    apply_credit_wallet_logic(entity, amount, entity_type='agent', mode='deduct')
                elif etype == 'partner':
                    apply_credit_wallet_logic(entity, amount, entity_type='partner', mode='deduct')
            
            db.session.add(entity)

        if extra.get("company_adjusted"):
            # Reverse company adjustment
            direction = 'out' if ttype == 'payment' else 'in'
            log_company(mode, direction)

    elif ttype == 'wallet_transfer':
        from_entity = get_entity(extra.get('from_entity_type'), extra.get('from_entity_id'))
        to_entity = get_entity(extra.get('to_entity_type'), extra.get('to_entity_id'))
        
        if to_entity:
            apply_credit_wallet_logic(to_entity, amount, extra.get('to_entity_type'), mode='deduct')
            db.session.add(to_entity)
        if from_entity:
            apply_credit_wallet_logic(from_entity, amount, extra.get('from_entity_type'), mode='revert')
            db.session.add(from_entity)
        return
    
    elif ttype == 'refund':
        direction = extra.get('refund_direction')
        f_type = extra.get('from_entity_type')
        f_id = extra.get('from_entity_id')
        t_type = extra.get('to_entity_type')
        t_id = extra.get('to_entity_id')
        f_mode = extra.get('mode_for_from')
        t_mode = extra.get('mode_for_to')

        if direction == 'incoming':  # Entity → Company
            entity = get_entity(f_type, f_id)
            if entity:
                if f_mode == 'wallet':
                    apply_credit_wallet_logic(entity, amount, f_type, mode='revert')
                    db.session.add(entity)
            if f_mode in ['cash', 'online', 'wallet']:  # Adjust company only if company received funds
                log_company(f_mode, direction='in')

        elif direction == 'outgoing':  # Company → Entity
            entity = get_entity(t_type, t_id)
            if entity:
                if t_mode == 'wallet':
                    apply_credit_wallet_logic(entity, amount, t_type, mode='revert')
                    db.session.add(entity)
            if t_mode in ['cash', 'online', 'wallet']:  # Adjust company only if company paid funds
                log_company(t_mode, direction='out')


class TransactionResource(Resource):
    @check_permission()
    def get(self, transaction_type):
        """Get transactions with optional date filtering and exports"""
        if transaction_type not in TRANSACTION_TYPES:
            return {'error': 'Invalid transaction type'}, 400
        
        if request.args.get('mode') == 'form':
            return {'ref_no': generate_ref_no(transaction_type)}, 200
        # Handle exports
        export_format = request.args.get('export')
        if export_format in ['excel', 'pdf']:
            return self.export_transactions(transaction_type, export_format)
        
        # Apply date filtering
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Transaction.query.filter_by(transaction_type=transaction_type)
        
        if start_date and end_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                end = datetime.strptime(end_date, '%Y-%m-%d').date() + timedelta(days=1)
                query = query.filter(Transaction.date >= start, Transaction.date < end)
            except ValueError:
                return {'error': 'Invalid date format. Use YYYY-MM-DD.'}, 400
        
        transactions = query.all()
        return {"transactions": [get_transaction_payload(t) for t in transactions]}, 200

    @check_permission()
    def post(self, transaction_type):
        """Create new transaction"""
        if transaction_type not in TRANSACTION_TYPES:
            return {'error': 'Invalid transaction type'}, 400
        
        data = request.json
        
        try:
            # Validate amount
            amount = data.get('amount')
            if not amount or float(amount) <= 0:
                return {'error': 'Amount must be greater than 0'}, 400
            
            # Handle wallet transfer specifically
            if transaction_type == 'wallet_transfer':
                return self.execute_wallet_transfer(data)
            
            # Handle refund-specific field mapping
            if transaction_type == 'refund':
                direction = data.get('refund_direction')
                if not direction:
                    return {'error': 'Refund direction is required'}, 400
                
                data['entity_type'] = data.get(
                    'from_entity_type' if direction == 'incoming' else 'to_entity_type'
                )
                data['entity_id'] = None if data['entity_type'] == 'others' else data.get(
                    'from_entity_id' if direction == 'incoming' else 'to_entity_id'
                )
                data['mode'] = data.get(
                    'mode_for_to' if direction == 'incoming' and data['entity_type'] == 'others' 
                    else 'mode_for_from'
                )
            
            # Validate entity ID for non-others
            if data.get('entity_type') != 'others' and not data.get('entity_id'):
                return {'error': f"Entity ID is required for {data.get('entity_type')}"}, 400
            
            # Create transaction
            t = Transaction(
                ref_no=generate_ref_no(transaction_type),
                entity_type=data.get('entity_type'),
                entity_id=data.get('entity_id'),
                transaction_type=transaction_type,
                pay_type='refund' if transaction_type == 'refund' else data.get('pay_type'),
                mode=data.get('mode'),
                amount=float(amount),
                date=parse_transaction_date(data.get('transaction_date')),
                description=data.get('description'),
                particular_id=data.get('particular_id'),
                updated_by=getattr(g, 'username', 'system')
            )
            
            # Set extra data with proper null handling
            t.extra_data = {
                k: (None if v == '' else v) for k, v in {
                    'refund_direction': data.get('refund_direction'),
                    'deduct_from_account': data.get('deduct_from_account'),
                    'credit_to_account': data.get('credit_to_account'),
                    'from_entity_type': data.get('from_entity_type'),
                    'from_entity_id': None if data.get('from_entity_type') == 'others' else data.get('from_entity_id'),
                    'to_entity_type': data.get('to_entity_type'),
                    'to_entity_id': None if data.get('to_entity_type') == 'others' else data.get('to_entity_id'),
                    'mode_for_from': data.get('mode_for_from'),
                    'mode_for_to': data.get('mode_for_to'),
                }.items()
            }
            
            # Update wallets and company accounts
            update_wallet_and_company(t)
            
            db.session.add(t)
            db.session.commit()
            
            return {
                'message': f'{transaction_type.capitalize()} created successfully',
                'transaction': get_transaction_payload(t)
            }, 201
        
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 400

    @check_permission()
    def put(self, transaction_id):
        """Update existing transaction"""
        t = Transaction.query.get(transaction_id)
        if not t:
            return {'error': 'Transaction not found'}, 404

        data = request.json

        try:
            # Validate amount
            amount = data.get('amount')
            if not amount or float(amount) <= 0:
                return {'error': 'Amount must be greater than 0'}, 400

            # Track changes
            amount_changed = float(amount) != t.amount
            entities_changed = False
            mode_changed = False

            if t.transaction_type == 'wallet_transfer':
                entities_changed = (
                    data.get('from_entity_type') != t.extra_data.get('from_entity_type') or
                    data.get('from_entity_id') != t.extra_data.get('from_entity_id') or
                    data.get('to_entity_type') != t.extra_data.get('to_entity_type') or
                    data.get('to_entity_id') != t.extra_data.get('to_entity_id')
                )

            elif t.transaction_type == 'refund':
                old_from_mode = t.extra_data.get('mode_for_from')
                old_to_mode = t.extra_data.get('mode_for_to')
                new_from_mode = data.get('mode_for_from')
                new_to_mode = data.get('mode_for_to')
                mode_changed = (old_from_mode != new_from_mode or old_to_mode != new_to_mode)

            # Revert previous effects if anything relevant changed
            if amount_changed or entities_changed or mode_changed:
                revert_wallet_and_company(t)
            if 'company_adjusted' in t.extra_data:
                t.extra_data.pop('company_adjusted')
            if 'credited_entity' in t.extra_data:
                t.extra_data.pop('credited_entity')
            if 'debited_entity' in t.extra_data:
                t.extra_data.pop('debited_entity')

            # Update common fields
            t.amount = float(amount)
            t.description = data.get('description')
            t.particular_id = data.get('particular_id')
            t.date = parse_transaction_date(data.get('transaction_date'))
            t.updated_by = getattr(g, 'username', 'system')

            # Wallet Transfer update
            if t.transaction_type == 'wallet_transfer':
                t.extra_data = {
                    'from_entity_type': data.get('from_entity_type'),
                    'from_entity_id': data.get('from_entity_id'),
                    'to_entity_type': data.get('to_entity_type'),
                    'to_entity_id': data.get('to_entity_id')
                }

            # Refund update
            elif t.transaction_type == 'refund':
                direction = data.get('refund_direction')
                if not direction:
                    return {'error': 'Refund direction is required'}, 400

                t.extra_data = {
                    'refund_direction': direction,
                    'deduct_from_account': data.get('deduct_from_account'),
                    'credit_to_account': data.get('credit_to_account'),
                    'from_entity_type': data.get('from_entity_type'),
                    'from_entity_id': None if data.get('from_entity_type') == 'others' else data.get('from_entity_id'),
                    'to_entity_type': data.get('to_entity_type'),
                    'to_entity_id': None if data.get('to_entity_type') == 'others' else data.get('to_entity_id'),
                    'mode_for_from': data.get('mode_for_from'),
                    'mode_for_to': data.get('mode_for_to'),
                }

                # Set entity_type and entity_id for refund view
                t.entity_type = data.get('from_entity_type' if direction == 'incoming' else 'to_entity_type')
                t.entity_id = None if t.entity_type == 'others' else data.get(
                    'from_entity_id' if direction == 'incoming' else 'to_entity_id'
                )

                # Set mode depending on direction
                t.mode = data.get(
                    'mode_for_to' if direction == 'incoming' and t.entity_type == 'others'
                    else 'mode_for_from'
                )

            # Payment/Receipt update
            else:
                t.entity_type = data.get('entity_type')
                t.entity_id = data.get('entity_id')
                t.pay_type = data.get('pay_type')
                t.mode = data.get('mode')

            # Re-apply updated transaction logic
            if amount_changed or entities_changed or mode_changed:
                if t.transaction_type == 'wallet_transfer':
                    process_wallet_transfer(t)
                else:
                    update_wallet_and_company(t)

            db.session.commit()
            return {'message': 'Transaction updated'}, 200

        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 400


    @check_permission()
    def delete(self, transaction_id):
        t = Transaction.query.get(transaction_id)
        if not t:
            return {'error': 'Transaction not found'}, 404

        try:
            revert_wallet_and_company(t)
            db.session.delete(t)
            db.session.commit()
            return {'message': 'Transaction deleted and balances reverted'}, 200
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 400

    def execute_wallet_transfer(self, data):
        """Create a wallet transfer transaction between entities"""
        required = ['from_entity_type', 'from_entity_id', 'to_entity_type', 'to_entity_id', 'amount']
        if not all(data.get(field) for field in required):
            return {'error': 'Missing required fields for wallet transfer'}, 400

        t = Transaction(
            ref_no=generate_ref_no('wallet_transfer'),
            entity_type='wallet_transfer',
            entity_id=None,
            transaction_type='wallet_transfer',
            pay_type='wallet_transfer',
            mode='wallet',
            amount=float(data['amount']),
            date=parse_transaction_date(data.get('transaction_date', datetime.now())),
            description=data.get('description', ''),
            updated_by=getattr(g, 'username', 'system'),
            particular_id=data.get('particular_id'),
            extra_data={
                'from_entity_type': data['from_entity_type'],
                'from_entity_id': data['from_entity_id'],
                'to_entity_type': data['to_entity_type'],
                'to_entity_id': data['to_entity_id']
            }
        )
        
        process_wallet_transfer(t)
        db.session.add(t)
        db.session.commit()
        
        return {
            'message': 'Wallet transfer successful',
            'transaction': get_transaction_payload(t)
        }, 201


    def export_transactions(self, transaction_type, format_type):
        """Export transactions to Excel or PDF"""
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Transaction.query.filter_by(transaction_type=transaction_type)
        
        if start_date and end_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                end = datetime.strptime(end_date, '%Y-%m-%d').date() + timedelta(days=1)
                query = query.filter(Transaction.date >= start, Transaction.date < end)
            except ValueError:
                return {'error': 'Invalid date format. Use YYYY-MM-DD.'}, 400
        
        transactions = query.all()
        data = [self._format_transaction_for_export(t) for t in transactions]
        
        if format_type == 'excel':
            return self.export_excel(data, transaction_type)
        elif format_type == 'pdf':
            return self.export_pdf(data, transaction_type)
        else:
            return {'error': 'Invalid export format'}, 400

    def _format_transaction_for_export(self, transaction):
        base_data = {
            "Reference No": transaction.ref_no,
            "Date": transaction.date.strftime('%Y-%m-%d') if transaction.date else '',
        }
        
        # Add direction for refunds
        if transaction.transaction_type == 'refund':
            direction = transaction.extra_data.get('refund_direction', '')
            base_data["Refund Direction"] = direction.capitalize()
        
        # Add entity info only for non-wallet transfers
        if transaction.transaction_type != 'wallet_transfer':
            base_data.update({
                "Entity Type": transaction.entity_type.capitalize() if transaction.entity_type else '',
                "Entity Name": get_entity_name(transaction.entity_type, transaction.entity_id),
            })
        
        # Add wallet transfer specific fields
        if transaction.transaction_type == 'wallet_transfer':
            base_data.update({
                "From Entity": transaction.extra_data.get('from_entity_name', ''),
                "To Entity": transaction.extra_data.get('to_entity_name', ''),
                "Transfer Direction": f"{transaction.extra_data.get('from_entity_type', '').capitalize()} → {transaction.extra_data.get('to_entity_type', '').capitalize()}"
            })
        
        # Common fields
        base_data.update({
            "Particular": get_particular_name(transaction.particular_id),
            "Payment Type": transaction.pay_type.replace('_', ' ').title() if transaction.pay_type else '',
            "Mode": transaction.mode.capitalize() if transaction.mode else '',
            "Amount": transaction.amount,
            "Description": transaction.description,
        })
        
        return base_data

    def export_excel(self, data, transaction_type):
        try:          
            if not data:
                return {'error': 'No data to export'}, 404
                
            df = pd.DataFrame(data)
            
            output = BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                # Create valid sheet name
                sheet_name = transaction_type
                # Remove invalid characters
                sheet_name = re.sub(r'[\\/*?:[\]]', '', sheet_name)
                # Truncate if too long
                if len(sheet_name) > 31:
                    sheet_name = sheet_name[:31]
                
                df.to_excel(writer, sheet_name=sheet_name, index=False)
                
                workbook = writer.book
                worksheet = writer.sheets[sheet_name]  # Use dynamic sheet name
                
                header_format = workbook.add_format({
                    'bold': True, 
                    'border': 1,
                    'bg_color': '#4472C4',
                    'font_color': 'white'
                })
                
                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(0, col_num, value, header_format)
                
                # Auto-adjust column widths
                for idx, col in enumerate(df.columns):
                    max_len = max(
                        df[col].astype(str).map(len).max(),
                        len(col)
                    ) + 2
                    worksheet.set_column(idx, idx, max_len)
                    
            output.seek(0)
            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f'{transaction_type}_transactions_{datetime.now().strftime("%Y%m%d")}.xlsx'
            )
        except Exception as e:
            return {'error': f'Excel export failed: {str(e)}'}, 500

    def export_pdf(self, data, transaction_type):
        try:
            pdf = FPDF(orientation='L', unit='mm', format='A4')
            pdf.add_page()
            pdf.set_auto_page_break(auto=True, margin=15)

            pdf.set_font("Arial", 'B', 16)
            pdf.cell(0, 10, f"{transaction_type.replace('_', ' ').title()} Transactions", 0, 1, 'C')

            start_date = request.args.get('start_date', '')
            end_date = request.args.get('end_date', '')
            if start_date or end_date:
                pdf.set_font("Arial", size=12)
                pdf.cell(0, 8, f"Date Range: {start_date} to {end_date}", 0, 1, 'C')

            if not data:
                pdf.cell(0, 10, "No data available", 0, 1, 'C')
                return self._empty_pdf_response()

            headers = list(data[0].keys())
            printable_width = 270  # A4 landscape printable width with margins
            col_count = len(headers)
            col_width = printable_width / col_count

            # Step 1: wrap header text
            pdf.set_font('Arial', 'B', 9)
            header_lines = []
            max_lines = 1

            for header in headers:
                words = header.split()
                lines = []
                current_line = ''
                for word in words:
                    test_line = f"{current_line} {word}".strip()
                    if pdf.get_string_width(test_line) <= col_width - 2:
                        current_line = test_line
                    else:
                        lines.append(current_line)
                        current_line = word
                if current_line:
                    lines.append(current_line)
                header_lines.append(lines)
                max_lines = max(max_lines, len(lines))

            header_height = max_lines * 5

            # Step 2: render header box first
            pdf.set_fill_color(70, 130, 180)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font('Arial', 'B', 9)
            y_start = pdf.get_y()
            x_start = pdf.get_x()

            for i, lines in enumerate(header_lines):
                x = x_start + i * col_width
                pdf.set_xy(x, y_start)
                pdf.multi_cell(col_width, header_height, '', border=1, fill=True)

            # Step 3: render each line of header text manually
            for line_no in range(max_lines):
                x = x_start
                for i, lines in enumerate(header_lines):
                    text = lines[line_no] if line_no < len(lines) else ''
                    pdf.set_xy(x, y_start + line_no * 5 + ((header_height - len(lines) * 5) / 2))
                    pdf.cell(col_width, 5, text, 0, 0, 'C')
                    x += col_width
                pdf.ln(0)

            pdf.set_y(y_start + header_height)

            # Step 4: render data rows
            pdf.set_fill_color(255, 255, 255)
            pdf.set_text_color(0, 0, 0)
            pdf.set_font('Arial', '', 9)

            for row in data:
                for i, key in enumerate(headers):
                    value = str(row.get(key, '')).replace('→', '->')
                    if len(value) > 30:
                        value = value[:27] + '...'
                    pdf.cell(col_width, 8, value, 1, 0, 'C')
                pdf.ln()

            # Footer
            pdf.set_y(-15)
            pdf.set_font('Arial', 'I', 8)
            pdf.cell(0, 10, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}", 0, 0, 'C')

            output = BytesIO()
            output.write(pdf.output(dest='S').encode('latin1'))
            output.seek(0)

            return send_file(
                output,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f'{transaction_type}_transactions_{datetime.now().strftime("%Y%m%d")}.pdf'
            )

        except Exception as e:
            return {'error': f'PDF export failed: {str(e)}'}, 500

class CompanyBalanceResource(Resource):
    @check_permission()
    def get(self, mode):
        last = CompanyAccountBalance.query.filter_by(mode=mode).order_by(CompanyAccountBalance.id.desc()).first()
        balance = last.balance if last else 0.0
        return {"mode": mode, "balance": balance}, 200
