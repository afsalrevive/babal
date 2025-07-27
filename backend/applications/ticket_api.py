# applications/ticket_api.py
from flask import request, abort, g
from flask_restful import Resource
from applications.utils import check_permission
from applications.model import db, Customer, Agent, Ticket, CompanyAccountBalance, Particular, TravelLocation, Passenger
from datetime import datetime, timedelta
from flask import send_file
from fpdf import FPDF
from io import BytesIO
import pandas as pd

class TicketResource(Resource):
    def __init__(self, **kwargs):
        super().__init__()

    @check_permission()
    def get(self):
        export_format = request.args.get('export')
        if export_format in ['excel', 'pdf']:
            return self.export_tickets(export_format)
        
        status = request.args.get('status', 'booked')
        start_date, end_date = self._parse_date_range()
        
        # Add 1 day to end_date to include the entire day
        end_date_plus = end_date + timedelta(days=1)
        
        query = Ticket.query.filter(
            Ticket.date >= start_date,
            Ticket.date < end_date_plus
        )
        
        if status != 'all':
            query = query.filter_by(status=status)
            
        tickets = query.all()
        
        return [self._format_ticket(t) for t in tickets]

    @check_permission()
    def post(self, action=None):
        action = (action or request.args.get('action', '')).lower().strip()
        return self.cancel_ticket() if action == 'cancel' else self.book_ticket()

    @check_permission()
    def patch(self):
        data = request.json
        if not (ticket_id := data.get('id')):
            abort(400, "Missing ticket ID")

        ticket = Ticket.query.get(ticket_id)
        if not ticket:
            abort(404, "Ticket not found")

        if ticket.status == 'cancelled':
            return self._update_cancelled_ticket(ticket, data)
        else:
            return self._update_active_ticket(ticket, data)

    @check_permission()
    def delete(self):
        if not (ticket_id := request.args.get('id')):
            abort(400, "Missing ticket ID")

        ticket = Ticket.query.get(ticket_id)
        if not ticket:
            abort(404, "Ticket not found")

        updated_by = getattr(g, 'username', 'system')
        ticket.updated_by = updated_by
        ticket.updated_at = datetime.now()
        db.session.add(ticket)

        try:
            if ticket.status == 'cancelled':
                return self._delete_cancelled_ticket(ticket)
            else:
                return self._delete_active_ticket(ticket)
        except Exception as e:
            db.session.rollback()
            abort(500, f"Deletion failed: {str(e)}")

    # ===== PRIVATE HELPER METHODS =====
    def _parse_date_range(self):
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to last 7 days if no date range provided
        if not start_date or not end_date:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=7)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        return start_date, end_date

    def _format_ticket(self, ticket):
        return {
            'id': ticket.id,
            'ref_no': ticket.ref_no,
            'customer_id': ticket.customer_id,
            'customer_name': Customer.query.get(ticket.customer_id).name if ticket.customer_id else None,
            'agent_id': ticket.agent_id,
            'agent_name': Agent.query.get(ticket.agent_id).name if ticket.agent_id else None,
            'particular_id': ticket.particular_id,
            'travel_location_id': ticket.travel_location_id,
            'passenger_id': ticket.passenger_id,
            'customer_charge': ticket.customer_charge,
            'agent_paid': ticket.agent_paid,
            'profit': ticket.profit,
            'status': ticket.status,
            'date': ticket.date.isoformat() if ticket.date else None,
            'customer_payment_mode': ticket.customer_payment_mode,
            'agent_payment_mode': ticket.agent_payment_mode,
            'customer_refund_amount': ticket.customer_refund_amount,
            'customer_refund_mode': ticket.customer_refund_mode,
            'agent_recovery_amount': ticket.agent_recovery_amount,
            'agent_recovery_mode': ticket.agent_recovery_mode,
            'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
            'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,   
            'updated_by': ticket.updated_by,
        }

    def _update_cancelled_ticket(self, ticket, data):
        """Update refund/recovery amounts for a cancelled ticket"""
        # Get new values from request
        new_customer_refund = float(data.get('customer_refund_amount', ticket.customer_refund_amount))
        new_customer_mode = data.get('customer_refund_mode', ticket.customer_refund_mode)
        new_agent_recovery = float(data.get('agent_recovery_amount', ticket.agent_recovery_amount))
        new_agent_mode = data.get('agent_recovery_mode', ticket.agent_recovery_mode)

        # Validate amounts
        if new_customer_refund > ticket.customer_charge:
            abort(400, "Refund amount cannot exceed original ticket charge")
        if ticket.agent_id and new_agent_recovery > ticket.agent_paid:
            abort(400, "Recovery amount cannot exceed original agent payment")

        try:
            # Calculate the net change needed
            customer_net_change = new_customer_refund - ticket.customer_refund_amount
            agent_net_change = new_agent_recovery - ticket.agent_recovery_amount
            
            # Apply changes to customer
            if customer_net_change != 0:
                self._adjust_customer_balance(
                    ticket.customer_id, 
                    customer_net_change, 
                    new_customer_mode,
                    f"Adjustment for Ticket {ticket.id} refund update",
                    ticket_ref=ticket.ref_no
                )
            
            # Apply changes to agent
            if agent_net_change != 0 and ticket.agent_id:
                self._adjust_agent_balance(
                    ticket.agent_id, 
                    agent_net_change,
                    new_agent_mode,
                    f"Adjustment for Ticket {ticket.id} recovery update",
                    ticket_ref=ticket.ref_no
                )
            
            # Update ticket with new values
            ticket.customer_refund_amount = new_customer_refund
            ticket.customer_refund_mode = new_customer_mode
            ticket.agent_recovery_amount = new_agent_recovery
            ticket.agent_recovery_mode = new_agent_mode
            ticket.updated_by = getattr(g, 'username', 'system')
            ticket.updated_at = datetime.now()
            
            db.session.commit()
            return {"message": "Cancelled ticket updated successfully"}
        except Exception as e:
            db.session.rollback()
            abort(500, f"Failed to update cancelled ticket: {str(e)}")

    def _update_active_ticket(self, ticket, data):
        """Update an active (booked) ticket"""
        updated_by = getattr(g, 'username', 'system')
        updates = {
            'travel_location_id': data.get('travel_location_id', ticket.travel_location_id),
            'passenger_id': data.get('passenger_id', ticket.passenger_id),
            'particular_id': data.get('particular_id', ticket.particular_id),
            'ref_no': data.get('ref_no', ticket.ref_no),
            'customer_charge': float(data.get('customer_charge', ticket.customer_charge)),
            'agent_paid': float(data.get('agent_paid', ticket.agent_paid)),
            'customer_payment_mode': data.get('customer_payment_mode', ticket.customer_payment_mode),
            'agent_payment_mode': data.get('agent_payment_mode', ticket.agent_payment_mode),
            'updated_by': updated_by,
            'updated_at': datetime.now()
        }

        # Calculate new profit
        updates['profit'] = updates['customer_charge'] - updates['agent_paid']

        try:
            # Reverse previous payments
            self._reverse_payments(ticket)

            # Apply updates
            for key, value in updates.items():
                setattr(ticket, key, value)

            # Process new payments
            self._process_payments(ticket, 'update')

            db.session.commit()
            return {"message": "Ticket updated successfully"}
        except Exception as e:
            db.session.rollback()
            abort(500, f"Update failed: {str(e)}")

    def _delete_cancelled_ticket(self, ticket):
        """Delete a cancelled ticket and reverse transactions"""
        # Calculate the net effect of the ticket
        customer_net_effect = ticket.customer_charge - ticket.customer_refund_amount
        agent_net_effect = ticket.agent_paid - ticket.agent_recovery_amount
        
        # Reverse net effect
        self._reverse_net_effect(ticket, customer_net_effect, agent_net_effect)
        
        # Delete the ticket
        db.session.delete(ticket)
        db.session.commit()
        return {"message": "Cancelled ticket deleted with full transaction reversal"}

    def _delete_active_ticket(self, ticket):
        """Delete an active (booked) ticket"""
        self._reverse_payments(ticket)
        db.session.delete(ticket)
        db.session.commit()
        return {"message": "Ticket deleted successfully"}

    def _reverse_net_effect(self, ticket, customer_net_effect, agent_net_effect):
        """Reverse the net financial effect of the ticket"""
        # Reverse customer net effect
        if customer_net_effect != 0:
            self._adjust_customer_balance(
                ticket.customer_id, 
                customer_net_effect,  
                ticket.customer_refund_mode,
                f"Reversal for Ticket {ticket.id} deletion",
                ticket_ref=ticket.ref_no
            )
        
        # Reverse agent net effect
        if agent_net_effect != 0 and ticket.agent_id:
            self._adjust_agent_balance(
                ticket.agent_id, 
                agent_net_effect, 
                ticket.agent_recovery_mode,
                f"Reversal for Ticket {ticket.id} deletion",
                ticket_ref=ticket.ref_no
            )

    # Update helper methods to handle references
    def _adjust_customer_balance(self, customer_id, amount, mode, description, ticket_ref=None):
        """Adjust customer balance based on mode"""
        if customer := Customer.query.get(customer_id):
            if mode == 'wallet':
                customer.wallet_balance += amount
            else:
                self._update_company_account(
                    mode,
                    -amount,
                    'adjustment',
                    description,
                    ref_no=ticket_ref  # Use ticket reference
                )

    def _adjust_agent_balance(self, agent_id, amount, mode, description, ticket_ref=None):
        """Adjust agent balance based on mode"""
        if agent := Agent.query.get(agent_id):
            if mode == 'wallet':
                agent.wallet_balance += amount
            else:
                self._update_company_account(
                    mode,
                    amount,
                    'adjustment',
                    description,
                    ref_no=ticket_ref  # Use ticket reference
                )

    def _update_company_account(self, mode, amount, action, description, ref_no=None):
        """Create a new CompanyAccountBalance entry"""
        if mode not in ['cash', 'online']:
            return
            
        # Get last balance
        last_balance = 0
        if last_entry := CompanyAccountBalance.query.filter_by(mode=mode)\
                            .order_by(CompanyAccountBalance.id.desc())\
                            .first():
            last_balance = last_entry.balance

        # Create new entry
        entry = CompanyAccountBalance(
            mode=mode,
            credited_amount=amount,
            credited_date=datetime.now(),
            balance=last_balance + amount,
            ref_no=ref_no,  # Use provided reference
            transaction_type='ticket',
            action=action,
            updated_by=getattr(g, 'username', 'system')
        )
        db.session.add(entry)

    # ===== TICKET PROCESSING METHODS =====
    def book_ticket(self):
        data = request.json
        required = ['customer_id', 'travel_location_id', 'customer_charge', 'customer_payment_mode']
        if not all(field in data for field in required):
            abort(400, "Missing required fields")

        # Parse and validate date
        ticket_date = self._parse_ticket_date(data.get('date'))
        
        try:
            # Create ticket
            ticket = Ticket(
                customer_id=data['customer_id'],
                agent_id=data.get('agent_id'),
                travel_location_id=data['travel_location_id'],
                passenger_id=data.get('passenger_id'),
                ref_no=data.get('ref_no') or self._generate_reference_number(),
                status='booked',
                customer_charge=data['customer_charge'],
                agent_paid=data.get('agent_paid', 0),
                profit=data['customer_charge'] - data.get('agent_paid', 0),
                customer_payment_mode=data['customer_payment_mode'].lower().strip(),
                agent_payment_mode=data.get('agent_payment_mode', 'cash').lower().strip(),
                updated_by=getattr(g, 'username', 'system'),
                date=ticket_date,
                particular_id=data.get('particular_id')
            )
            db.session.add(ticket)
            db.session.flush()  # Get ticket ID

            # Process payments
            self._process_payments(ticket, 'book')

            db.session.commit()
            return {"message": "Ticket booked", "id": ticket.id, "ref_no": ticket.ref_no}, 201
        except Exception as e:
            db.session.rollback()
            abort(500, f"Booking failed: {str(e)}")

    def _parse_ticket_date(self, date_str):
        """Parse and validate ticket date"""
        if date_str:
            try:
                return datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                abort(400, "Invalid date format. Use YYYY-MM-DD.")
        return datetime.now()

    def _generate_reference_number(self):
        current_year = datetime.now().year
        max_ref = db.session.query(db.func.max(Ticket.ref_no)).filter(
            Ticket.ref_no.like(f"{current_year}/T/%")
        ).scalar()
        last_num = int(max_ref.split('/')[-1]) if max_ref and '/' in max_ref else 0
        return f"{current_year}/T/{last_num + 1:05d}"

    def cancel_ticket(self):
        data = request.json
        if not (ticket_id := data.get('ticket_id')):
            abort(400, "Missing ticket ID")

        ticket = Ticket.query.get(ticket_id)
        if not ticket:
            abort(404, "Ticket not found")
        if ticket.status == 'cancelled':
            abort(400, "Ticket already cancelled")

        # Get refund details
        refund_amt = float(data.get('customer_refund_amount', 0))
        refund_mode = data.get('customer_refund_mode', 'cash').lower().strip()
        recovery_amt = float(data.get('agent_recovery_amount', 0))
        recovery_mode = data.get('agent_recovery_mode', 'cash').lower().strip()

        try:
            # Process refunds
            self._process_refunds(ticket, refund_amt, refund_mode, recovery_amt, recovery_mode)

            # Update ticket status
            ticket.status = 'cancelled'
            ticket.updated_at = datetime.now()
            ticket.updated_by = getattr(g, 'username', 'system')
            
            # Update company accounts
            self._update_ticket_financials(ticket, 'cancel')
            
            db.session.commit()
            return {"message": "Ticket cancelled"}
        except Exception as e:
            db.session.rollback()
            abort(500, f"Cancellation failed: {str(e)}")

    def _process_payments(self, ticket, action):
        """Process customer and agent payments for booking/updating"""
        # Customer payment
        if customer := Customer.query.get(ticket.customer_id):
            self._process_entity_payment(
                entity=customer,
                amount=ticket.customer_charge,
                mode=ticket.customer_payment_mode,
                is_customer=True
            )
        
        # Agent payment
        if ticket.agent_id and ticket.agent_paid > 0:
            if agent := Agent.query.get(ticket.agent_id):
                self._process_entity_payment(
                    entity=agent,
                    amount=ticket.agent_paid,
                    mode=ticket.agent_payment_mode,
                    is_customer=False
                )
        
        # Update company accounts
        self._update_ticket_financials(ticket, action)

    def _process_entity_payment(self, entity, amount, mode, is_customer):
        """Process payment for customer or agent"""
        mode = mode.lower().strip()
        
        if mode == 'wallet':
            self._process_wallet_payment(entity, amount, is_customer)
        elif mode in ['cash', 'online']:
            # Handled in _update_ticket_financials
            pass
        else:
            raise Exception(f"Invalid payment mode: {mode}")

    def _process_wallet_payment(self, entity, amount, is_customer):
        """Handle wallet-based payments with credit fallback"""
        if is_customer:
            # Customer payment logic
            if entity.wallet_balance >= amount:
                entity.wallet_balance -= amount
            else:
                remaining = amount - entity.wallet_balance
                entity.wallet_balance = 0
                if remaining <= (entity.credit_limit - entity.credit_used):
                    entity.credit_used += remaining
                else:
                    raise Exception("Insufficient customer credit")
        else:
            # Agent payment logic
            if entity.wallet_balance >= amount:
                entity.wallet_balance -= amount
            else:
                remaining = amount - entity.wallet_balance
                entity.wallet_balance = 0
                if remaining <= entity.credit_balance:
                    entity.credit_balance -= remaining
                else:
                    raise Exception("Insufficient agent credit")

    def _reverse_payments(self, ticket):
        """Reverse payments for a ticket"""
        self._reverse_customer_payment(ticket)
        self._reverse_agent_payment(ticket)

    def _reverse_customer_payment(self, ticket):
        """Reverse customer payment"""
        if not (customer := Customer.query.get(ticket.customer_id)):
            return

        mode = (ticket.customer_payment_mode or '').lower().strip()
        amount = ticket.customer_charge

        if mode == 'wallet':
            # Refund credit first
            refund_to_credit = min(amount, customer.credit_used)
            customer.credit_used -= refund_to_credit
            
            # Refund remainder to wallet
            refund_to_wallet = amount - refund_to_credit
            customer.wallet_balance += refund_to_wallet

        elif mode in ['cash', 'online']:
            self._update_company_account(
                mode, 
                -amount, 
                'reversal', 
                f"Reversal for Ticket {ticket.id}",
                ref_no=ticket.ref_no
            )

    def _reverse_agent_payment(self, ticket):
        """Reverse agent payment"""
        if not (ticket.agent_paid > 0 and ticket.agent_id):
            return
            
        if not (agent := Agent.query.get(ticket.agent_id)):
            return

        mode = (ticket.agent_payment_mode or '').lower().strip()
        amount = ticket.agent_paid

        if mode == 'wallet':
            # Restore credit
            credit_deficit = agent.credit_limit - agent.credit_balance
            refund_to_credit = min(amount, credit_deficit)
            agent.credit_balance += refund_to_credit
            
            # Refund remainder to wallet
            refund_to_wallet = amount - refund_to_credit
            agent.wallet_balance += refund_to_wallet

        elif mode in ['cash', 'online']:
            self._update_company_account(
                mode, 
                amount, 
                'reversal', 
                f"Reversal for Ticket {ticket.id}",
                ref_no=ticket.ref_no
            )

    def _process_refunds(self, ticket, refund_amt, refund_mode, recovery_amt, recovery_mode):
        """Process refunds during cancellation"""
        # Customer refund
        if refund_amt > 0:
            if customer := Customer.query.get(ticket.customer_id):
                if refund_mode == 'wallet':
                    # Refund to credit first
                    refund_to_credit = min(refund_amt, customer.credit_used)
                    customer.credit_used -= refund_to_credit
                    
                    # Refund remainder to wallet
                    refund_to_wallet = refund_amt - refund_to_credit
                    customer.wallet_balance += refund_to_wallet
                
                ticket.customer_refund_amount = refund_amt
                ticket.customer_refund_mode = refund_mode

        # Agent recovery
        if recovery_amt > 0 and ticket.agent_id:
            if agent := Agent.query.get(ticket.agent_id):
                if recovery_mode == 'wallet':
                    # Restore credit
                    credit_deficit = agent.credit_limit - agent.credit_balance
                    refund_to_credit = min(recovery_amt, credit_deficit)
                    agent.credit_balance += refund_to_credit
                    
                    # Refund remainder to wallet
                    refund_to_wallet = recovery_amt - refund_to_credit
                    agent.wallet_balance += refund_to_wallet
                
                ticket.agent_recovery_amount = recovery_amt
                ticket.agent_recovery_mode = recovery_mode

    def _update_ticket_financials(self, ticket, action):
        """Calculate net cash impact and update company account"""
        net_amount = 0
        
        # Determine cash/online impact
        if action in ['book', 'update']:
            # Customer payment increases company balance
            if ticket.customer_payment_mode in ['cash', 'online']:
                net_amount += ticket.customer_charge
            
            # Agent payment decreases company balance
            if ticket.agent_id and ticket.agent_payment_mode in ['cash', 'online']:
                net_amount -= ticket.agent_paid
        
        elif action == 'cancel':
            # Customer refund decreases company balance
            if ticket.customer_refund_mode in ['cash', 'online']:
                net_amount -= ticket.customer_refund_amount
            
            # Agent recovery increases company balance
            if ticket.agent_id and ticket.agent_recovery_mode in ['cash', 'online']:
                net_amount += ticket.agent_recovery_amount
        
        # Only process if there's an impact
        if net_amount != 0:
            # Determine which account to update
            mode = self._get_account_mode(ticket)
            if mode:
                self._update_company_account(
                    mode, 
                    net_amount, 
                    action, 
                    f"Ticket {ticket.id} {action}",
                    ref_no=ticket.ref_no
                )

    def _get_account_mode(self, ticket):
        """Determine account mode based on payment types"""
        if ticket.customer_payment_mode in ['cash', 'online']:
            return ticket.customer_payment_mode
        if ticket.agent_id and ticket.agent_payment_mode in ['cash', 'online']:
            return ticket.agent_payment_mode
        if ticket.customer_refund_mode in ['cash', 'online']:
            return ticket.customer_refund_mode
        if ticket.agent_id and ticket.agent_recovery_mode in ['cash', 'online']:
            return ticket.agent_recovery_mode
        return None
    def export_tickets(self, format_type):
        status = request.args.get('status', 'booked')
        start_date, end_date = self._parse_date_range()
        end_date_plus = end_date + timedelta(days=1)
        
        query = Ticket.query.filter(
            Ticket.date >= start_date,
            Ticket.date < end_date_plus
        )
        
        if status != 'all':
            query = query.filter_by(status=status)
            
        tickets = query.all()
        data = [self._format_ticket_for_export(t) for t in tickets]
        
        if format_type == 'excel':
            return self.export_excel(data, status)
        elif format_type == 'pdf':
            return self.export_pdf(data, status)
        else:
            abort(400, "Invalid export format")

    def export_excel(self, data, status):
        try:
            import pandas as pd
            from io import BytesIO
            
            # Create DataFrame
            df = pd.DataFrame(data)
            
            if df.empty:
                return "No data to export", 404
                
            # Create Excel file in memory
            output = BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, sheet_name='Tickets', index=False)
                
                # Get workbook and worksheet
                workbook = writer.book
                worksheet = writer.sheets['Tickets']
                
                # Add header formatting
                header_format = workbook.add_format({
                    'bold': True,
                    'text_wrap': True,
                    'border': 1,
                    'bg_color': '#4472C4',
                    'font_color': 'white',
                    'align': 'center',
                    'valign': 'vcenter'
                })
                
                # Apply header formatting
                for col_num, value in enumerate(df.columns.values):
                    worksheet.write(0, col_num, value, header_format)
                
                # Auto-adjust column widths
                for i, col in enumerate(df.columns):
                    max_len = max(
                        df[col].astype(str).map(len).max(),  # Max content length
                        len(str(col))                        # Header length
                    ) + 2  # Add padding
                    # Limit max width to 30 characters
                    max_len = min(max_len, 30) 
                    worksheet.set_column(i, i, max_len)
                
                # Format currency columns
                money_cols = ['Customer Charge', 'Agent Paid', 'Profit']
                if status == 'cancelled':
                    money_cols.extend(['Customer Refund Amount', 'Agent Recovery Amount'])
                
                money_format = workbook.add_format({'num_format': '#,##0.00'})
                
                for col in money_cols:
                    if col in df.columns:
                        col_idx = df.columns.get_loc(col)
                        worksheet.set_column(col_idx, col_idx, 15, money_format)
                
                # Format date columns
                date_cols = ['Date', 'Created At', 'Updated At']
                date_format = workbook.add_format({'num_format': 'yyyy-mm-dd'})
                
                for col in date_cols:
                    if col in df.columns:
                        col_idx = df.columns.get_loc(col)
                        worksheet.set_column(col_idx, col_idx, 15, date_format)
                
                # Add freeze pane and filter
                worksheet.autofilter(0, 0, 0, len(df.columns)-1)
                worksheet.freeze_panes(1, 0)
            
            output.seek(0)
            
            # Send file to client
            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f'{status}_tickets_export_{datetime.now().strftime("%Y%m%d")}.xlsx'
            )
        except Exception as e:
            abort(500, f"Excel export failed: {str(e)}")

    def _format_ticket_for_export(self, ticket):
        """Format ticket data specifically for exports"""
        # Common fields for all tickets
        data = {
            'Reference No': ticket.ref_no,
            'Date': ticket.date.strftime('%Y-%m-%d') if ticket.date else '',
            'Customer': Customer.query.get(ticket.customer_id).name if ticket.customer_id else '',
            'Agent': Agent.query.get(ticket.agent_id).name if ticket.agent_id else '',
            'Particular': Particular.query.get(ticket.particular_id).name if ticket.particular_id else '',
            'Travel Location': TravelLocation.query.get(ticket.travel_location_id).name if ticket.travel_location_id else '',
            'Passenger': Passenger.query.get(ticket.passenger_id).name if ticket.passenger_id else '',
            'Customer Charge': ticket.customer_charge,
            'Agent Paid': ticket.agent_paid,
            'Profit': ticket.profit,
            'Status': ticket.status.capitalize(),
            'Customer Payment Mode': ticket.customer_payment_mode.capitalize(),
            'Agent Payment Mode': ticket.agent_payment_mode.capitalize() if ticket.agent_payment_mode else '',
        }
        
        # Add cancellation-specific fields for cancelled tickets
        if ticket.status == 'cancelled':
            data.update({
                'Customer Refund Amount': ticket.customer_refund_amount,
                'Customer Refund Mode': ticket.customer_refund_mode.capitalize(),
                'Agent Recovery Amount': ticket.agent_recovery_amount,
                'Agent Recovery Mode': ticket.agent_recovery_mode.capitalize() if ticket.agent_recovery_mode else '',
            })
            
        # Add timestamps (only for Excel)
        data.update({
            'Created At': ticket.created_at.strftime('%Y-%m-%d %H:%M'),
            'Updated At': ticket.updated_at.strftime('%Y-%m-%d %H:%M') if ticket.updated_at else '',
            'Updated By': ticket.updated_by
        })
        
        return data

    def export_pdf(self, data, status):
        try:
            # Filter out unwanted columns
            exclude_columns = ['Created At', 'Updated At', 'Updated By']
            if data:
                data = [
                    {k: v for k, v in row.items() if k not in exclude_columns}
                    for row in data
                ]
            
            # PDF settings
            pdf = FPDF(orientation='L', unit='mm', format='A3')
            pdf.add_page()
            pdf.set_font("Arial", size=9)
            
            # Title and date range
            pdf.set_font("Arial", 'B', 16)
            pdf.cell(0, 10, f"Ticket Export Report ({status.capitalize()} Tickets)", 0, 1, 'C')
            pdf.set_font("Arial", size=10)
            start = request.args.get('start_date', '')
            end = request.args.get('end_date', '')
            pdf.cell(0, 8, f"Date Range: {start} to {end}", 0, 1, 'C')
            pdf.ln(5)
            
            # Column headers
            headers = list(data[0].keys()) if data else []
            if not headers:
                pdf.cell(0, 10, "No data available", 0, 1, 'C')
                return self._empty_pdf_response()
                
            # Column width configuration
            available_width = 390
            special_widths = {
                'Reference No': 40, 'Date': 25, 'Customer': 40, 'Agent': 40,
                'Particular': 30, 'Travel Location': 35, 'Passenger': 35,
                'Customer Charge': 25, 'Agent Paid': 25, 'Profit': 20,
                'Status': 20, 'Customer Payment Mode': 25, 'Agent Payment Mode': 25,
                'Customer Refund Amount': 25, 'Customer Refund Mode': 25,
                'Agent Recovery Amount': 25, 'Agent Recovery Mode': 25
            }
            
            # Calculate column widths
            col_widths = {}
            total_width_needed = 0
            for header in headers:
                width = special_widths.get(header, min(max(len(header) * 2.5, 25), 60))
                col_widths[header] = width
                total_width_needed += width
            
            # Scale columns if needed
            if total_width_needed > available_width:
                scale_factor = available_width / total_width_needed
                for col in col_widths:
                    col_widths[col] *= scale_factor
            
            # Calculate max lines for headers
            max_lines = 1
            for header in headers:
                words = header.split()
                line_count, current_line = 1, ""
                for word in words:
                    test_line = f"{current_line} {word}" if current_line else word
                    if pdf.get_string_width(test_line) < col_widths[header] - 2:
                        current_line = test_line
                    else:
                        line_count += 1
                        current_line = word
                max_lines = max(max_lines, line_count)
            
            # Uniform header height
            cell_height = 4 * max_lines
            pdf.set_fill_color(70, 130, 180)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font('', 'B')
            
            # Render header row
            x_start, y_start = pdf.get_x(), pdf.get_y()
            for header in headers:
                width = col_widths[header]
                pdf.set_xy(x_start, y_start)
                pdf.cell(width, cell_height, "", border=1, fill=True, align='C')
                
                # Split text and center vertically
                words = header.split()
                lines, current_line = [], ""
                for word in words:
                    test_line = f"{current_line} {word}" if current_line else word
                    if pdf.get_string_width(test_line) < width - 2:
                        current_line = test_line
                    else:
                        lines.append(current_line)
                        current_line = word
                if current_line:
                    lines.append(current_line)
                
                text_height = 4 * len(lines)
                y_text = y_start + (cell_height - text_height) / 2
                for i, line in enumerate(lines):
                    pdf.set_xy(x_start, y_text + i*4)
                    pdf.cell(width, 4, line, 0, 0, 'C')
                
                x_start += width
            
            pdf.set_y(y_start + cell_height)
            pdf.ln(2)
            
            # Data rows
            pdf.set_fill_color(255, 255, 255)
            pdf.set_text_color(0, 0, 0)
            pdf.set_font('')
            page_break_y = pdf.h - 40  # 40mm from bottom
            
            for row in data:
                # Handle page breaks
                if pdf.get_y() > page_break_y:
                    pdf.add_page(orientation='L')
                    pdf.set_y(30)
                    # Reprint headers
                    x_start, y_start = pdf.get_x(), pdf.get_y()
                    pdf.set_fill_color(70, 130, 180)
                    pdf.set_text_color(255, 255, 255)
                    pdf.set_font('', 'B')
                    for header in headers:
                        width = col_widths[header]
                        pdf.set_xy(x_start, y_start)
                        pdf.cell(width, cell_height, "", border=1, fill=True, align='C')
                        
                        words = header.split()
                        lines, current_line = [], ""
                        for word in words:
                            test_line = f"{current_line} {word}" if current_line else word
                            if pdf.get_string_width(test_line) < width - 2:
                                current_line = test_line
                            else:
                                lines.append(current_line)
                                current_line = word
                        if current_line:
                            lines.append(current_line)
                        
                        text_height = 4 * len(lines)
                        y_text = y_start + (cell_height - text_height) / 2
                        for i, line in enumerate(lines):
                            pdf.set_xy(x_start, y_text + i*4)
                            pdf.cell(width, 4, line, 0, 0, 'C')
                        
                        x_start += width
                    
                    pdf.set_y(y_start + cell_height)
                    pdf.ln(2)
                    pdf.set_fill_color(255, 255, 255)
                    pdf.set_text_color(0, 0, 0)
                    pdf.set_font('')
                
                # Render data row
                x_start = pdf.get_x()
                for header in headers:
                    width = col_widths[header]
                    value = str(row.get(header, ''))
                    if len(value) > 30:
                        value = value[:27] + '...'
                    pdf.cell(width, 8, value, border=1, align='C')
                pdf.ln()
            
            # Summary section
            if data:
                # Define money columns
                money_cols = ['Customer Charge', 'Agent Paid', 'Profit']
                if status == 'cancelled':
                    money_cols.extend(['Customer Refund Amount', 'Agent Recovery Amount'])
                
                # Calculate totals
                totals = {col: 0 for col in money_cols}
                for row in data:
                    for col in money_cols:
                        if col in row:
                            totals[col] += float(row[col] or 0)
                
                # Check if we need a new page for summary
                summary_lines = 1 + len([col for col in money_cols if totals[col] > 0])
                summary_height = 8 * summary_lines
                
                if pdf.get_y() + summary_height > pdf.h - 25:
                    pdf.add_page(orientation='L')
                    pdf.set_y(30)
                
                # Add ticket count
                pdf.set_font('', 'B')
                pdf.cell(0, 8, f"Total Tickets: {len(data)}", 0, 1, 'R')
                
                # Add money totals
                pdf.set_font('', 'B')
                for col in money_cols:
                    if totals[col] > 0:
                        pdf.cell(0, 8, f"Total {col}: {totals[col]:.2f}", 0, 1, 'R')
            
            # FOOTER FIX: Ensure footer is at bottom of last page
            # Check if we need to create a new page for the footer
            footer_height = 10
            if pdf.get_y() > pdf.h - footer_height - 5:  # 5mm buffer
                pdf.add_page(orientation='L')
            
            # Position footer at bottom of current page
            pdf.set_y(pdf.h - footer_height)
            pdf.set_font('Arial', 'I', 8)
            pdf.cell(0, footer_height, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}", 0, 0, 'C')
            
            # Return PDF file
            output = BytesIO()
            output.write(pdf.output(dest='S').encode('latin1'))
            output.seek(0)
            return send_file(
                output,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f'{status}_tickets_export_{datetime.now().strftime("%Y%m%d")}.pdf'
            )
            
        except Exception as e:
            abort(500, f"PDF export failed: {str(e)}")