from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Shop, FoodItem, Order, Review

food_bp = Blueprint("food_items", __name__)


@food_bp.route("/", methods=["GET"])
def list_items():
    # Public browse: only available, non-archived items
    query = FoodItem.query.filter_by(is_available=True, is_archived=False)

    shop_id = request.args.get("shop_id")
    search = request.args.get("search")
    category = request.args.get("category")

    if shop_id:
        query = query.filter_by(shop_id=int(shop_id))
    if search:
        query = query.filter(
            db.or_(
                FoodItem.name.ilike(f"%{search}%"),
                FoodItem.description.ilike(f"%{search}%"),
            )
        )
    if category:
        query = query.join(Shop).filter(Shop.category.ilike(category))

    items = query.order_by(FoodItem.created_at.desc()).all()
    return jsonify([item.to_dict() for item in items])


@food_bp.route("/<int:item_id>", methods=["GET"])
def get_item(item_id):
    item = FoodItem.query.get_or_404(item_id)
    data = item.to_dict()
    data["shop"] = item.shop.to_dict() if item.shop else None

    # Reviews specific to this food item
    item_reviews = Review.query.filter_by(food_item_id=item_id).order_by(Review.created_at.desc()).all()
    data["reviews"] = [r.to_dict() for r in item_reviews]
    data["review_count"] = len(item_reviews)
    data["avg_rating"] = round(sum(r.rating for r in item_reviews) / len(item_reviews), 1) if item_reviews else None

    return jsonify(data)


@food_bp.route("/", methods=["POST"])
@jwt_required()
def create_item():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role != "shop":
        return jsonify({"error": "Only shop accounts can create food items"}), 403
    if not user.shops:
        return jsonify({"error": "Shop not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required = ["name", "original_price", "discounted_price"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    shop_ids = [s.id for s in user.shops]
    shop_id = int(data.get("shop_id", user.shops[0].id))
    if shop_id not in shop_ids:
        return jsonify({"error": "Unauthorized shop"}), 403

    item = FoodItem(
        shop_id=shop_id,
        name=data["name"],
        description=data.get("description", ""),
        original_price=float(data["original_price"]),
        discounted_price=float(data["discounted_price"]),
        quantity=int(data.get("quantity", 1)),
        pickup_start=data.get("pickup_start", "17:00"),
        pickup_end=data.get("pickup_end", "20:00"),
        image_url=data.get("image_url", ""),
        is_available=data.get("is_available", True),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@food_bp.route("/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_item(item_id):
    user_id = int(get_jwt_identity())
    item = FoodItem.query.get_or_404(item_id)

    user = User.query.get_or_404(user_id)
    shop_ids = [s.id for s in user.shops]
    if user.role != "shop" or item.shop_id not in shop_ids:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Block making available if quantity is 0
    if data.get("is_available") is True:
        new_qty = int(data.get("quantity", item.quantity))
        if new_qty <= 0:
            return jsonify({"error": "Cannot activate a listing with 0 quantity. Update the quantity first."}), 400

    updatable = [
        "name", "description", "original_price", "discounted_price",
        "quantity", "pickup_start", "pickup_end", "image_url", "is_available"
    ]
    for field in updatable:
        if field in data:
            setattr(item, field, data[field])

    db.session.commit()
    return jsonify(item.to_dict())


@food_bp.route("/<int:item_id>/archive", methods=["PUT"])
@jwt_required()
def archive_item(item_id):
    user_id = int(get_jwt_identity())
    item = FoodItem.query.get_or_404(item_id)
    user = User.query.get_or_404(user_id)
    shop_ids = [s.id for s in user.shops]
    if user.role != "shop" or item.shop_id not in shop_ids:
        return jsonify({"error": "Unauthorized"}), 403

    item.is_archived = True
    item.is_available = False
    db.session.commit()
    return jsonify(item.to_dict())


@food_bp.route("/<int:item_id>/restore", methods=["PUT"])
@jwt_required()
def restore_item(item_id):
    user_id = int(get_jwt_identity())
    item = FoodItem.query.get_or_404(item_id)
    user = User.query.get_or_404(user_id)
    shop_ids = [s.id for s in user.shops]
    if user.role != "shop" or item.shop_id not in shop_ids:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json() or {}
    item.is_archived = False
    item.is_available = True
    item.quantity = int(data.get("quantity", 5))
    if "pickup_start" in data: item.pickup_start = data["pickup_start"]
    if "pickup_end" in data:   item.pickup_end   = data["pickup_end"]
    db.session.commit()
    return jsonify(item.to_dict())


@food_bp.route("/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_item(item_id):
    user_id = int(get_jwt_identity())
    item = FoodItem.query.get_or_404(item_id)

    user = User.query.get_or_404(user_id)
    shop_ids = [s.id for s in user.shops]
    if user.role != "shop" or item.shop_id not in shop_ids:
        return jsonify({"error": "Unauthorized"}), 403

    # Delete related reviews and orders first to avoid FK constraint errors
    orders = Order.query.filter_by(food_item_id=item_id).all()
    for order in orders:
        Review.query.filter_by(order_id=order.id).delete()
    Order.query.filter_by(food_item_id=item_id).delete()

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item deleted successfully"})
