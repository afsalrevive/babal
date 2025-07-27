# applications/generic_api.py
from flask_restful import Resource
from flask import request, abort
from applications.utils import check_permission
from applications.model import db
from applications.bootstrap import RESOURCE_MODELS

class GenericAPI(Resource):
    method_decorators = [ check_permission() ]

    def get(self, resource, id=None):
        Model = RESOURCE_MODELS.get(resource)
        if not Model:
            abort(404, f"Unknown resource '{resource}'")
        if id:
            obj = Model.query.get_or_404(id)
            return {resource[:-1]: obj.to_dict()},200
        all = Model.query.all()
        return {resource: [o.to_dict() for o in all]},200

    def post(self, resource):
        Model = RESOURCE_MODELS.get(resource)
        if not Model: abort(404)
        data = request.get_json() or {}
        obj = Model(**data)
        db.session.add(obj); db.session.commit()
        return obj.to_dict(),201

    def patch(self, resource, id):
        Model = RESOURCE_MODELS.get(resource)
        if not Model: abort(404)
        data = request.get_json() or {}
        obj = Model.query.get_or_404(id)
        for k,v in data.items(): setattr(obj,k,v)
        db.session.commit()
        return obj.to_dict(),200

    def delete(self, resource, id):
        Model = RESOURCE_MODELS.get(resource)
        if not Model: abort(404)
        obj = Model.query.get_or_404(id)
        db.session.delete(obj); db.session.commit()
        return {},204
