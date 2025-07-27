# applications/dashboard_resources.py
from flask_restful import Resource
from flask import jsonify, request, send_file
from datetime import datetime, timedelta
from sqlalchemy import func, case, and_, or_
from io import BytesIO
from fpdf import FPDF

from .model import db, CompanyAccountBalance, Ticket, Transaction, Service, Particular, Agent, Customer, Partner

# from .utils import check_permission # Adjust import path as needed

# Helper function to get dashboard metrics data (reused by API and PDF export)
def _get_dashboard_metrics_data(start_date_str, end_date_str):
    if not start_date_str or not end_date_str:
        raise ValueError("start_date and end_date are required.")

    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    end_date_exclusive = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)

    # Base query filter for date range
    ticket_date_filter = and_(Ticket.date >= start_date, Ticket.date < end_date_exclusive)
    transaction_date_filter = and_(Transaction.date >= start_date, Transaction.date < end_date_exclusive)
    service_date_filter = and_(Service.date >= start_date, Service.date < end_date_exclusive)

    # --- Fetch current company balances up to the end of the selected end_date_str ---
    balance_as_of_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1) - timedelta(microseconds=1)

    cash_balance_obj = CompanyAccountBalance.query.filter_by(mode='cash') \
                                            .filter(CompanyAccountBalance.updated_at <= balance_as_of_date) \
                                            .order_by(CompanyAccountBalance.updated_at.desc()) \
                                            .first()
    cash_balance = cash_balance_obj.balance if cash_balance_obj else 0.0

    online_balance_obj = CompanyAccountBalance.query.filter_by(mode='online') \
                                             .filter(CompanyAccountBalance.updated_at <= balance_as_of_date) \
                                             .order_by(CompanyAccountBalance.updated_at.desc()) \
                                             .first()
    online_balance = online_balance_obj.balance if online_balance_obj else 0.0
    # --- End Company Balance Fetch ---


    # 1. Total sales through ticket (customer rate sum)
    total_ticket_sales = db.session.query(func.sum(Ticket.customer_charge))\
                             .filter(ticket_date_filter, Ticket.status == 'booked')\
                             .scalar() or 0.0

    # 2. Agent charges (assuming this is agent_paid in Ticket model)
    total_agent_charges = db.session.query(func.sum(Ticket.agent_paid))\
                          .filter(ticket_date_filter, Ticket.status == 'booked')\
                          .scalar() or 0.0

    # 3. Profit from sales (customer rate - agent charge)
    profit_from_sales = total_ticket_sales - total_agent_charges

    # 4. Other Service Income (Service availed rates)
    other_service_income = db.session.query(func.sum(Service.customer_charge))\
                           .filter(service_date_filter, Service.status == 'booked')\
                           .scalar() or 0.0

    # 5. Expenditure (other than customer/partner/agent cash_deposit, not wallet updated amount)
    total_expenditure = db.session.query(func.sum(Transaction.amount))\
                            .filter(
                                transaction_date_filter,
                                Transaction.transaction_type == 'payment',
                                Transaction.pay_type != 'wallet_transfer',
                                or_(
                                    Transaction.entity_type == 'others',
                                    and_(
                                        Transaction.entity_type == 'agent',
                                        Transaction.pay_type == 'other_expense',
                                        Transaction.extra_data.cast(db.String).like('%"deduct_from_account": true%')
                                    ),
                                    and_(
                                        or_(Transaction.entity_type == 'customer', Transaction.entity_type == 'partner'),
                                        or_(
                                            Transaction.pay_type == 'cash_withdrawal',
                                            and_(
                                                Transaction.pay_type == 'other_expense',
                                                Transaction.extra_data.cast(db.String).like('%"deduct_from_account": true%')
                                            )
                                        )
                                    )
                                )
                            )\
                            .scalar() or 0.0

    # 6. Net profit (c+d-e)
    net_profit = profit_from_sales + other_service_income - total_expenditure

    # 7. Total agent deposit made
    total_agent_deposit = db.session.query(func.sum(Transaction.amount))\
                         .filter(
                             transaction_date_filter,
                             Transaction.entity_type == 'agent',
                             or_(
                                 and_(Transaction.transaction_type == 'receipt', Transaction.pay_type == 'cash_deposit'),
                                 and_(
                                     Transaction.transaction_type == 'receipt',
                                     Transaction.pay_type == 'other_receipt',
                                     Transaction.extra_data.cast(db.String).like('%"credit_to_account": true%')
                                 )
                             )
                         )\
                         .scalar() or 0.0

    # 8. Total Customer Deposits
    total_customer_deposit = db.session.query(func.sum(Transaction.amount))\
                           .filter(
                               transaction_date_filter,
                               Transaction.entity_type == 'customer',
                               Transaction.transaction_type == 'receipt',
                               or_(
                                   Transaction.pay_type == 'cash_deposit',
                                   and_(
                                       Transaction.pay_type == 'other_receipt',
                                       Transaction.extra_data.cast(db.String).like('%"credit_to_account": true%')
                                   )
                               )
                           )\
                           .scalar() or 0.0

    # 9. Total Agent Credit (actual credit used by agents)
    total_agent_credit = db.session.query(func.sum(Agent.credit_limit - Agent.credit_balance))\
                             .filter(Agent.active == True)\
                             .scalar() or 0.0

    # 10. Total Customer Credit (actual credit used by customers)
    total_customer_credit = db.session.query(func.sum(Customer.credit_used))\
                                .filter(Customer.active == True)\
                                .scalar() or 0.0

    # Sales and Expense Trend Data for Chart
    daily_data_query = db.session.query(
        func.date(Ticket.date).label('date'),
        func.sum(case((Ticket.status == 'booked', Ticket.customer_charge), else_=0)).label('daily_sales'),
        func.sum(case((Ticket.status == 'booked', Ticket.agent_paid), else_=0)).label('daily_expenses')
    ).filter(
        ticket_date_filter
    ).group_by(
        func.date(Ticket.date)
    ).order_by(
        func.date(Ticket.date)
    )

    sales_expense_trend = [{'date': row.date, 'sales': row.daily_sales, 'expenses': row.daily_expenses} for row in daily_data_query.all()]

    # Sales by Particular for Bar Chart
    sales_by_particular_query = db.session.query(
        Particular.name,
        func.sum(Ticket.customer_charge).label('total_sales')
    ).join(Ticket, Ticket.particular_id == Particular.id)\
    .filter(
        ticket_date_filter,
        Ticket.status == 'booked'
    )
    sales_by_particular_data = [{'name': row.name, 'sales': row.total_sales} for row in sales_by_particular_query.group_by(Particular.name).order_by(func.sum(Ticket.customer_charge).desc()).all()]

    # Profit Breakdown by Particular for Pie Chart
    profit_by_particular_query = db.session.query(
        Particular.name,
        func.sum(Ticket.customer_charge - Ticket.agent_paid).label('total_profit')
    ).join(Ticket, Ticket.particular_id == Particular.id)\
    .filter(
        ticket_date_filter,
        Ticket.status == 'booked'
    )
    profit_by_particular_data = [{'name': row.name, 'profit': row.total_profit} for row in profit_by_particular_query.group_by(Particular.name).order_by(func.sum(Ticket.customer_charge - Ticket.agent_paid).desc()).all()]


    return {
        'cash_balance': cash_balance,
        'online_balance': online_balance,
        'total_ticket_sales': total_ticket_sales,
        'total_agent_charges': total_agent_charges,
        'profit_from_sales': profit_from_sales,
        'other_service_income': other_service_income,
        'total_expenditure': total_expenditure,
        'net_profit': net_profit,
        'total_agent_deposit': total_agent_deposit,
        'total_customer_deposit': total_customer_deposit,
        'total_agent_credit': total_agent_credit,
        'total_customer_credit': total_customer_credit,
        'sales_expense_trend': sales_expense_trend,
        'sales_by_particular': sales_by_particular_data,
        'profit_by_particular': profit_by_particular_data
    }


class CompanyBalancesAPI(Resource):
    # @check_permission()
    def get(self):
        try:
            cash_balance_obj = CompanyAccountBalance.query.filter_by(mode='cash') \
                                                    .order_by(CompanyAccountBalance.updated_at.desc()) \
                                                    .first()
            cash_balance = cash_balance_obj.balance if cash_balance_obj else 0.0

            online_balance_obj = CompanyAccountBalance.query.filter_by(mode='online') \
                                                     .order_by(CompanyAccountBalance.updated_at.desc()) \
                                                     .first()
            online_balance = online_balance_obj.balance if online_balance_obj else 0.0

            return {
                'cash_balance': cash_balance,
                'online_balance': online_balance
            }
        except Exception as e:
            db.session.rollback()
            return {'error': 'Failed to fetch company balances. Please check server logs.'}, 500

# Function to safely encode string for FPDF
def safe_encode(text):
    # Ensure text is string before encoding
    return str(text).encode('latin1', 'replace').decode('latin1')

# Generic helper for exporting lists of data to PDF
def _export_list_to_pdf(data_list, title, filename_prefix, column_headers):
    try:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)

        pdf.cell(0, 10, safe_encode(title), 0, 1, 'C')
        pdf.ln(10)

        # Table setup
        if column_headers:
            # Calculate column widths based on page width and number of columns
            # Distribute width, leaving some margin
            page_width = pdf.w - 2 * pdf.l_margin
            col_width = page_width / len(column_headers)
            col_widths = [col_width] * len(column_headers)

            # Attempt to adjust specific column widths for better readability
            for i, header in enumerate(column_headers):
                if header == 'Name':
                    col_widths[i] = page_width * 0.20 # 20% of page width
                elif 'Balance' in header or 'Credit' in header or 'Limit' in header:
                    col_widths[i] = page_width * 0.15 # 15% for financial numbers
                else:
                    col_widths[i] = page_width * 0.10 # Default for other columns
            
            # Ensure total width doesn't exceed page width (adjust if needed)
            total_calculated_width = sum(col_widths)
            if total_calculated_width > page_width:
                # Scale down if it exceeds, or just use equal distribution
                col_widths = [page_width / len(column_headers)] * len(column_headers)

        else:
            col_widths = []


        pdf.set_font("Arial", 'B', 10)
        pdf.set_fill_color(220, 220, 220)

        # Table Header
        for i, header in enumerate(column_headers):
            if i < len(col_widths): # Ensure index is within bounds
                pdf.cell(col_widths[i], 10, safe_encode(header), 1, 0, 'C', True)
        pdf.ln()

        pdf.set_font("Arial", size=10)
        pdf.set_fill_color(255, 255, 255)

        # Table Rows
        for row_data in data_list:
            for i, header in enumerate(column_headers):
                if i < len(col_widths): # Ensure index is within bounds
                    # Ensure data is converted to string and then safely encoded
                    pdf.cell(col_widths[i], 10, safe_encode(str(row_data.get(header, ''))), 1, 0, 'L')
            pdf.ln()

        output = BytesIO()
        output.write(pdf.output(dest='S').encode('latin1'))
        output.seek(0)

        filename = f"{filename_prefix}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
        return send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        raise # Re-raise to be caught by the calling method


class DashboardMetricsAPI(Resource):
    # @check_permission()
    def get(self):
        export_format = request.args.get('export')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        try:
            metrics_data = _get_dashboard_metrics_data(start_date_str, end_date_str)

            if export_format == 'pdf':
                return self._export_pdf(metrics_data, start_date_str, end_date_str)
            else:
                return metrics_data
        except ValueError as ve:
            return {'error': str(ve)}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': 'Failed to fetch dashboard metrics or export PDF. Please check server logs.'}, 500

    def _export_pdf(self, metrics_data, start_date_str, end_date_str):
        """Helper method to generate and return the PDF file for Financial Overview."""
        try:
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("Arial", size=12)

            pdf.cell(0, 10, safe_encode("Financial Overview Dashboard Report"), 0, 1, 'C')
            pdf.ln(5)

            date_range_text = f"Date Range: {start_date_str} to {end_date_str}"
            pdf.cell(0, 10, safe_encode(date_range_text), 0, 1, 'C')
            pdf.ln(10)

            # Define data for PDF table
            data_for_pdf = [
                ["Metric", "Value"],
                ["Cash Balance (as of " + end_date_str + ")", f"{metrics_data.get('cash_balance', 0.0):.2f}"],
                ["Online Balance (as of " + end_date_str + ")", f"{metrics_data.get('online_balance', 0.0):.2f}"],
                ["Total Ticket Sales", f"{metrics_data['total_ticket_sales']:.2f}"],
                ["Total Agent Charges", f"{metrics_data['total_agent_charges']:.2f}"],
                ["Profit from Sales", f"{metrics_data['profit_from_sales']:.2f}"],
                ["Other Service Income", f"{metrics_data['other_service_income']:.2f}"],
                ["Total Expenditure", f"{metrics_data['total_expenditure']:.2f}"],
                ["Net Profit", f"{metrics_data['net_profit']:.2f}"],
                ["Total Agent Deposits", f"{metrics_data['total_agent_deposit']:.2f}"],
                ["Total Customer Deposits", f"{metrics_data['total_customer_deposit']:.2f}"],
                ["Total Agent Credit", f"{metrics_data['total_agent_credit']:.2f}"],
                ["Total Customer Credit", f"{metrics_data['total_customer_credit']:.2f}"]
            ]

            # Table setup
            col_widths = [80, 60]
            pdf.set_font("Arial", 'B', 10)
            pdf.set_fill_color(220, 220, 220)

            # Table Header
            for col_num, header in enumerate(data_for_pdf[0]):
                pdf.cell(col_widths[col_num], 10, safe_encode(header), 1, 0, 'C', True)
            pdf.ln()

            pdf.set_font("Arial", size=10)
            pdf.set_fill_color(255, 255, 255)

            # Table Rows
            for row in data_for_pdf[1:]:
                for col_num, cell_data in enumerate(row):
                    pdf.cell(col_widths[col_num], 10, safe_encode(str(cell_data)), 1, 0, 'L')
                pdf.ln()

            output = BytesIO()
            output.write(pdf.output(dest='S').encode('latin1'))
            output.seek(0)

            filename = f"financial_overview_{start_date_str}_to_{end_date_str}.pdf"
            return send_file(
                output,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=filename
            )
        except Exception as e:
            raise # Re-raise to be caught by the outer try-except in get()


class CustomerWalletCreditAPI(Resource):
    # @check_permission()
    def get(self):
        export_format = request.args.get('export')
        try:
            customers = Customer.query.filter_by(active=True).all()
            data = []
            for c in customers:
                data.append({
                    'ID': c.id,
                    'Name': c.name,
                    'Wallet Balance': c.wallet_balance,
                    'Credit Limit': c.credit_limit,
                    'Credit Used': c.credit_used,
                    'Credit Available': c.credit_limit - c.credit_used
                })

            if export_format == 'pdf':
                column_headers = ['ID', 'Name', 'Wallet Balance', 'Credit Limit', 'Credit Used', 'Credit Available']
                return _export_list_to_pdf(data, "Customer Wallet & Credit Balances", "customer_balances", column_headers)
            else:
                return jsonify(data)
        except Exception as e:
            return {'error': 'Failed to fetch customer wallet/credit data.'}, 500

class AgentWalletCreditAPI(Resource):
    # @check_permission()
    def get(self):
        export_format = request.args.get('export')
        try:
            agents = Agent.query.filter_by(active=True).all()
            data = []
            for a in agents:
                data.append({
                    'ID': a.id,
                    'Name': a.name,
                    'Wallet Balance': a.wallet_balance,
                    'Credit Limit': a.credit_limit,
                    'Credit Balance': a.credit_balance, # This is available credit
                    'Credit Used': a.credit_limit - a.credit_balance # Calculate used credit
                })

            if export_format == 'pdf':
                column_headers = ['ID', 'Name', 'Wallet Balance', 'Credit Limit', 'Credit Balance', 'Credit Used']
                return _export_list_to_pdf(data, "Agent Wallet & Credit Balances", "agent_balances", column_headers)
            else:
                return jsonify(data)
        except Exception as e:
            return {'error': 'Failed to fetch agent wallet/credit data.'}, 500

class PartnerWalletCreditAPI(Resource):
    # @check_permission()
    def get(self):
        export_format = request.args.get('export')
        try:
            partners = Partner.query.filter_by(active=True).all()
            data = []
            for p in partners:
                data.append({
                    'ID': p.id,
                    'Name': p.name,
                    'Wallet Balance': p.wallet_balance,
                    'Allow Negative Wallet': 'Yes' if p.allow_negative_wallet else 'No'
                })

            if export_format == 'pdf':
                column_headers = ['ID', 'Name', 'Wallet Balance', 'Allow Negative Wallet']
                return _export_list_to_pdf(data, "Partner Wallet Balances", "partner_balances", column_headers)
            else:
                return jsonify(data)
        except Exception as e:
            return {'error': 'Failed to fetch partner wallet data.'}, 500
