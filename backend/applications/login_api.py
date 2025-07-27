from flask import request, jsonify, current_app
from flask_restful import Resource
from flask_jwt_extended import create_access_token,jwt_required,get_jwt_identity
from applications.model import db, User, Role, Permission
from applications.validation_utils import validate_user_data, validate_password
from applications.utils import get_user_payload,normalize
from datetime import timedelta

class LoginAPI(Resource):
    def post(self):
        try:
            data = request.get_json() or {}
            name, password = data.get("name", "").strip(), data.get("password", "").strip()
            if not name or not password:
                return {"error": "Username and password required"}, 400

            user = User.query\
                .options(
                    db.joinedload(User.role).joinedload(Role.permissions).joinedload(Permission.page),
                    db.joinedload(User.permissions).joinedload(Permission.page)
                )\
                .filter_by(name=name).first()

            if not user or not user.check_password(password):
                return {"error": "Invalid credentials"}, 401

            # Modified Section
            perms_set = set()

            # 1. Process ROLE permissions first
            for p in user.role.permissions:
                if not p.page:
                    continue

                page_name = normalize(p.page.name)
                
                # Skip 'none' in roles (they shouldn't exist here normally)
                if p.crud_operation == "none":
                    continue
                    
                if p.crud_operation == "write":
                    perms_set.add(f"{page_name}.read")
                    perms_set.add(f"{page_name}.write")
                elif p.crud_operation == "read":
                    perms_set.add(f"{page_name}.read")

            # 2. Process USER permissions to override
            for p in user.permissions:
                if not p.page:
                    continue
                page_name = normalize(p.page.name)
                
                # Remove existing permissions for this page
                perms_set.discard(f"{page_name}.read")
                perms_set.discard(f"{page_name}.write")
                
                if p.crud_operation == "write":
                    perms_set.add(f"{page_name}.read")  # Write implies read
                    perms_set.add(f"{page_name}.write")
                elif p.crud_operation == "read":
                    perms_set.add(f"{page_name}.read")
                elif p.crud_operation == "none":
                    pass  
            

            additional_claims = {
                "sub": str(user.id),
                "username": user.name,  # ✅ Add username to token
                "perms": [p.lower() for p in user.effective_permissions],
                "role": user.role.name,
                "is_admin": user.is_admin,
                "session_version": user.session_version
            }


            access_token = create_access_token(
                identity=str(user.id),
                additional_claims=additional_claims,
                expires_delta=timedelta(hours=10)
            )
            print(f"Login session_version: {user.session_version}")
            return {
                "message": "Login successful",
                "user": get_user_payload(user),   
                "token": access_token
            }, 200

        except Exception as e:
            current_app.logger.error(f"Login error: {e}", exc_info=True)
            return {"error": "Internal server error"}, 500

    def options(self):
        return {}, 200


class SignupAPI(Resource):
    def post(self):
        data = request.get_json() or {}
        required = ["name", "password", "role_id"]
        
        # Check required fields
        if missing := [k for k in required if k not in data or not data[k]]:
            return {"error": f"Missing fields: {', '.join(missing)}"}, 400
        
        # Validate data
        is_valid, msg, code = validate_user_data(data)
        if not is_valid:
            return {"error": msg}, code
        
        # Validate password
        is_pw_valid, pw_msg, pw_code = validate_password(data['password'])
        if not is_pw_valid:
            return {"error": pw_msg}, pw_code
        
        try:
            # Create user
            user = User(
                name=data["name"],
                role_id=data["role_id"],
                emp_id=data.get("emp_id"),
                email=data.get("email"),
                status=data.get("status", "active")
            )
            user.set_password(data["password"])
            db.session.add(user)
            db.session.commit()
            return {"message": "User created", "user": get_user_payload(user)}, 201
        except Exception as e:
            db.session.rollback()
            return {"error": "Database error"}, 500

class VerifyTokenAPI(Resource):
    @jwt_required()
    def get(self):
        user = User.query.get(get_jwt_identity())
        return jsonify({"user": get_user_payload(user)})
        

class BulkUpdateAPI(Resource):
    @jwt_required()
    def patch(self):
        from flask_jwt_extended import get_jwt
        claims = get_jwt()
        if "user.update" not in claims.get("perms", []):
            return {"error": "Forbidden"}, 403

        data = request.get_json() or {}
        ids, status = data.get("user_ids", []), data.get("status")
        if not ids or status not in ["active", "inactive"]:
            return {"error": "Invalid data"}, 400

        users = User.query.filter(User.id.in_(ids)).all()
        for u in users:
            u.status = status
        db.session.commit()
        return {"message": "Users updated"}, 200
