from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Shop, FoodItem, Order, Review

orders_bp = Blueprint("orders", __name__)


@orders_bp.route("/", methods=["GET"])
@jwt_required()
def list_orders():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role == "customer":
        orders = Order.query.filter_by(customer_id=user_id).order_by(Order.created_at.desc()).all()
    elif user.role == "shop" and user.shop:
        # Get orders for all food items belonging to this shop
        food_ids = [item.id for item in user.shop.food_items]
        orders = (
            Order.query.filter(Order.food_item_id.in_(food_ids))
            .order_by(Order.created_at.desc())
            .all()
        )
    else:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify([o.to_dict() for o in orders])


@orders_bp.route("/", methods=["POST"])
@jwt_required()
def create_order():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role != "customer":
        return jsonify({"error": "Only customers can place orders"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    food_item_id = data.get("food_item_id")
    quantity = int(data.get("quantity", 1))

    if not food_item_id:
        return jsonify({"error": "food_item_id is required"}), 400

    item = FoodItem.query.get_or_404(food_item_id)
    if not item.is_available:
        return jsonify({"error": "This item is no longer available"}), 400
    if item.quantity < quantity:
        return jsonify({"error": f"Only {item.quantity} items available"}), 400

    total_price = item.discounted_price * quantity

    order = Order(
        customer_id=user_id,
        food_item_id=food_item_id,
        quantity=quantity,
        total_price=total_price,
        status="pending",
        notes=data.get("notes", ""),
    )

    # Reduce available quantity
    item.quantity -= quantity
    if item.quantity == 0:
        item.is_available = False

    db.session.add(order)
    db.session.commit()
    return jsonify(order.to_dict()), 201


@orders_bp.route("/<int:order_id>/status", methods=["PUT"])
@jwt_required()
def update_status(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    order = Order.query.get_or_404(order_id)

    if user.role != "shop":
        return jsonify({"error": "Only shop owners can update order status"}), 403

    if not user.shop or order.food_item.shop_id != user.shop.id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    new_status = data.get("status")
    valid_statuses = ["pending", "confirmed", "picked_up", "cancelled"]
    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {valid_statuses}"}), 400

    order.status = new_status
    db.session.commit()
    return jsonify(order.to_dict())


@orders_bp.route("/<int:order_id>", methods=["DELETE"])
@jwt_required()
def cancel_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get_or_404(order_id)

    if order.customer_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    if order.status != "pending":
        return jsonify({"error": "Only pending orders can be cancelled"}), 400

    # Restore quantity
    item = FoodItem.query.get(order.food_item_id)
    if item:
        item.quantity += order.quantity
        item.is_available = True

    order.status = "cancelled"
    db.session.commit()
    return jsonify({"message": "Order cancelled successfully"})


@orders_bp.route("/<int:order_id>/review", methods=["POST"])
@jwt_required()
def create_review(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get_or_404(order_id)

    if order.customer_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    if order.status != "picked_up":
        return jsonify({"error": "Can only review picked up orders"}), 400

    if order.review:
        return jsonify({"error": "Order already reviewed"}), 409

    data = request.get_json()
    rating = data.get("rating")
    if not rating or not (1 <= int(rating) <= 5):
        return jsonify({"error": "Rating must be between 1 and 5"}), 400

    review = Review(
        order_id=order_id,
        customer_id=user_id,
        shop_id=order.food_item.shop_id,
        rating=int(rating),
        comment=data.get("comment", ""),
    )
    db.session.add(review)

    # Update shop rating
    shop = order.food_item.shop
    if shop:
        all_reviews = Review.query.filter_by(shop_id=shop.id).all()
        total = sum(r.rating for r in all_reviews) + int(rating)
        shop.rating = total / (len(all_reviews) + 1)

    db.session.commit()
    return jsonify(review.to_dict()), 201


@orders_bp.route("/stats", methods=["GET"])
@jwt_required()
def shop_stats():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role != "shop" or not user.shop:
        return jsonify({"error": "Shop account required"}), 403

    shop = user.shop
    food_ids = [item.id for item in shop.food_items]

    all_orders = Order.query.filter(Order.food_item_id.in_(food_ids)).all() if food_ids else []
    completed = [o for o in all_orders if o.status in ("confirmed", "picked_up")]

    total_revenue = sum(o.total_price for o in completed)
    total_orders = len(all_orders)
    items_listed = len(shop.food_items)
    avg_rating = shop.rating

    # Revenue by day (last 7 days)
    today = datetime.utcnow().date()
    daily_revenue = {}
    for i in range(7):
        day = today - timedelta(days=i)
        daily_revenue[day.isoformat()] = 0

    for o in completed:
        day_key = o.created_at.date().isoformat()
        if day_key in daily_revenue:
            daily_revenue[day_key] += o.total_price

    revenue_chart = [
        {"date": k, "revenue": v}
        for k, v in sorted(daily_revenue.items())
    ]

    # Top items by orders
    item_counts = {}
    for o in all_orders:
        name = o.food_item.name if o.food_item else "Unknown"
        item_counts[name] = item_counts.get(name, 0) + o.quantity

    top_items = sorted(
        [{"name": k, "orders": v} for k, v in item_counts.items()],
        key=lambda x: x["orders"],
        reverse=True,
    )[:5]

    return jsonify({
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "items_listed": items_listed,
        "avg_rating": round(avg_rating, 2),
        "revenue_chart": revenue_chart,
        "top_items": top_items,
    })


@orders_bp.route("/pickup/<token>", methods=["GET"])
def get_pickup_order(token):
    """Public endpoint — shop scans QR and sees order details."""
    order = Order.query.filter_by(pickup_token=token).first_or_404()
    data = order.to_dict()
    data["customer_name"] = order.customer.name if order.customer else None
    data["customer_phone"] = order.customer.phone if order.customer else None
    return jsonify(data)


@orders_bp.route("/pickup/<token>/confirm", methods=["PUT"])
@jwt_required()
def confirm_pickup(token):
    """Shop confirms the pickup — marks order as picked_up."""
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    order = Order.query.filter_by(pickup_token=token).first_or_404()

    if user.role != "shop":
        return jsonify({"error": "Only shop accounts can confirm pickups"}), 403
    if not user.shop or order.food_item.shop_id != user.shop.id:
        return jsonify({"error": "This order does not belong to your shop"}), 403
    if order.status == "cancelled":
        return jsonify({"error": "Cannot confirm a cancelled order"}), 400
    if order.status == "picked_up":
        return jsonify({"error": "Order already picked up"}), 400

    order.status = "picked_up"
    db.session.commit()
    return jsonify(order.to_dict())
