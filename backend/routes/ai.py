import json
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Order, FoodItem, Shop

ai_bp = Blueprint("ai", __name__)


def get_gemini_client():
    try:
        from google import genai
        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return None
        return genai.Client(api_key=api_key)
    except ImportError:
        return None


def gemini_generate(client, prompt):
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    return response.text.strip()


@ai_bp.route("/recommendations", methods=["GET"])
@jwt_required()
def get_recommendations():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role != "customer":
        return jsonify({"error": "Only customers can get recommendations"}), 403

    # Get customer's order history
    past_orders = (
        Order.query.filter_by(customer_id=user_id)
        .filter(Order.status.in_(["confirmed", "picked_up"]))
        .order_by(Order.created_at.desc())
        .limit(10)
        .all()
    )

    # Get all currently available listings
    available_items = FoodItem.query.filter_by(is_available=True, is_archived=False).limit(30).all()

    if not available_items:
        return jsonify({"recommendations": []})

    client = get_gemini_client()

    # If no order history or no AI, return top 3 by discount
    if not past_orders or not client:
        top = sorted(
            available_items,
            key=lambda i: (i.original_price - i.discounted_price) / i.original_price,
            reverse=True
        )[:3]
        return jsonify({
            "recommendations": [
                {"id": i.id, "reason": "Top discount available today"} for i in top
            ]
        })

    # Build context for Gemini
    history_text = "\n".join([
        f"- {o.food_item.name} from {o.food_item.shop.name if o.food_item and o.food_item.shop else '?'} "
        f"({o.food_item.shop.category if o.food_item and o.food_item.shop else '?'})"
        for o in past_orders if o.food_item
    ])

    listings_text = "\n".join([
        f"ID:{item.id} | {item.name} | {item.shop.name if item.shop else '?'} | "
        f"{item.shop.category if item.shop else '?'} | "
        f"{int(item.discounted_price):,} UZS (was {int(item.original_price):,})"
        for item in available_items
    ])

    prompt = f"""You are a personalized food recommendation engine for Tejam, a food surplus marketplace in Uzbekistan.

Customer's past orders (what they've bought before):
{history_text}

Currently available listings:
{listings_text}

Based on the customer's taste preferences shown in their order history, pick the 3 best matching items from the available listings.
Consider: similar food types, similar shops/brands, similar price range, complementary foods.

Respond in JSON only:
[
  {{"id": <item_id>, "reason": "<one short sentence why this matches their taste>"}},
  {{"id": <item_id>, "reason": "<one short sentence>"}},
  {{"id": <item_id>, "reason": "<one short sentence>"}}
]

Return only valid JSON array, no markdown, no extra text."""

    try:
        raw = gemini_generate(client, prompt)
        clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        result = json.loads(clean)
        # Validate IDs exist in available items
        valid_ids = {i.id for i in available_items}
        result = [r for r in result if r.get("id") in valid_ids]
        return jsonify({"recommendations": result[:3]})
    except Exception:
        top = sorted(
            available_items,
            key=lambda i: (i.original_price - i.discounted_price) / i.original_price,
            reverse=True
        )[:3]
        return jsonify({
            "recommendations": [
                {"id": i.id, "reason": "Top discount available today"} for i in top
            ]
        })


@ai_bp.route("/describe", methods=["POST"])
@jwt_required()
def generate_description():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role != "shop":
        return jsonify({"error": "Only shop accounts can use this feature"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    name = data.get("name", "")
    category = data.get("category", "food")

    client = get_gemini_client()
    if not client:
        return jsonify({
            "description": f"Today's {name} — a surprise bag of surplus food from our kitchen, always worth more than the price. Freshly prepared and ready for pickup.",
            "contents_hint": f"May include: assorted {category.lower()} items prepared today",
        })

    prompt = f"""You are helping a food shop in Uzbekistan create a Surprise Bag listing on Tejam marketplace (like Too Good To Go).

Bag name: {name}
Category: {category}

Generate TWO things:
1. A short description (2-3 sentences) that:
   - Explains this is a surprise bag of surplus food
   - Highlights freshness and value
   - Sounds warm and inviting
   - Does NOT promise specific exact contents

2. A contents_hint (1 sentence starting with "May include:") that lists 3-5 typical items that MIGHT be in this bag, matching the bag name and category.

Respond in JSON only:
{{
  "description": "<2-3 sentence description>",
  "contents_hint": "May include: <item1>, <item2>, <item3>..."
}}

Return only valid JSON, no markdown."""

    try:
        raw = gemini_generate(client, prompt)
        clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        result = json.loads(clean)
        return jsonify({
            "description": result.get("description", ""),
            "contents_hint": result.get("contents_hint", ""),
        })
    except Exception:
        return jsonify({
            "description": f"Today's {name} — a surprise bag of surplus food from our kitchen, always worth more than the price. Freshly prepared and ready for pickup.",
            "contents_hint": f"May include: assorted {category.lower()} items prepared today",
        })


@ai_bp.route("/suggest-price", methods=["POST"])
@jwt_required()
def suggest_price():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    if user.role != "shop":
        return jsonify({"error": "Only shop accounts can use this feature"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    name = data.get("name", "")
    original_price = data.get("original_price", 0)
    category = data.get("category", "food")
    expiry_hours = data.get("expiry_hours", 24)

    client = get_gemini_client()
    if not client:
        suggested = round(float(original_price) * 0.5)
        return jsonify({
            "suggested_price": suggested,
            "discount_percent": 50,
            "reasoning": "Standard 50% discount for surplus food items.",
        })

    prompt = f"""You are a pricing advisor for Tejam, a food surplus marketplace in Uzbekistan (similar to Too Good To Go).

Food item: {name}
Category: {category}
Original price: {original_price} UZS
Hours until expiry/end of day: {expiry_hours}

Suggest an optimal discounted price to:
1. Attract customers quickly (surplus food needs to sell)
2. Still be profitable for the shop
3. Reflect Uzbek market conditions

Respond in JSON format only:
{{
  "suggested_price": <number in UZS>,
  "discount_percent": <number 1-100>,
  "reasoning": "<brief explanation>"
}}

Return only valid JSON, no extra text or markdown."""

    try:
        raw = gemini_generate(client, prompt)
        clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        result = json.loads(clean)
        return jsonify(result)
    except Exception:
        suggested = round(float(original_price) * 0.5)
        return jsonify({
            "suggested_price": suggested,
            "discount_percent": 50,
            "reasoning": "Recommended 50% discount for quick sale of surplus food.",
        })


def _build_live_context(user):
    """Build rich live context injected into every chat prompt."""
    from datetime import datetime, timedelta
    lines = []
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = today_start - timedelta(days=today_start.weekday())

    # ── SHOP OWNER ──────────────────────────────────────────────────────────
    if user.role == "shop" and user.shops:
        branch_names = ", ".join(f"{s.name} ({s.address.split(',')[0] if s.address else 'branch'})" for s in user.shops)
        lines.append(f"Shop owner managing {len(user.shops)} branch(es): {branch_names}")

        food_ids = [item.id for s in user.shops for item in s.food_items]
        listings = FoodItem.query.filter(FoodItem.id.in_(food_ids)).all() if food_ids else []

        # Listings breakdown
        available = [i for i in listings if i.is_available]
        hidden    = [i for i in listings if not i.is_available]
        lines.append(f"\nListings: {len(available)} active, {len(hidden)} hidden")
        if available:
            lines.append("Active listings:")
            for item in available:
                discount = round((item.original_price - item.discounted_price) / item.original_price * 100)
                lines.append(
                    f"  • {item.name} — {int(item.discounted_price):,} UZS "
                    f"(was {int(item.original_price):,}, -{discount}%) "
                    f"qty={item.quantity} | pickup {item.pickup_start}–{item.pickup_end}"
                )
        low_stock = [i for i in available if i.quantity <= 2]
        if low_stock:
            lines.append(f"⚠ Low stock (≤2 left): {', '.join(i.name for i in low_stock)}")

        # All orders for this shop
        all_orders = Order.query.filter(Order.food_item_id.in_(food_ids)).all() if food_ids else []

        # Today's orders
        today_orders  = [o for o in all_orders if o.created_at >= today_start]
        today_done    = [o for o in today_orders if o.status in ("confirmed", "picked_up")]
        today_pending = [o for o in today_orders if o.status == "pending"]
        today_revenue = sum(o.total_price for o in today_done)

        lines.append(f"\nToday's activity:")
        lines.append(f"  • Orders received today: {len(today_orders)}")
        lines.append(f"  • Completed today: {len(today_done)}")
        lines.append(f"  • Pending (needs action): {len(today_pending)}")
        lines.append(f"  • Revenue today: {int(today_revenue):,} UZS")

        if today_pending:
            lines.append(f"  • Pending order IDs: {', '.join(f'#{o.id}' for o in today_pending[:5])}")

        # This week
        week_orders  = [o for o in all_orders if o.created_at >= week_start]
        week_done    = [o for o in week_orders if o.status in ("confirmed", "picked_up")]
        week_revenue = sum(o.total_price for o in week_done)
        lines.append(f"\nThis week:")
        lines.append(f"  • Orders: {len(week_orders)} total, {len(week_done)} completed")
        lines.append(f"  • Revenue: {int(week_revenue):,} UZS")

        # Top selling items (all time)
        item_sales = {}
        for o in all_orders:
            if o.food_item and o.status in ("confirmed", "picked_up"):
                item_sales[o.food_item.name] = item_sales.get(o.food_item.name, 0) + o.quantity
        if item_sales:
            top = sorted(item_sales.items(), key=lambda x: x[1], reverse=True)[:3]
            lines.append(f"\nTop selling items: {', '.join(f'{n} ({q} sold)' for n, q in top)}")

        # All-time totals
        all_done    = [o for o in all_orders if o.status in ("confirmed", "picked_up")]
        all_revenue = sum(o.total_price for o in all_done)
        lines.append(f"All-time: {len(all_done)} completed orders, {int(all_revenue):,} UZS revenue")

    # ── CUSTOMER ─────────────────────────────────────────────────────────────
    elif user.role == "customer":
        # All available listings on the platform
        available_items = FoodItem.query.filter_by(is_available=True, is_archived=False).all()
        if available_items:
            lines.append(f"Currently available listings on Tejam ({len(available_items)} items):")
            # Sort by discount descending
            sorted_items = sorted(
                available_items,
                key=lambda i: (i.original_price - i.discounted_price) / i.original_price,
                reverse=True
            )
            for item in sorted_items:
                discount = round((item.original_price - item.discounted_price) / item.original_price * 100)
                shop_name = item.shop.name if item.shop else "?"
                shop_cat  = item.shop.category if item.shop else "?"
                lines.append(
                    f"  • {item.name} at {shop_name} ({shop_cat}) — "
                    f"{int(item.discounted_price):,} UZS (was {int(item.original_price):,}, -{discount}%) "
                    f"| pickup {item.pickup_start}–{item.pickup_end} | qty={item.quantity}"
                )

        # Customer's own orders
        my_orders = (
            Order.query.filter_by(customer_id=user.id)
            .order_by(Order.created_at.desc()).limit(10).all()
        )
        if my_orders:
            lines.append(f"\nYour recent orders:")
            for o in my_orders:
                name = o.food_item.name if o.food_item else "?"
                lines.append(f"  • Order #{o.id}: {name} — {o.status} ({int(o.total_price):,} UZS)")

    return "\n".join(lines) if lines else ""


@ai_bp.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    message_text = data.get("message", "")
    history = data.get("history", [])  # list of {role, content}

    if not message_text:
        return jsonify({"error": "message is required"}), 400

    client = get_gemini_client()
    if not client:
        return jsonify({
            "reply": "I'm Tejam's AI assistant! I can help you find the best food deals in Uzbekistan, suggest prices for your listings, or answer questions about reducing food waste. (AI service temporarily unavailable — please check your Gemini API key.)"
        })

    live_context = _build_live_context(user)

    system_prompt = f"""You are Tejam's AI assistant — a smart, data-aware helper for a food surplus marketplace in Uzbekistan (like Too Good To Go).

User: {user.name} (role: {user.role})

=== LIVE DATA (use this to answer questions accurately) ===
{live_context if live_context else "No live data available."}
=== END LIVE DATA ===

Rules:
- Always use the live data above to answer questions about prices, orders, sales, listings, deals — never say you don't have access to this information, because you do.
- For customers asking about deals/prices/cheapest items — refer to the listings in live data.
- For shop owners asking about today's sales, revenue, orders, pending — refer to the live data figures.
- Prices are in UZS (1 USD ≈ 12,700 UZS). City is Tashkent, Uzbekistan.
- Be concise, friendly, and direct. Use markdown (bold, bullets) for lists and comparisons.
- If asked something outside your data, answer based on general Uzbek food and marketplace knowledge."""

    # Build multi-turn contents list
    contents = [{"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "model", "parts": [{"text": "Understood! I'm ready to help."}]}]

    for msg in history[-10:]:  # last 10 messages for context window efficiency
        role = "user" if msg.get("role") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})

    contents.append({"role": "user", "parts": [{"text": message_text}]})

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
        )
        reply = response.text.strip()
        return jsonify({"reply": reply})
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            return jsonify({"error": "AI quota exceeded. Please try again in a few minutes."}), 429
        return jsonify({"error": f"AI service error: {error_str}"}), 500
