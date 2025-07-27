# applications/validation_utils.py
from applications.model import db, User, Role
from sqlalchemy import func
import re

def validate_user_data(data, existing_user=None, existing_cache=None):
    """
    Validate user data with comprehensive checks
    Returns tuple: (is_valid, error_message, status_code)
    """
    # Required fields check
    required_fields = ['name', 'full_name', 'role_id']
    if not existing_user:  # Password only required for new users
        required_fields.append('password')
    
    missing = [field for field in required_fields if field not in data or not data[field]]
    if missing:
        return False, f"Missing fields: {', '.join(missing)}", 400
    
    # Validate role exists
    role = Role.query.get(data['role_id'])
    if not role:
        return False, "Invalid role_id", 400
    
   
    # Email format validation
    email = data.get('email')
    if email and not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return False, "Invalid email format", 400
    
    # Check for duplicates using cache if available
    duplicate_fields = []
    user_id = existing_user.id if existing_user else None
    
    # Name duplicate check
    name = data['name'].strip().lower()
    if existing_cache and name in existing_cache['names']:
        duplicate_fields.append('username')
    else:
        query = User.query.filter(func.lower(User.name) == name)
        if user_id:
            query = query.filter(User.id != user_id)
        if query.first():
            duplicate_fields.append('username')
    
    # Employee ID duplicate check
    emp_id = data.get('emp_id')
    if emp_id is not None:
        if existing_cache and emp_id in existing_cache['emp_ids']:
            duplicate_fields.append('employee_id')
        else:
            query = User.query.filter_by(emp_id=emp_id)
            if user_id:
                query = query.filter(User.id != user_id)
            if query.first():
                duplicate_fields.append('employee_id')
    
    # Email duplicate check
    if email:
        email = email.lower()
        if existing_cache and email in existing_cache['emails']:
            duplicate_fields.append('email')
        else:
            query = User.query.filter(func.lower(User.email) == email)
            if user_id:
                query = query.filter(User.id != user_id)
            if query.first():
                duplicate_fields.append('email')
    
    if duplicate_fields:
        return False, f"Duplicate in fields: {', '.join(duplicate_fields)}", 409
    
    return True, "", 200

def create_existing_cache():
    """Create cache of existing identifiers for bulk operations"""
    return {
        'names': {u.name.lower() for u in User.query.all()},
        'emails': {u.email.lower() for u in User.query.filter(User.email.isnot(None))},
        'emp_ids': {u.emp_id for u in User.query.filter(User.emp_id.isnot(None))}
    }

def validate_password(password):
    """Validate password meets security requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters", 400
    # Add more checks as needed (special chars, numbers, etc.)
    return True, "", 200