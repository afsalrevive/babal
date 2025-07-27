# applications/bootstrap.py

from applications.model import db, User, Role, Page, Permission

# Map URL segments to SQLAlchemy models for generic CRUD routing
from applications.model import User as UserModel, Role as RoleModel, Page as PageModel
RESOURCE_MODELS = {
    'users': UserModel,
    'roles': RoleModel,
    'pages': PageModel
}


def init_pages():
    """
    Initialize Page entries for each UI route.
    """
    page_defs = [
        ("Dashboard",      "/dashboard"),
        ("UserManagement", "/users"),
        ("Settings",       "/settings"),
    ]
    for name, route in page_defs:
        if not Page.query.filter_by(name=name).first():
            db.session.add(Page(name=name, route=route))
    db.session.commit()


def init_permissions():
    """
    Create read/write/none Permission for every Page.
    """
    ops = ["none", "read", "write"]
    for page in Page.query.all():
        for op in ops:
            if not Permission.query.filter_by(
                page_id=page.id,
                crud_operation=op
            ).first():
                db.session.add(
                    Permission(page_id=page.id, crud_operation=op)
                )
    db.session.commit()



def init_roles():
    """
    Create default roles and assign admin full-write permissions.
    """
    for rn in ["admin", "manager", "user"]:
        if not Role.query.filter_by(name=rn).first():
            db.session.add(Role(name=rn))
    db.session.commit()
    
    # Admin gets all write permissions
    admin = Role.query.filter_by(name="admin").first()
    write_perms = Permission.query.filter_by(crud_operation="write").all()
    admin.permissions = write_perms
    db.session.commit()


def init_admin_user():
    """
    Create a global_admin with admin role if none exists.
    """
    if not User.query.filter_by(name="admin").first():
        admin_role = Role.query.filter_by(name="admin").first()
        u = User(name="admin", full_name="Administrator", role_id=admin_role.id, status="active")
        u.role = admin_role
        u.set_password("admin")
        try:
            u.validate()
            db.session.add(u)
            db.session.commit()
            print("✔ ADMIN created")
        except Exception:
            db.session.rollback()
            print("✘ failed to create ADMIN")


def initialize_system():
    """
    Call all initialization routines.
    """
    init_pages()
    init_permissions()
    init_roles()
    init_admin_user()

