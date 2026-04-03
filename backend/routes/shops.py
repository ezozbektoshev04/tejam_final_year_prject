from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Shop, FoodItem

shops_bp = Blueprint("shops", __name__)


@shops_bp.route("/", methods=["GET"])
def list_shops():
    query = Shop.query.filter_by(is_active=True)

    city = request.args.get("city")
    category = request.args.get("category")
    search = request.args.get("search")

    if city:
        query = query.filter(Shop.city.ilike(f"%{city}%"))
    if category:
        query = query.filter(Shop.category.ilike(f"%{category}%"))
    if search:
        query = query.filter(
            db.or_(
                Shop.name.ilike(f"%{search}%"),
                Shop.description.ilike(f"%{search}%"),
            )
        )

    shops = query.all()
    return jsonify([s.to_dict() for s in shops])


@shops_bp.route("/my", methods=["GET"])
@jwt_required()
def my_shop():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    if user.role != "shop":
        return jsonify({"error": "Not a shop account"}), 403
    if not user.shops:
        return jsonify({"error": "No shops found"}), 404
    return jsonify([s.to_dict(include_items=True) for s in user.shops])


@shops_bp.route("/<int:shop_id>", methods=["GET"])
def get_shop(shop_id):
    shop = Shop.query.get_or_404(shop_id)
    data = shop.to_dict(include_items=True)
    # include reviews
    data["reviews"] = [r.to_dict() for r in shop.reviews]
    return jsonify(data)


@shops_bp.route("/<int:shop_id>", methods=["PUT"])
@jwt_required()
def update_shop(shop_id):
    user_id = int(get_jwt_identity())
    shop = Shop.query.get_or_404(shop_id)

    if shop.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    updatable = ["name", "description", "address", "city", "category", "image_url", "is_active"]
    for field in updatable:
        if field in data:
            setattr(shop, field, data[field])

    db.session.commit()
    return jsonify(shop.to_dict())
