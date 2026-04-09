from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Shop, FoodItem, Order, Review, PlatformSetting
from utils.notifications import create_notification

orders_bp = Blueprint("orders", __name__)


def _apply_commission(order):
    """Calculate and set commission_rate, commission_amount, shop_payout on an order."""
    rate = PlatformSetting.get("commission_rate", 0.10)
    order.commission_rate   = round(float(rate), 4)
    order.commission_amount = round(order.total_price * order.commission_rate, 2)
    order.shop_payout       = round(order.total_price - order.commission_amount, 2)


@orders_bp.route("/", methods=["GET"])
@jwt_required()
def list_orders():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role == "customer":
        try:
            page = max(1, int(request.args.get("page", 1)))
            per_page = max(1, int(request.args.get("per_page", 10)))
        except ValueError:
            page, per_page = 1, 10

        base = Order.query.filter_by(customer_id=user_id)

        # Status counts for tabs (always computed on full set)
        active_statuses = ["pending_payment", "pending", "confirmed"]
        status_counts = {
            "active":    base.filter(Order.status.in_(active_statuses)).count(),
            "completed": base.filter(Order.status == "picked_up").count(),
            "cancelled": base.filter(Order.status == "cancelled").count(),
        }
        total_spent = db.session.query(db.func.sum(Order.total_price)).filter(
            Order.customer_id == user_id, Order.status == "picked_up"
        ).scalar() or 0

        # Apply tab filter
        tab = request.args.get("tab", "active")
        query = base.order_by(Order.created_at.desc())
        if tab == "active":
            query = query.filter(Order.status.in_(active_statuses))
        elif tab == "completed":
            query = query.filter(Order.status == "picked_up")
        elif tab == "cancelled":
            query = query.filter(Order.status == "cancelled")

        total = query.count()
        orders = query.offset((page - 1) * per_page).limit(per_page).all()
        return jsonify({
            "orders": [o.to_dict() for o in orders],
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": max(1, -(-total // per_page)),
            "status_counts": status_counts,
            "total_spent": round(total_spent),
        })

    elif user.role == "shop" and user.shops:
        # --- optional filters ---
        shop_id_filter = request.args.get("shop_id", type=int)
        status_filter  = request.args.get("status")
        payment_filter = request.args.get("payment")
        search         = request.args.get("search", "").strip()
        start_str      = request.args.get("start")
        end_str        = request.args.get("end")
        page           = request.args.get("page", 1, type=int)
        per_page       = request.args.get("per_page", 20, type=int)

        # Resolve which food_ids belong to this owner (optionally filtered by branch)
        owner_shop_ids = [s.id for s in user.shops]
        if shop_id_filter:
            if shop_id_filter not in owner_shop_ids:
                return jsonify({"error": "Unauthorized"}), 403
            from models import Shop as ShopModel
            target = ShopModel.query.get_or_404(shop_id_filter)
            food_ids = [item.id for item in target.food_items]
        else:
            food_ids = [item.id for s in user.shops for item in s.food_items]

        query = Order.query.filter(Order.food_item_id.in_(food_ids))

        if status_filter:
            query = query.filter(Order.status == status_filter)
        if payment_filter:
            query = query.filter(Order.payment_method == payment_filter)
        if start_str:
            try:
                query = query.filter(Order.created_at >= datetime.strptime(start_str, "%Y-%m-%d"))
            except ValueError:
                pass
        if end_str:
            try:
                end_dt = datetime.strptime(end_str, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                query = query.filter(Order.created_at <= end_dt)
            except ValueError:
                pass
        if search:
            # search by order id (exact) or item name (partial)
            try:
                oid = int(search)
                query = query.filter(Order.id == oid)
            except ValueError:
                query = query.join(FoodItem).filter(FoodItem.name.ilike(f"%{search}%"))

        query = query.order_by(Order.created_at.desc())
        total = query.count()
        orders = query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            "orders": [o.to_dict() for o in orders],
            "total": total,
            "page": page,
            "per_page": per_page,
        })

    else:
        return jsonify({"error": "This endpoint is for customer accounts only"}), 403


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
        payment_method="cash",
        notes=data.get("notes", ""),
    )
    _apply_commission(order)

    # Reduce available quantity
    item.quantity -= quantity

    db.session.add(order)
    db.session.flush()  # get order.id / order_ref before commit

    shop_owner_id = item.shop.owner.id if item.shop and item.shop.owner else None
    ref = order.order_ref or f"#{order.id}"
    shop_name = item.shop.name if item.shop else "the shop"

    # Notify customer — order placed confirmation
    create_notification(
        user_id,
        f"Order {ref} placed! Head to {shop_name} between {item.pickup_start}–{item.pickup_end} to pick up your '{item.name}'. Show your QR code at the counter.",
        link="/orders",
    )

    # Notify shop owner of new order
    if shop_owner_id:
        create_notification(
            shop_owner_id,
            f"New order {ref} — {item.name} × {quantity}",
            link="/shop-orders",
        )

    # Auto-archive + sold-out notification when quantity hits 0
    if item.quantity <= 0:
        item.quantity = 0
        item.is_available = False
        item.is_archived = True
        if shop_owner_id:
            create_notification(
                shop_owner_id,
                f"'{item.name}' is sold out and has been archived. Restore it anytime to relist.",
                link="/listings",
            )
    # Low stock warning (configurable threshold, not yet zero)
    elif item.quantity <= PlatformSetting.get("low_stock_threshold", 2):
        if shop_owner_id:
            create_notification(
                shop_owner_id,
                f"Low stock: '{item.name}' has only {item.quantity} portion{'s' if item.quantity > 1 else ''} left.",
                link="/listings",
            )

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

    shop_ids = [s.id for s in user.shops]
    if order.food_item.shop_id not in shop_ids:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    new_status = data.get("status")

    # Allowed transitions — strict state machine
    allowed_transitions = {
        "pending":   ["confirmed", "cancelled"],
        "confirmed": ["picked_up"],
    }

    if order.status == "picked_up":
        return jsonify({"error": "Cannot change status of an already picked up order"}), 400
    if order.status == "cancelled":
        return jsonify({"error": "Cannot change status of a cancelled order"}), 400

    allowed = allowed_transitions.get(order.status, [])
    if new_status not in allowed:
        return jsonify({"error": f"Cannot transition from '{order.status}' to '{new_status}'. Allowed: {allowed}"}), 400

    order.status = new_status

    # Notify customer
    ref = order.order_ref or f"#{order.id}"
    food_name = order.food_item.name if order.food_item else "your order"
    messages = {
        "confirmed":  f"Great news! Your order {ref} has been confirmed by the shop. Head over and show your QR code!",
        "picked_up":  f"Enjoy your meal! 🎉 Order {ref} — '{food_name}' has been picked up. Thanks for choosing Tejam and helping reduce food waste!",
        "cancelled":  f"Your order {ref} for '{food_name}' was cancelled by the shop. Sorry for the inconvenience!",
    }
    msg = messages.get(new_status)
    if msg:
        create_notification(order.customer_id, msg, link="/orders")

    db.session.commit()
    return jsonify(order.to_dict())


@orders_bp.route("/<int:order_id>", methods=["DELETE"])
@jwt_required()
def cancel_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get_or_404(order_id)

    if order.customer_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    if order.status not in ("pending", "pending_payment"):
        return jsonify({"error": "Only pending orders can be cancelled"}), 400

    # Refund online payment if Stripe was charged (status=pending means payment went through)
    if order.payment_method == "online" and order.status == "pending":
        try:
            import stripe
            stripe.api_key = current_app.config.get("STRIPE_SECRET_KEY", "")
            if stripe.api_key:
                # Find the Stripe PaymentIntent via the order metadata
                sessions = stripe.checkout.Session.list(limit=10)
                for s in sessions.auto_paging_iter():
                    if s.get("metadata", {}).get("order_id") == str(order.id):
                        if s.payment_intent:
                            stripe.Refund.create(payment_intent=s.payment_intent)
                        break
        except Exception as e:
            print(f"[REFUND ERROR] order {order.id}: {e}")

    # Restore stock only if it was already decremented (pending, not pending_payment)
    if order.status == "pending":
        item = FoodItem.query.get(order.food_item_id)
        if item:
            was_sold_out = item.quantity == 0
            item.quantity += order.quantity

            # Un-archive only if the item was archived due to being sold out
            # (quantity was 0), not if the shop manually archived it
            if was_sold_out and item.is_archived:
                item.is_archived = False
                item.is_available = True
            elif not item.is_archived:
                item.is_available = True

            # Notify shop owner about cancellation and stock restore
            shop_owner_id = item.shop.owner.id if item.shop and item.shop.owner else None
            if shop_owner_id:
                ref = order.order_ref or f"#{order.id}"
                create_notification(
                    shop_owner_id,
                    f"Order {ref} cancelled by customer — '{item.name}' · {order.quantity} portion{'s' if order.quantity > 1 else ''} returned to stock.",
                    link="/shop-orders",
                )

    order.status = "cancelled"

    # Notify the customer about their own cancellation confirmation
    ref = order.order_ref or f"#{order.id}"
    item = FoodItem.query.get(order.food_item_id)
    item_name = item.name if item else "your item"
    create_notification(
        order.customer_id,
        f"You cancelled order {ref} for '{item_name}'. We hope to see you again soon!",
        link="/orders",
    )

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
        food_item_id=order.food_item_id,
        rating=int(rating),
        comment=data.get("comment", ""),
    )
    db.session.add(review)

    # Update shop rating — query existing reviews BEFORE the new one is flushed
    shop = order.food_item.shop
    if shop:
        existing_reviews = Review.query.filter_by(shop_id=shop.id).all()
        all_ratings = [r.rating for r in existing_reviews] + [int(rating)]
        shop.rating = round(sum(all_ratings) / len(all_ratings), 2)

    db.session.commit()
    return jsonify(review.to_dict()), 201


@orders_bp.route("/stats", methods=["GET"])
@jwt_required()
def shop_stats():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role != "shop" or not user.shops:
        return jsonify({"error": "Shop account required"}), 403

    # Optional: filter by a single branch
    shop_id_filter = request.args.get("shop_id", type=int)
    if shop_id_filter:
        shop_ids = [s.id for s in user.shops]
        if shop_id_filter not in shop_ids:
            return jsonify({"error": "Unauthorized"}), 403
        from models import Shop as ShopModel
        target_shop = ShopModel.query.get_or_404(shop_id_filter)
        food_ids = [item.id for item in target_shop.food_items]
        avg_rating = target_shop.rating
    else:
        food_ids = [item.id for s in user.shops for item in s.food_items]
        ratings = [s.rating for s in user.shops if s.rating]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0

    # Date range filter (default: last 7 days)
    days_param = request.args.get("days", 7, type=int)   # 7 | 30 | 90
    start_str  = request.args.get("start")
    end_str    = request.args.get("end")
    today = datetime.utcnow().date()

    if start_str and end_str:
        try:
            range_start = datetime.strptime(start_str, "%Y-%m-%d").date()
            range_end   = datetime.strptime(end_str,   "%Y-%m-%d").date()
        except ValueError:
            range_start = today - timedelta(days=6)
            range_end   = today
    else:
        range_start = today - timedelta(days=days_param - 1)
        range_end   = today

    all_orders = Order.query.filter(Order.food_item_id.in_(food_ids)).all() if food_ids else []
    completed  = [o for o in all_orders if o.status in ("confirmed", "picked_up")]

    total_revenue    = sum(o.total_price for o in completed)
    total_payout     = sum(o.shop_payout or 0 for o in completed)
    commission_total = sum(o.commission_amount or 0 for o in completed)
    total_orders     = len(all_orders)
    items_listed     = len(food_ids)

    # Revenue chart — one entry per day in selected range
    num_days = (range_end - range_start).days + 1
    daily_revenue = {}
    for i in range(num_days):
        day = range_start + timedelta(days=i)
        daily_revenue[day.isoformat()] = 0

    for o in completed:
        day_key = o.created_at.date().isoformat()
        if day_key in daily_revenue:
            daily_revenue[day_key] += o.shop_payout or 0

    revenue_chart = [
        {"date": k, "revenue": v}
        for k, v in sorted(daily_revenue.items())
    ]

    # Order status breakdown
    status_counts = {"pending": 0, "confirmed": 0, "picked_up": 0, "cancelled": 0}
    for o in all_orders:
        if o.status in status_counts:
            status_counts[o.status] += 1
    status_chart = [{"status": k, "count": v} for k, v in status_counts.items()]

    # Revenue by category
    category_revenue = {}
    for o in completed:
        cat = o.food_item.shop.category if o.food_item and o.food_item.shop else "Other"
        category_revenue[cat] = category_revenue.get(cat, 0) + (o.shop_payout or 0)
    category_chart = sorted(
        [{"category": k, "revenue": v} for k, v in category_revenue.items()],
        key=lambda x: x["revenue"], reverse=True
    )

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
        "total_revenue":    total_revenue,
        "total_payout":     round(total_payout, 2),
        "commission_total": round(commission_total, 2),
        "total_orders":     total_orders,
        "items_listed":     items_listed,
        "avg_rating":       round(avg_rating, 2),
        "revenue_chart":    revenue_chart,
        "status_chart":     status_chart,
        "category_chart":   category_chart,
        "top_items":        top_items,
        "range_start":      range_start.isoformat(),
        "range_end":        range_end.isoformat(),
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
    shop_ids = [s.id for s in user.shops]
    if order.food_item.shop_id not in shop_ids:
        return jsonify({"error": "This order does not belong to your shop"}), 403
    if order.status == "cancelled":
        return jsonify({"error": "Cannot confirm a cancelled order"}), 400
    if order.status == "picked_up":
        return jsonify({"error": "Order already picked up"}), 400

    order.status = "picked_up"
    create_notification(
        order.customer_id,
        f"Order #{order.id} marked as picked up. Enjoy your meal!",
        link="/orders",
    )
    db.session.commit()
    return jsonify(order.to_dict())
