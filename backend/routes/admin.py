import json
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Shop, Order, FoodItem, PlatformSetting, Notification
from utils.email import send_shop_approved_email, send_account_deleted_email, send_shop_status_email

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

    email, name, role = user.email, user.name, user.role
    db.session.delete(user)
    db.session.commit()
    send_account_deleted_email(email, name, role)
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

    owner = User.query.get(shop.user_id)
    if owner:
        send_shop_status_email(owner.email, owner.name, shop.name, deactivated=not shop.is_active)

    return jsonify({"id": shop.id, "is_active": shop.is_active})


# ── Platform Settings ─────────────────────────────────────────────────────────

ALLOWED_KEYS = {
    "categories",
    "min_discount_percent",
    "max_discount_percent",
    "low_stock_threshold",
    "commission_rate",
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
    shop_name = user.shops[0].name if user.shops else user.name
    notif = Notification(
        user_id=user.id,
        message="Your shop has been approved! You can now log in and start listing your surplus food.",
        link="/dashboard",
    )
    db.session.add(notif)
    db.session.commit()
    send_shop_approved_email(user.email, user.name, shop_name)
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

    email, name = user.email, user.name
    db.session.delete(user)
    db.session.commit()
    send_account_deleted_email(email, name, "shop")
    return jsonify({"message": "Shop application rejected and account removed."})


@admin_bp.route("/earnings", methods=["GET"])
@jwt_required()
def earnings():
    if not require_admin():
        return jsonify({"error": "Admin access required"}), 403

    completed = Order.query.filter_by(status="picked_up").all()

    total_commission = sum(o.commission_amount or 0 for o in completed)
    total_revenue    = sum(o.total_price for o in completed)
    total_payout     = sum(o.shop_payout or 0 for o in completed)

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)

    this_month_commission = sum(
        o.commission_amount or 0 for o in completed if o.created_at >= month_start
    )
    last_month_commission = sum(
        o.commission_amount or 0 for o in completed
        if last_month_start <= o.created_at < month_start
    )

    from collections import defaultdict
    shop_stats = defaultdict(lambda: {"orders": 0, "revenue": 0.0, "commission": 0.0, "payout": 0.0})
    for o in completed:
        item = o.food_item
        if item and item.shop:
            key = item.shop.id
            shop_stats[key]["shop_id"]   = key
            shop_stats[key]["shop_name"] = item.shop.name
            shop_stats[key]["orders"]    += 1
            shop_stats[key]["revenue"]   += o.total_price
            shop_stats[key]["commission"] += o.commission_amount or 0
            shop_stats[key]["payout"]    += o.shop_payout or 0

    per_shop = sorted(shop_stats.values(), key=lambda x: x["commission"], reverse=True)
    for s in per_shop:
        s["revenue"]    = round(s["revenue"])
        s["commission"] = round(s["commission"])
        s["payout"]     = round(s["payout"])

    return jsonify({
        "total_commission":      round(total_commission),
        "total_revenue":         round(total_revenue),
        "total_payout":          round(total_payout),
        "this_month_commission": round(this_month_commission),
        "last_month_commission": round(last_month_commission),
        "completed_orders":      len(completed),
        "per_shop":              per_shop,
    })


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
