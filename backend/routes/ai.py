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
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text.strip()


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
    ingredients = data.get("ingredients", "")
    category = data.get("category", "food")

    client = get_gemini_client()
    if not client:
        return jsonify({
            "description": f"Fresh {name} — prepared with care and available at a special discounted price. Perfect for a quick and delicious meal!"
        })

    prompt = f"""You are helping a food shop in Uzbekistan write an appealing description for their surplus food listing on Tejam marketplace.

Food item: {name}
Category: {category}
{f"Ingredients: {ingredients}" if ingredients else ""}

Write a short, appetizing description (2-3 sentences) that:
1. Highlights the freshness and quality
2. Mentions it's available at a discounted price (surplus food)
3. Sounds warm and inviting
4. Is appropriate for Uzbek food culture

Return only the description text, no extra formatting."""

    try:
        description = gemini_generate(client, prompt)
        return jsonify({"description": description})
    except Exception as e:
        return jsonify({
            "description": f"Fresh {name} — prepared with care and available at a special discounted price. Perfect for a quick and delicious meal!"
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
    """Build a context string with the user's real data from the DB."""
    lines = []
    if user.role == "shop" and user.shops:
        lines.append(f"Shop owner of: {', '.join(s.name for s in user.shops)} ({len(user.shops)} branches)")
        food_ids = [item.id for s in user.shops for item in s.food_items]
        listings = FoodItem.query.filter(FoodItem.id.in_(food_ids)).all() if food_ids else []
        if listings:
            lines.append("Current listings:")
            for item in listings[:8]:
                status = "available" if item.is_available else "hidden"
                lines.append(f"  - {item.name}: {int(item.discounted_price):,} UZS (was {int(item.original_price):,}) qty={item.quantity} [{status}]")
        low_stock = [i for i in listings if i.quantity <= 2 and i.is_available]
        if low_stock:
            lines.append(f"Low stock items (≤2 left): {', '.join(i.name for i in low_stock)}")
        recent_orders = (
            Order.query.filter(Order.food_item_id.in_(food_ids))
            .order_by(Order.created_at.desc()).limit(5).all()
        ) if food_ids else []
        pending = [o for o in recent_orders if o.status == "pending"]
        if pending:
            lines.append(f"Pending orders needing attention: {len(pending)}")

    elif user.role == "customer":
        recent_orders = (
            Order.query.filter_by(customer_id=user.id)
            .order_by(Order.created_at.desc()).limit(5).all()
        )
        if recent_orders:
            lines.append("Recent orders:")
            for o in recent_orders:
                lines.append(f"  - Order #{o.id}: {o.food_item.name if o.food_item else '?'} — {o.status}")

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

    system_prompt = f"""You are Tejam's helpful AI assistant. Tejam is a food surplus marketplace in Uzbekistan (like Too Good To Go) connecting shops with surplus food to customers at discounted prices, reducing food waste.

Current user: {user.name} (role: {user.role})
{f"Live account data:\n{live_context}" if live_context else ""}

You know about:
- Uzbek cuisine: plov, samsa, non bread, shurpa, manti, lagman, dimlama, chuchvara
- City: Tashkent. Prices in UZS (1 USD ≈ 12,700 UZS)
- Platform gives customers 30-70% off surplus food

Be friendly, concise, and helpful. Use markdown for formatting when it helps readability (bullet points, bold).
For shop owners: help with pricing, descriptions, waste reduction, and their listings.
For customers: help find deals, explain how Tejam works, suggest Uzbek foods."""

    # Build multi-turn contents list
    contents = [{"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "model", "parts": [{"text": "Understood! I'm ready to help."}]}]

    for msg in history[-10:]:  # last 10 messages for context window efficiency
        role = "user" if msg.get("role") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})

    contents.append({"role": "user", "parts": [{"text": message_text}]})

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
        )
        reply = response.text.strip()
        return jsonify({"reply": reply})
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            return jsonify({"error": "AI quota exceeded. Please try again in a few minutes."}), 429
        return jsonify({"error": f"AI service error: {error_str}"}), 500
