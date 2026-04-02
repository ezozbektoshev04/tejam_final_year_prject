from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Shop, Order, FoodItem

admin_bp = Blueprint("admin", __name__)


def require_admin():
    """Returns current user if admin, else None."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "admin":
        return None
    return user


# ── Stats overview ────────────────────────────────────────────────────────────

@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
def stats():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    total_customers = User.query.filter_by(role="customer").count()
    total_shops = User.query.filter_by(role="shop").count()
    total_orders = Order.query.count()
    total_listings = FoodItem.query.count()
    revenue = db.session.query(db.func.sum(Order.total_price)).filter(
        Order.status == "picked_up"
    ).scalar() or 0

    pending_orders = Order.query.filter_by(status="pending").count()
    confirmed_orders = Order.query.filter_by(status="confirmed").count()

    return jsonify({
        "total_customers": total_customers,
        "total_shops": total_shops,
        "total_orders": total_orders,
        "total_listings": total_listings,
        "total_revenue": round(revenue),
        "pending_orders": pending_orders,
        "confirmed_orders": confirmed_orders,
    })


# ── Users ─────────────────────────────────────────────────────────────────────

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    role_filter = request.args.get("role")  # 'customer' | 'shop'
    query = User.query.filter(User.role != "admin")
    if role_filter:
        query = query.filter_by(role=role_filter)

    users = query.order_by(User.created_at.desc()).all()

    result = []
    for u in users:
        data = u.to_dict()
        if u.role == "customer":
            data["order_count"] = Order.query.filter_by(customer_id=u.id).count()
        if u.role == "shop" and u.shop:
            data["shop"] = u.shop.to_dict()
            data["listing_count"] = FoodItem.query.filter_by(shop_id=u.shop.id).count()
            data["order_count"] = Order.query.join(FoodItem).filter(
                FoodItem.shop_id == u.shop.id
            ).count()
        result.append(data)

    return jsonify(result)


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get_or_404(user_id)
    if user.role == "admin":
        return jsonify({"error": "Cannot delete admin account"}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"})


# ── Shops ─────────────────────────────────────────────────────────────────────

@admin_bp.route("/shops", methods=["GET"])
@jwt_required()
def list_shops():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    shops = Shop.query.order_by(Shop.id).all()
    result = []
    for s in shops:
        data = s.to_dict()
        owner = User.query.get(s.user_id)
        data["owner_name"] = owner.name if owner else None
        data["owner_email"] = owner.email if owner else None
        data["listing_count"] = FoodItem.query.filter_by(shop_id=s.id).count()
        data["order_count"] = Order.query.join(FoodItem).filter(
            FoodItem.shop_id == s.id
        ).count()
        result.append(data)
    return jsonify(result)


@admin_bp.route("/shops/<int:shop_id>/toggle", methods=["PUT"])
@jwt_required()
def toggle_shop(shop_id):
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    shop = Shop.query.get_or_404(shop_id)
    shop.is_active = not shop.is_active
    db.session.commit()
    return jsonify({"id": shop.id, "is_active": shop.is_active})
