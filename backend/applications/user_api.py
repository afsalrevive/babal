from flask import request,abort
from flask_restful import Resource
from applications.model import db, User, Permission, Role, Page,role_permissions, user_permissions
from applications.utils import check_permission, get_user_payload
from applications.validation_utils import validate_user_data, validate_password,create_existing_cache
from sqlalchemy import func, case
from sqlalchemy.orm import joinedload,aliased
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import jwt_required, get_jwt_identity

class UserAPI(Resource):
    @check_permission()
    def get(self, user_id=None):
        if user_id:
            u = User.query.options(
                joinedload(User.role)
            ).get_or_404(user_id)
            return {"user": get_user_payload(u)}, 200

        all_users = User.query.options(
            joinedload(User.role)
        ).all()
        return {"users": [get_user_payload(u) for u in all_users]}, 200

    @check_permission()
    def post(self):
        data = request.get_json() or {}
        
        # Validate data
        is_valid, msg, code = validate_user_data(data)
        if not is_valid:
            abort(code, msg)
        
        # Validate password
        is_pw_valid, pw_msg, pw_code = validate_password(data['password'])
        if not is_pw_valid:
            abort(pw_code, pw_msg)
        
        try:
            # Create user
            user = User(
                name=data['name'],
                full_name=data['full_name'],
                role_id=data['role_id'],
                emp_id=data.get('emp_id'),
                email=data.get('email'),
                status=data.get('status', 'active')
            )
            user.set_password(data['password'])
            db.session.add(user)
            db.session.commit()
            return get_user_payload(user), 201
        except Exception as e:
            db.session.rollback()
            abort(500, f"Server error: {str(e)}")

    @check_permission()
    def patch(self, user_id):
        user = User.query.get_or_404(user_id)
        data = request.get_json() or {}
        
        # Validate data
        is_valid, msg, code = validate_user_data(data, existing_user=user)
        if not is_valid:
            abort(code, msg)
        
        # Validate password if changing
        if 'password' in data and data['password']:
            is_pw_valid, pw_msg, pw_code = validate_password(data['password'])
            if not is_pw_valid:
                abort(pw_code, pw_msg)
        
        try:
            # Update fields
            for field in ['name', 'full_name','email', 'role_id', 'emp_id', 'status']:
                if field in data:
                    setattr(user, field, data[field])
            
            if 'password' in data:
                user.set_password(data['password'])
            
            db.session.commit()
            return get_user_payload(user), 200
        except Exception as e:
            db.session.rollback()
            abort(500, f"Server error: {str(e)}")

    @check_permission()
    def delete(self, user_id):
        user = User.query.get_or_404(user_id)
        db.session.delete(user)
        db.session.commit()
        return {'message': 'User deleted'}, 200

class UserPermissionAPI(Resource):
    @check_permission()
    def get(self, user_id):
        user = User.query.options(
            joinedload(User.role).joinedload(Role.permissions).joinedload(Permission.page),
            joinedload(User.permissions).joinedload(Permission.page)
        ).get_or_404(user_id)

        # Group overrides
        user_overrides = {
            p.page_id: p.crud_operation for p in user.permissions
        }

        # Role-based inherited permissions
        inherited = {}
        if user.role:
            for p in user.role.permissions:
                inherited[p.page_id] = p.crud_operation

        result = []
        all_pages = Page.query.all()
        for page in all_pages:
            override = user_overrides.get(page.id)
            role_perm = inherited.get(page.id, 'none')  # default to none if no role perm
            current = override or f"inherit({role_perm})"
            result.append({
                "page_id": page.id,
                "page_name": page.name,
                "permission": current,
                "options": ["none", f"inherit({role_perm})", "read", "write"]
            })

        return {
            "permissions": result,
            "overrides": user_overrides,
            "role_permissions": inherited
        }, 200

    @check_permission()
    def put(self, user_id):
        user = User.query.options(
            joinedload(User.permissions)
            .joinedload(Permission.page)
        ).get_or_404(user_id)

        data = request.get_json()
        if 'permissions' not in data:
            abort(400, description="Missing permissions array")

        updated_perms = []

        for perm_data in data['permissions']:
            page_id = perm_data['page_id']
            operation = perm_data['operation'].lower()

            # Handle inherit → remove overrides for this page
            if operation == "inherit":
                user.permissions = [p for p in user.permissions if p.page_id != page_id]
                continue

            # Handle none → deny access (remove user override)
            if operation == "none":
                # remove any existing override first
                user.permissions = [p for p in user.permissions if p.page_id != page_id]
                # then attach the 'none' deny-permission
                none_perm = Permission.query.filter_by(page_id=page_id, crud_operation='none').first()
                if not none_perm:
                    none_perm = Permission(page_id=page_id, crud_operation='none')
                    db.session.add(none_perm)
                    db.session.flush()
                user.permissions.append(none_perm)
                continue


            # read or write override
            perm = Permission.query.filter_by(
                page_id=page_id, crud_operation=operation
            ).first()
            if not perm:
                abort(404, f"Permission '{operation}' not found for page {page_id}")
            updated_perms.append(perm)

        # Replace permissions for the selected pages only
        existing_perms = [p for p in user.permissions if all(p.page_id != np.page_id for np in updated_perms)]
        user.permissions = existing_perms + updated_perms
        user.session_version += 1
        db.session.commit()

        return {
            "message": "Permissions updated",
            "permissions": [{
                "page_id": p.page_id,
                "operation": p.crud_operation,
                "page_name": p.page.name
            } for p in user.permissions]
        }, 200
    @check_permission()
    def delete(self, user_id):
        data = request.get_json(force=True) or {}
        page_ids = data.get('page_ids')
        if not isinstance(page_ids, list):
            abort(400, "Missing 'page_ids' list")
        user = User.query.get_or_404(user_id)
        user.permissions = [
            p for p in user.permissions
            if p.page_id not in page_ids
        ]
        db.session.commit()
        return {"deleted": page_ids}, 200

    def options(self, user_id):
        """CORS preflight handling"""
        return {}, 200, {
            'Access-Control-Allow-Origin': 'http://localhost:5173',
            'Access-Control-Allow-Methods': 'PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            'Access-Control-Allow-Credentials': 'true'
        }

class PagePermissionsAPI(Resource):
    method_decorators = [check_permission()]

    def get(self, uid):
        # 1. load user to get role_id
        user = User.query.get_or_404(uid)
        role_id = user.role_id

        # 2. alias the Permission table for user vs role
        up = aliased(Permission, name="up")  # user overrides
        rp = aliased(Permission, name="rp")  # role defaults

        # 3. subqueries to filter by user_id and role_id
        up_subq = db.session.query(user_permissions.c.permission_id).\
            filter(user_permissions.c.user_id == uid)
        rp_subq = db.session.query(role_permissions.c.permission_id).\
            filter(role_permissions.c.role_id == role_id)

        # 4. build the left-join + coalesce + override flag
        q = (
            db.session.query(
                Page.id.label("id"),
                Page.name.label("name"),
                func.coalesce(up.crud_operation, rp.crud_operation, "none")
                    .label("effective"),
                case((up.id != None, True), else_=False)
                    .label("override")
            )
            .outerjoin(up, (up.page_id == Page.id) & up.id.in_(up_subq))
            .outerjoin(rp, (rp.page_id == Page.id) & rp.id.in_(rp_subq))
            .order_by(Page.id)
        )
        p = q.with_entities(
            Page.id.label("id"),
            Page.name.label("name"),
            func.coalesce(up.crud_operation, rp.crud_operation, "none").label("effective"),
            rp.crud_operation.label("role_perm"),     # ← new!
            case((up.id != None, True), else_=False).label("override")
        ).all()

        pages = [row._asdict() for row in p]
        return {"pages": pages}, 200

class BulkUserAPI(Resource):
    @check_permission()
    def patch(self):
        data = request.get_json()
        
        # Validate input structure
        if not data or 'user_ids' not in data or 'updates' not in data:
            abort(400, "Missing user_ids or updates in request body")
            
        user_ids = data['user_ids']
        updates = data['updates']
        
        # Validate ID list format
        if not isinstance(user_ids, list) or len(user_ids) == 0:
            abort(400, "user_ids must be a non-empty list")
            
        # Validate updates format
        if not isinstance(updates, dict) or len(updates) == 0:
            abort(400, "updates must be a non-empty dictionary")

        # Define allowed fields with their types and nullability
        allowed_fields = {
            'status': {'type': str, 'options': ['active', 'inactive'], 'nullable': False},
            'role_id': {'type': int, 'nullable': False},
        }

        # Validate updates against allowed fields
        invalid_fields = set(updates.keys()) - allowed_fields.keys()
        if invalid_fields:
            abort(400, f"Invalid field(s) in updates: {', '.join(invalid_fields)}. Allowed: {', '.join(allowed_fields.keys())}")

        # Validate each field's type and values
        for field, value in updates.items():
            spec = allowed_fields[field]
            
            # Check nullability
            if value is None and not spec['nullable']:
                abort(400, f"Field {field} cannot be null")
                
            # Type check (handle union types)
            if value is not None and not isinstance(value, spec['type']):
                abort(400, f"Invalid type for {field}. Expected {spec['type']}, got {type(value)}")
            
            # Validate enum options if specified
            if 'options' in spec and value not in spec['options']:
                abort(400, f"Invalid value for {field}. Allowed: {', '.join(spec['options'])}")

            # Validate foreign key references if value exists
            if value is not None:
                if field == 'role_id' and not Role.query.get(value):
                    abort(400, f"Invalid role_id: {value}")

        try:
            # Fetch users in single query with lock for update
            users = User.query.filter(User.id.in_(user_ids)).with_for_update().all()
            
            # Verify all users exist
            found_ids = {u.id for u in users}
            missing_ids = set(user_ids) - found_ids
            if missing_ids:
                abort(404, f"Users not found: {', '.join(map(str, missing_ids))}")

            # Apply updates to each user
            for user in users:
                for field, value in updates.items():
                    setattr(user, field, value)

            # Bulk validation before commit
            for user in users:
                user.validate()

            # Optimized bulk update
            db.session.bulk_update_mappings(User, [{
                'id': u.id,
                **{f: v for f, v in updates.items()}
            } for u in users])
            
            db.session.commit()
            
            return {
                "message": f"Successfully updated {len(users)} users",
                "count": len(users),
                "updated_fields": list(updates.keys())
            }, 200

        except IntegrityError as e:
            db.session.rollback()
            error_info = str(e.orig).lower()
            
            if 'unique constraint' in error_info:
                conflict_fields = []
                if 'emp_id' in error_info:
                    conflict_fields.append('employee_id')
                if 'email' in error_info:
                    conflict_fields.append('email')
                if conflict_fields:
                    abort(409, f"Conflict in fields: {', '.join(conflict_fields)}")
                    
            abort(400, "Database integrity error")

        except Exception as e:
            db.session.rollback()
            abort(500, f"Server error: {str(e)}")

class BulkDeleteAPI(Resource):
    @check_permission()
    def delete(self):
        data = request.get_json()
        
        if not data or 'user_ids' not in data:
            abort(400, "Missing user_ids in request body")
            
        user_ids = data['user_ids']
        
        if not isinstance(user_ids, list) or len(user_ids) == 0:
            abort(400, "user_ids must be a non-empty list")

        try:
            # Delete users in bulk
            delete_count = User.query.filter(User.id.in_(user_ids)).delete()
            
            if delete_count == 0:
                abort(404, "No users found for deletion")
                
            db.session.commit()
            
            return {
                "message": f"Successfully deleted {delete_count} users",
                "count": delete_count
            }, 200

        except Exception as e:
            db.session.rollback()
            abort(400, str(e))

class BulkUserCreateAPI(Resource):
    @check_permission()
    def post(self):
        data = request.get_json()
        if not data or 'users' not in data:
            abort(400, "Missing users array in request body")
            
        users_data = data['users']
        
        if not isinstance(users_data, list) or len(users_data) == 0:
            abort(400, "users must be a non-empty list")

        # Create cache of existing identifiers
        existing_cache = create_existing_cache()
        new_users = []
        errors = []
        batch_cache = {
            'names': set(),
            'emails': set(),
            'emp_ids': set()
        }

        for index, user_data in enumerate(users_data):
            # Combine existing cache with batch cache
            combined_cache = {
                'names': existing_cache['names'] | batch_cache['names'],
                'emails': existing_cache['emails'] | batch_cache['emails'],
                'emp_ids': existing_cache['emp_ids'] | batch_cache['emp_ids']
            }
            
            # Validate user data
            is_valid, msg, code = validate_user_data(user_data, existing_cache=combined_cache)
            if not is_valid:
                errors.append({
                    "index": index,
                    "user": user_data,
                    "error": msg,
                    "code": code
                })
                continue
            
            # Validate password
            password = user_data.get('password')
            if not password:
                errors.append({
                    "index": index,
                    "user": user_data,
                    "error": "Password is required",
                    "code": 400
                })
                continue
                
            is_pw_valid, pw_msg, pw_code = validate_password(password)
            if not is_pw_valid:
                errors.append({
                    "index": index,
                    "user": user_data,
                    "error": pw_msg,
                    "code": pw_code
                })
                continue
            
            try:
                # Create user object
                user = User(
                    name=user_data['name'],
                    full_name=user_data['full_name'],
                    email=user_data.get('email'),
                    role_id=user_data.get('role_id'),
                    emp_id=user_data.get('emp_id'),
                    status=user_data.get('status', 'active')
                )
                user.set_password(password)
                new_users.append(user)
                
                # Add to batch cache to prevent intra-batch duplicates
                batch_cache['names'].add(user_data['name'].lower())
                if user_data.get('email'):
                    batch_cache['emails'].add(user_data['email'].lower())
                if user_data.get('emp_id'):
                    batch_cache['emp_ids'].add(user_data['emp_id'])
                    
            except Exception as e:
                errors.append({
                    "index": index,
                    "user": user_data,
                    "error": str(e),
                    "code": 500
                })
        
        if errors:
            return {
                "message": "Some users have errors",
                "success_count": len(new_users),
                "error_count": len(errors),
                "errors": errors
            }, 207  # Multi-status

        if not new_users:
            return {"message": "No valid users to create"}, 400

        try:
            db.session.bulk_save_objects(new_users)
            db.session.commit()
            return {
                "message": f"Successfully created {len(new_users)} users",
                "count": len(new_users)
            }, 201
        except IntegrityError as e:
            db.session.rollback()
            return self.handle_integrity_error(e, new_users)
        except Exception as e:
            db.session.rollback()
            abort(500, f"Bulk create failed: {str(e)}")

    def handle_integrity_error(self, e, attempted_users):
        error_info = str(e.orig).lower()
        error_users = []
        
        # Try to identify the conflicting field
        conflict_field = None
        if 'unique constraint' in error_info:
            if 'users_name_key' in error_info or 'name' in error_info:
                conflict_field = 'name'
            elif 'users_emp_id_key' in error_info or 'emp_id' in error_info:
                conflict_field = 'emp_id'
            elif 'users_email_key' in error_info or 'email' in error_info:
                conflict_field = 'email'
        
        # Find the conflicting users
        for user in attempted_users:
            conflict_value = None
            
            if conflict_field == 'name':
                conflict_value = user.name
                existing = User.query.filter(func.lower(User.name) == func.lower(user.name)).first()
            elif conflict_field == 'emp_id':
                conflict_value = user.emp_id
                existing = User.query.filter_by(emp_id=user.emp_id).first()
            elif conflict_field == 'email':
                conflict_value = user.email
                existing = User.query.filter(func.lower(User.email) == func.lower(user.email)).first()
            else:
                existing = None
            
            if existing:
                error_users.append({
                    "user": user.name,
                    "field": conflict_field,
                    "value": conflict_value,
                    "existing_user_id": existing.id
                })
        
        if error_users:
            return {
                "message": "Duplicate entries detected during save",
                "conflicts": error_users
            }, 409
        
        return {"message": "Database integrity error"}, 400
            
class UserDuplicateCheckAPI(Resource):
    @check_permission()
    def post(self):
        data = request.get_json()
        result = {"exists": False, "fields": []}
        
        # Name check
        if 'name' in data and data['name']:
            name = data['name'].strip().lower()
            exists = User.query.filter(func.lower(User.name) == name).first()
            if exists:
                result['exists'] = True
                result['fields'].append('username')
        
        # Employee ID check
        if 'emp_id' in data and data['emp_id'] is not None:
            exists = User.query.filter_by(emp_id=data['emp_id']).first()
            if exists:
                result['exists'] = True
                result['fields'].append('employee_id')
        
        # Email check
        if 'email' in data and data['email']:
            email = data['email'].strip().lower()
            exists = User.query.filter(func.lower(User.email) == email).first()
            if exists:
                result['exists'] = True
                result['fields'].append('email')
        
        return result, 200

class CurrentUserAPI(Resource):
    @jwt_required()
    def get(self):
        uid = get_jwt_identity()
        user = User.query.options(
            joinedload(User.role).joinedload(Role.permissions).joinedload(Permission.page),
            joinedload(User.permissions).joinedload(Permission.page)
        ).get(uid)
        
        if not user:
            abort(404, description="User not found")
            
        return {"user": get_user_payload(user)}, 200
    
# Add this to user_api.py
def handle_integrity_error(e, attempted_users):
    error_info = str(e.orig).lower()
    error_users = []
    
    # Try to identify the conflicting field
    conflict_field = None
    if 'unique constraint' in error_info:
        if 'users_name_key' in error_info or 'name' in error_info:
            conflict_field = 'name'
        elif 'users_emp_id_key' in error_info or 'emp_id' in error_info:
            conflict_field = 'emp_id'
        elif 'users_email_key' in error_info or 'email' in error_info:
            conflict_field = 'email'
    
    # Try to find the conflicting users
    for user in attempted_users:
        conflict_value = None
        
        if conflict_field == 'name':
            conflict_value = user.name
            existing = User.query.filter(func.lower(User.name) == func.lower(user.name)).first()
        elif conflict_field == 'emp_id':
            conflict_value = user.emp_id
            existing = User.query.filter_by(emp_id=user.emp_id).first()
        elif conflict_field == 'email':
            conflict_value = user.email
            existing = User.query.filter(func.lower(User.email) == func.lower(user.email)).first()
        else:
            existing = None
        
        if existing:
            error_users.append({
                "user": user.name,
                "field": conflict_field,
                "value": conflict_value,
                "existing_user_id": existing.id
            })
    
    if error_users:
        return {
            "message": "Duplicate entries detected during save",
            "conflicts": error_users
        }, 409
    
    return {"message": "Database integrity error"}, 400