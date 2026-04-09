import stripe
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, FoodItem, Order

payments_bp = Blueprint("payments", __name__)


@payments_bp.route("/create-checkout-session", methods=["POST"])
@jwt_required()
def create_checkout_session():
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
    frontend_url = current_app.config["FRONTEND_URL"]

    user_id = int(get_jwt_identity())
    data = request.get_json()

    food_item_id = data.get("food_item_id")
    quantity = int(data.get("quantity", 1))
    notes = data.get("notes", "")

    item = FoodItem.query.get_or_404(food_item_id)

    if not item.is_available or item.quantity < quantity:
        return jsonify({"error": "Item not available in requested quantity"}), 400

    # Create order pre-payment
    order = Order(
        customer_id=user_id,
        food_item_id=food_item_id,
        quantity=quantity,
        total_price=item.discounted_price * quantity,
        status="pending_payment",
        payment_method="online",
        notes=notes,
    )
    db.session.add(order)
    db.session.commit()

    # Convert UZS → USD cents for Stripe (demo: 1 USD = 12,800 UZS)
    # Minimum charge is $0.50 (50 cents)
    uzs_total = item.discounted_price * quantity
    amount_cents = max(50, int(uzs_total / 128))

    images = []
    if item.image_url and item.image_url.startswith("http"):
        images = [item.image_url]

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": item.name,
                        "description": f"Pickup from {item.shop.name} · {item.shop.city}",
                        "images": images,
                    },
                    "unit_amount": amount_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=(
                f"{frontend_url}/payment/success"
                f"?session_id={{CHECKOUT_SESSION_ID}}&order_id={order.id}"
            ),
            cancel_url=f"{frontend_url}/food/{food_item_id}",
            metadata={"order_id": str(order.id), "user_id": str(user_id)},
        )
        return jsonify({"checkout_url": session.url, "order_id": order.id})

    except stripe.StripeError as e:
        # Roll back the pre-created order if Stripe fails
        db.session.delete(order)
        db.session.commit()
        return jsonify({"error": str(e)}), 400


@payments_bp.route("/verify", methods=["POST"])
@jwt_required()
def verify_payment():
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]

    user_id = int(get_jwt_identity())
    data = request.get_json()

    session_id = data.get("session_id")
    order_id = int(data.get("order_id"))

    order = Order.query.get_or_404(order_id)

    if order.customer_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    # Already verified (idempotent)
    if order.status == "pending":
        return jsonify(order.to_dict())

    if order.status != "pending_payment":
        return jsonify({"error": "Order is not awaiting payment"}), 400

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.StripeError as e:
        return jsonify({"error": str(e)}), 400

    if session.payment_status != "paid":
        return jsonify({"error": "Payment not completed"}), 400

    if session.metadata["order_id"] != str(order_id):
        return jsonify({"error": "Session / order mismatch"}), 400

    # Confirm the order and decrement stock
    item = order.food_item
    if item.quantity < order.quantity:
        # Item sold out between checkout start and payment confirmation — cancel and refund
        order.status = "cancelled"
        db.session.commit()
        return jsonify({"error": "Sorry, this item sold out while your payment was processing. You will be refunded automatically."}), 409

    order.status = "pending"
    item.quantity -= order.quantity
    if item.quantity == 0:
        item.is_available = False
        item.is_archived = True

    db.session.commit()
    return jsonify(order.to_dict())


@payments_bp.route("/retry/<int:order_id>", methods=["POST"])
@jwt_required()
def retry_payment(order_id):
    """Create a new Stripe session for an existing pending_payment order."""
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
    frontend_url = current_app.config["FRONTEND_URL"]

    user_id = int(get_jwt_identity())
    order = Order.query.get_or_404(order_id)

    if order.customer_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    if order.status != "pending_payment":
        return jsonify({"error": "Order is not awaiting payment"}), 400

    item = order.food_item
    images = []
    if item.image_url and item.image_url.startswith("http"):
        images = [item.image_url]

    amount_cents = max(50, int(order.total_price / 128))

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": item.name,
                        "description": f"Pickup from {item.shop.name} · {item.shop.city}",
                        "images": images,
                    },
                    "unit_amount": amount_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=(
                f"{frontend_url}/payment/success"
                f"?session_id={{CHECKOUT_SESSION_ID}}&order_id={order.id}"
            ),
            cancel_url=f"{frontend_url}/food/{item.id}",
            metadata={"order_id": str(order.id), "user_id": str(user_id)},
        )
        return jsonify({"checkout_url": session.url})
    except stripe.StripeError as e:
        return jsonify({"error": str(e)}), 400
