from flask import request, abort
from sqlalchemy.exc import IntegrityError 
from flask_restful import Resource
from applications.model import db,User, Role, Permission, Page,role_permissions, user_permissions
from applications.utils import check_permission, serialize_entity
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from flask import current_app


class RoleAPI(Resource):
    @check_permission()
    def get(self, role_id=None):
        """
        Retrieve role(s) with permissions
        GET /api/roles - List all roles
        GET /api/roles/<id> - Get single role
        """
        try:
            opts = joinedload(Role.permissions).options(
                joinedload(Permission.page)
            )
            if role_id:
                role = Role.query.options(opts).get_or_404(role_id)
                return self._format_role_response(role), 200

            roles = Role.query.options(opts).all()
            return {
                "roles": [self._format_role_response(role) for role in roles]
            }, 200

        except SQLAlchemyError as e:
            db.session.rollback()
            return {"error": f"Database error: {str(e)}"}, 500
        except Exception as e:
            return {"error": f"Unexpected error: {str(e)}"}, 500

    def _format_role_response(self, role):
        """Enhance serialized role with permissions data"""
        serialized = serialize_entity(role)
        serialized['permissions'] = [
            {
                "pageId": p.page.name,
                "permission": p.crud_operation
            }
            for p in role.permissions
            if p.page  # Maintain null-check for page relationship
        ]
        return serialized

    @check_permission()
    def post(self):
        data = request.get_json(force=True)
        role = Role(name=data['name'], description=data.get('description'))
        db.session.add(role)
        db.session.commit()
        return serialize_entity(role), 201

    @check_permission()
    def patch(self, role_id):
        role = Role.query.get_or_404(role_id)
        data = request.get_json(force=True)
        if 'name' in data:
            role.name = data['name']
        if 'description' in data:
            role.description = data['description']
        db.session.commit()
        return serialize_entity(role), 200

    @check_permission()
    def delete(self, role_id):
        role = Role.query.get_or_404(role_id)
        db.session.delete(role)
        db.session.commit()
        return {'message': 'Role deleted'}, 200

class RolePermissionAPI(Resource):
    @check_permission()
    def get(self, role_id=None):
        if role_id is None:
            perms = Permission.query.options(joinedload(Permission.page)).all()
            return {"permissions": [
                {
                    "id": p.id,
                    "page_id": p.page_id,
                    "crud_operation": p.crud_operation,
                    "page_name": p.page.name
                }
                for p in perms
            ]}, 200

        role = Role.query.options(joinedload(Role.permissions).joinedload(Permission.page)).get_or_404(role_id)
        return {"permissions": [
            {
                "id": p.id,
                "page_id": p.page_id,
                "crud_operation": p.crud_operation,
                "page_name": p.page.name
            }
            for p in role.permissions
        ]}, 200

    @check_permission()
    def put(self, role_id):
        role = Role.query.get_or_404(role_id)
        data = request.get_json(force=True)
        if 'permissions' not in data:
            return {"message": "Missing permissions array"}, 400

        new_perms = []
        for perm in data['permissions']:
            if not all(k in perm for k in ('page_id', 'crud_operation')):
                return {"message": "Invalid permission format"}, 400
            permission = Permission.query.filter_by(
                page_id=perm['page_id'], crud_operation=perm['crud_operation']
            ).first()
            if not permission:
                permission = Permission(
                    page_id=perm['page_id'], crud_operation=perm['crud_operation']
                )
                db.session.add(permission)
                db.session.commit()
            new_perms.append(permission)

        role.permissions = new_perms
        db.session.commit()
        return {
            "message": "Permissions updated successfully",
            "permissions": [
                {"id": p.id, "page_id": p.page_id, "crud_operation": p.crud_operation}
                for p in new_perms
            ]
        }, 200


class PageAPI(Resource):
    @check_permission()
    def get(self):
        try:
            pages = Page.query.options(joinedload(Page.permissions)).all()
            return [{
                **serialize_entity(p),
                "permissions": [serialize_entity(perm) for perm in p.permissions]
            } for p in pages], 200
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"PageAPI Error: {str(e)}")
            return {"error": "Database operation failed"}, 500
        except Exception as e:
            current_app.logger.error(f"Unexpected Error: {str(e)}")
            return {"error": "Internal server error"}, 500
        
    @check_permission()
    def post(self):
        data = request.get_json()
        name = data.get('name')
        route = data.get('route')

        if not name or not route:
            return {"error": "Name and route are required"}, 400

        try:
            # Check for duplicate
            if Page.query.filter((Page.name == name) | (Page.route == route)).first():
                return {"error": "Page with this name or route already exists"}, 409

            page = Page(name=name, route=route)
            db.session.add(page)
            db.session.flush()  # Get page.id before commit

            # Create default permissions
            operations = ['read', 'write', 'none']
            for op in operations:
                perm = Permission(page_id=page.id, crud_operation=op)
                db.session.add(perm)

            db.session.commit()
            return {
                **serialize_entity(page),
                "permissions": operations
            }, 201

        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"PageAPI POST Error: {str(e)}")
            return {"error": "Database operation failed"}, 500

    @check_permission()
    def patch(self, page_id):
        p = Page.query.get_or_404(page_id)
        if 'name' in request.json: p.name = request.json['name']
        if 'route' in request.json: p.route = request.json['route']
        db.session.commit()
        return serialize_entity(p), 200

    @check_permission()
    def delete(self, page_id):
        page = Page.query.get_or_404(page_id)

        # Step 1: Get all related permission IDs for the page
        permission_ids = [p.id for p in Permission.query.filter_by(page_id=page_id).all()]

        if permission_ids:
            # Step 2: Delete from association tables
            db.session.execute(
                role_permissions.delete().where(role_permissions.c.permission_id.in_(permission_ids))
            )
            db.session.execute(
                user_permissions.delete().where(user_permissions.c.permission_id.in_(permission_ids))
            )

            # Step 3: Delete from Permission table
            Permission.query.filter(Permission.id.in_(permission_ids)).delete(synchronize_session=False)

        # Step 4: Delete the page
        db.session.delete(page)
        db.session.commit()

        return {"message": "Page and related permissions deleted successfully"}, 200