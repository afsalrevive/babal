# applications/service_api.py
from flask import request, abort, g
from flask_restful import Resource
from applications.utils import check_permission
from applications.model import db, Customer, Particular, Service, CompanyAccountBalance
from datetime import datetime, timedelta
import pandas as pd
from fpdf import FPDF
from io import BytesIO
from flask import send_file

class ServiceResource(Resource):
    def __init__(self, **kwargs):
        super().__init__()

    @check_permission()
    def get(self):
        export_format = request.args.get('export')
        if export_format in ['excel', 'pdf']:
            return self.export_services(export_format)
        
        status = request.args.get('status', 'booked')
        start_date, end_date = self._parse_date_range()
        end_date_plus = end_date + timedelta(days=1)
        
        query = Service.query.filter(
            Service.date >= start_date,
            Service.date < end_date_plus
        )
        
        if status != 'all':
            query = query.filter_by(status=status)
            
        services = query.all()
        return [self._format_service(s) for s in services]

    @check_permission()
    def post(self, action=None):
        action = (action or request.args.get('action', '')).lower().strip()
        return self.cancel_service() if action == 'cancel' else self.book_service()

    @check_permission()
    def patch(self):
        data = request.json
        if not (service_id := data.get('id')):
            abort(400, "Missing service ID")

        service = Service.query.get(service_id)
        if not service:
            abort(404, "Service not found")

        if service.status == 'cancelled':
            return self._update_cancelled_service(service, data)
        else:
            return self._update_active_service(service, data)

    @check_permission()
    def delete(self):
        if not (service_id := request.args.get('id')):
            abort(400, "Missing service ID")

        service = Service.query.get(service_id)
        if not service:
            abort(404, "Service not found")

        updated_by = getattr(g, 'username', 'system')
        service.updated_by = updated_by
        service.updated_at = datetime.now()
        db.session.add(service)

        try:
            if service.status == 'cancelled':
                return self._delete_cancelled_service(service)
            else:
                return self._delete_active_service(service)
        except Exception as e:
            db.session.rollback()
            abort(500, f"Deletion failed: {str(e)}")

    # ===== PRIVATE HELPER METHODS =====
    def _parse_date_range(self):
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=7)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        return start_date, end_date

    def _format_service(self, service):
        return {
            'id': service.id,
            'ref_no': service.ref_no,
            'customer_id': service.customer_id,
            'customer_name': Customer.query.get(service.customer_id).name,
            'particular_id': service.particular_id,
            'particular_name': Particular.query.get(service.particular_id).name if service.particular_id else None,
            'customer_charge': service.customer_charge,
            'status': service.status,
            'date': service.date.isoformat(),
            'customer_payment_mode': service.customer_payment_mode,
            'customer_refund_amount': service.customer_refund_amount,
            'customer_refund_mode': service.customer_refund_mode,
            'created_at': service.created_at.isoformat(),
            'updated_at': service.updated_at.isoformat() if service.updated_at else None,
            'updated_by': service.updated_by
        }

    def _update_cancelled_service(self, service, data):
        new_refund = float(data.get('customer_refund_amount', service.customer_refund_amount))
        new_mode = data.get('customer_refund_mode', service.customer_refund_mode)

        if new_refund > service.customer_charge:
            abort(400, "Refund amount cannot exceed original charge")

        try:
            net_change = new_refund - service.customer_refund_amount
            
            if net_change != 0:
                self._adjust_customer_balance(
                    service.customer_id, 
                    net_change, 
                    new_mode,
                    f"Adjustment for Service {service.id} refund update",
                    service_ref=service.ref_no
                )
            
            service.customer_refund_amount = new_refund
            service.customer_refund_mode = new_mode
            service.updated_by = getattr(g, 'username', 'system')
            service.updated_at = datetime.now()
            
            db.session.commit()
            return {"message": "Cancelled service updated successfully"}
        except Exception as e:
            db.session.rollback()
            abort(500, f"Failed to update cancelled service: {str(e)}")

    def _update_active_service(self, service, data):
        updated_by = getattr(g, 'username', 'system')
        updates = {
            'particular_id': data.get('particular_id', service.particular_id),
            'customer_charge': float(data.get('customer_charge', service.customer_charge)),
            'customer_payment_mode': data.get('customer_payment_mode', service.customer_payment_mode),
            'updated_by': updated_by,
            'updated_at': datetime.now()
        }

        try:
            self._reverse_payment(service)
            
            for key, value in updates.items():
                setattr(service, key, value)
                
            self._process_payment(service)
            
            db.session.commit()
            return {"message": "Service updated successfully"}
        except Exception as e:
            db.session.rollback()
            abort(500, f"Update failed: {str(e)}")

    def _delete_cancelled_service(self, service):
        net_effect = service.customer_charge - service.customer_refund_amount
        
        if net_effect != 0:
            self._adjust_customer_balance(
                service.customer_id, 
                net_effect,  
                service.customer_refund_mode,
                f"Reversal for Service {service.id} deletion",
                service_ref=service.ref_no
            )
        
        db.session.delete(service)
        db.session.commit()
        return {"message": "Cancelled service deleted with transaction reversal"}

    def _delete_active_service(self, service):
        self._reverse_payment(service)
        db.session.delete(service)
        db.session.commit()
        return {"message": "Service deleted successfully"}

    def _adjust_customer_balance(self, customer_id, amount, mode, description, service_ref=None):
        if customer := Customer.query.get(customer_id):
            if mode == 'wallet':
                customer.wallet_balance += amount
            else:
                self._update_company_account(
                    mode,
                    -amount,
                    'adjustment',
                    description,
                    ref_no=service_ref
                )

    def _update_company_account(self, mode, amount, action, description, ref_no=None):
        if mode not in ['cash', 'online']:
            return
            
        last_balance = 0
        if last_entry := CompanyAccountBalance.query.filter_by(mode=mode)\
                            .order_by(CompanyAccountBalance.id.desc())\
                            .first():
            last_balance = last_entry.balance

        entry = CompanyAccountBalance(
            mode=mode,
            credited_amount=amount,
            credited_date=datetime.now(),
            balance=last_balance + amount,
            ref_no=ref_no,
            transaction_type='service',
            action=action,
            updated_by=getattr(g, 'username', 'system')
        )
        db.session.add(entry)

    # ===== SERVICE PROCESSING METHODS =====
    def book_service(self):
        data = request.json
        required = ['customer_id', 'customer_charge', 'customer_payment_mode']
        if not all(field in data for field in required):
            abort(400, "Missing required fields")

        try:
            service = Service(
                customer_id=data['customer_id'],
                particular_id=data.get('particular_id'),
                customer_charge=data['customer_charge'],
                customer_payment_mode=data['customer_payment_mode'],
                ref_no=self._generate_reference_number(),
                updated_by=getattr(g, 'username', 'system')
            )
            db.session.add(service)
            db.session.flush()

            self._process_payment(service)

            db.session.commit()
            return {"message": "Service booked", "id": service.id, "ref_no": service.ref_no}, 201
        except Exception as e:
            db.session.rollback()
            abort(500, f"Booking failed: {str(e)}")

    def _generate_reference_number(self):
        current_year = datetime.now().year
        max_ref = db.session.query(db.func.max(Service.ref_no)).filter(
            Service.ref_no.like(f"{current_year}/S/%")
        ).scalar()
        last_num = int(max_ref.split('/')[-1]) if max_ref and '/' in max_ref else 0
        return f"{current_year}/S/{last_num + 1:05d}"

    def cancel_service(self):
        data = request.json
        if not (service_id := data.get('service_id')):
            abort(400, "Missing service ID")

        service = Service.query.get(service_id)
        if not service:
            abort(404, "Service not found")
        if service.status == 'cancelled':
            abort(400, "Service already cancelled")

        refund_amt = float(data.get('customer_refund_amount', 0))
        refund_mode = data.get('customer_refund_mode', 'cash').lower().strip()

        try:
            # Always deduct full amount from company account
            self._update_company_account(
                service.customer_payment_mode,
                -service.customer_charge,
                'cancel',
                f"Service {service.id} cancellation",
                service.ref_no
            )
            
            # Process any refund if specified
            if refund_amt > 0:
                self._process_refund(service, refund_amt, refund_mode)

            service.status = 'cancelled'
            service.updated_at = datetime.now()
            service.updated_by = getattr(g, 'username', 'system')
            service.customer_refund_amount = refund_amt
            service.customer_refund_mode = refund_mode
            
            db.session.commit()
            return {"message": "Service cancelled"}
        except Exception as e:
            db.session.rollback()
            abort(500, f"Cancellation failed: {str(e)}")

    def _process_payment(self, service):
        if service.customer_payment_mode in ['cash', 'online']:
            self._update_company_account(
                service.customer_payment_mode,
                service.customer_charge,
                'book',
                f"Service {service.id} booking",
                service.ref_no
            )
            
        if customer := Customer.query.get(service.customer_id):
            if service.customer_payment_mode == 'wallet':
                if customer.wallet_balance >= service.customer_charge:
                    customer.wallet_balance -= service.customer_charge
                else:
                    remaining = service.customer_charge - customer.wallet_balance
                    customer.wallet_balance = 0
                    if remaining <= (customer.credit_limit - customer.credit_used):
                        customer.credit_used += remaining
                    else:
                        raise Exception("Insufficient customer credit")

    def _reverse_payment(self, service):
        if service.customer_payment_mode in ['cash', 'online']:
            self._update_company_account(
                service.customer_payment_mode,
                -service.customer_charge,
                'reversal',
                f"Reversal for Service {service.id}",
                service.ref_no
            )
            
        if customer := Customer.query.get(service.customer_id):
            if service.customer_payment_mode == 'wallet':
                refund_to_credit = min(service.customer_charge, customer.credit_used)
                customer.credit_used -= refund_to_credit
                refund_to_wallet = service.customer_charge - refund_to_credit
                customer.wallet_balance += refund_to_wallet

    def _process_refund(self, service, refund_amt, refund_mode):
        if refund_amt > 0:
            if customer := Customer.query.get(service.customer_id):
                if refund_mode == 'wallet':
                    # Existing wallet refund logic
                    refund_to_credit = min(refund_amt, customer.credit_used)
                    customer.credit_used -= refund_to_credit
                    refund_to_wallet = refund_amt - refund_to_credit
                    customer.wallet_balance += refund_to_wallet
                else:  # cash or online refund
                    # Deduct from company account for cash/online refund
                    self._update_company_account(
                        refund_mode,
                        -refund_amt,
                        'refund',
                        f"Refund for Service {service.id}",
                        service.ref_no
                    )
                    
                service.customer_refund_amount = refund_amt
                service.customer_refund_mode = refund_mode

    # Export methods similar to TicketResource
    # (Would include export_services, export_excel, export_pdf, etc.)
    # Implementation would be nearly identical to TicketResource versions