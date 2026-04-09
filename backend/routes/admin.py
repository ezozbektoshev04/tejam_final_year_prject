import json
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Shop, Order, FoodItem, PlatformSetting, Notification

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
    total_shops = User.query.filter_by(role="shop", is_approved=True).count()
    pending_shop_approvals = User.query.filter_by(role="shop", is_approved=False).count()
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
        "pending_shop_approvals": pending_shop_approvals,
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
        if u.role == "shop" and u.shops:
            shop_ids = [s.id for s in u.shops]
            data["shops"] = [s.to_dict() for s in u.shops]
            data["listing_count"] = FoodItem.query.filter(FoodItem.shop_id.in_(shop_ids)).count()
            data["order_count"] = Order.query.join(FoodItem).filter(
                FoodItem.shop_id.in_(shop_ids)
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


# ── Platform Settings ─────────────────────────────────────────────────────────

ALLOWED_KEYS = {
    "categories",
    "min_discount_percent",
    "max_discount_percent",
    "low_stock_threshold",
    "notification_order_placed",
    "notification_order_confirmed",
    "notification_order_picked_up",
    "notification_order_cancelled",
}


@admin_bp.route("/settings", methods=["GET"])
@jwt_required()
def get_settings():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    rows = PlatformSetting.query.filter(PlatformSetting.key.in_(ALLOWED_KEYS)).all()
    result = {}
    for row in rows:
        try:
            result[row.key] = json.loads(row.value)
        except Exception:
            result[row.key] = row.value
    return jsonify(result)


@admin_bp.route("/pending-shops", methods=["GET"])
@jwt_required()
def pending_shops():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    users = User.query.filter_by(role="shop", is_approved=False).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        data = u.to_dict()
        data["shops"] = [s.to_dict() for s in u.shops]
        result.append(data)
    return jsonify(result)


@admin_bp.route("/approve-shop/<int:user_id>", methods=["POST"])
@jwt_required()
def approve_shop(user_id):
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get_or_404(user_id)
    if user.role != "shop":
        return jsonify({"error": "User is not a shop owner"}), 400

    user.is_approved = True
    notif = Notification(
        user_id=user.id,
        message="Your shop has been approved! You can now log in and start listing your surplus food.",
        link="/dashboard",
    )
    db.session.add(notif)
    db.session.commit()
    return jsonify({"message": f"Shop owner '{user.name}' approved successfully."})


@admin_bp.route("/reject-shop/<int:user_id>", methods=["DELETE"])
@jwt_required()
def reject_shop(user_id):
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    user = User.query.get_or_404(user_id)
    if user.role != "shop":
        return jsonify({"error": "User is not a shop owner"}), 400
    if user.is_approved:
        return jsonify({"error": "Cannot reject an already approved shop"}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Shop application rejected and account removed."})


@admin_bp.route("/settings", methods=["PUT"])
@jwt_required()
def update_settings():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    for key, value in data.items():
        if key not in ALLOWED_KEYS:
            continue
        PlatformSetting.set(key, value)

    db.session.commit()
    return jsonify({"message": "Settings updated successfully"})
