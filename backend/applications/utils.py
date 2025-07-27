from functools import wraps
from flask import abort,request
from flask_jwt_extended import jwt_required, get_jwt
from applications.model import User

from flask import request, abort, g
from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt

def check_permission():
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()

            # Store user info for downstream use (e.g., audit logs)
            g.user_id = claims.get("sub")
            g.username = claims.get("username", "system")  # fallback if not in token

            # Admin bypass
            if claims.get('is_admin'):
                return fn(*args, **kwargs)

            # Validate normal users
            resource = request.headers.get('X-Resource', '').lower()
            operation = request.headers.get('X-Operation', '').lower()

            if not resource or not operation:
                abort(400, "Missing permission headers")

            perms = claims.get("perms", [])
            required_perm = f"{resource}.{operation}"

            has_access = required_perm in perms or (
                operation == 'read' and f"{resource}.write" in perms
            )

            if has_access:
                return fn(*args, **kwargs)

            abort(403, f"Requires {required_perm}")
        return wrapper
    return decorator


def require_admin(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if not claims.get("is_admin"):
            abort(403, description="Admin access required")
        return fn(*args, **kwargs)
    return wrapper
def get_perms_for_audit(user_id):
    user = User.get(user_id)
    return user.effective_permissions
def serialize_entity(entity):
    return {col.name: getattr(entity, col.name) for col in entity.__table__.columns}

def get_user_payload(user):
    """Serialize user with all details and effective permissions"""
    return {
        "id": user.id,
        "name": user.name,
        "full_name": user.full_name,
        "email": user.email,
        "emp_id": user.emp_id,
        "status": user.status,
        "last_seen": user.last_seen.isoformat() if user.last_seen else None,
        "role": {
            "id": user.role.id,
            "name": user.role.name
        } if user.role else None,
        "perms": user.effective_permissions,
        "session_version": user.session_version,
        "is_admin": user.is_admin
    }

def normalize(name: str) -> str:
    n = name.lower()
    return n