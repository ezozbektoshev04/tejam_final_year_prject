import json
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User

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


@ai_bp.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    message_text = data.get("message", "")
    context = data.get("context", "")

    if not message_text:
        return jsonify({"error": "message is required"}), 400

    client = get_gemini_client()
    if not client:
        return jsonify({
            "reply": "I'm Tejam's AI assistant! I can help you find the best food deals in Uzbekistan, suggest prices for your listings, or answer questions about reducing food waste. (AI service temporarily unavailable — please check your Gemini API key.)"
        })

    system_context = f"""You are Tejam's helpful AI assistant — Tejam is a food surplus marketplace in Uzbekistan inspired by Too Good To Go.
You help connect shops with surplus food to customers at discounted prices, reducing food waste.

Current user: {user.name} (role: {user.role})
{f"Context: {context}" if context else ""}

You know about:
- Uzbek cuisine: plov, samsa, non bread, shurpa, manti, lagman, dimlama, chuchvara
- City: Tashkent
- Prices are in UZS (1 USD ≈ 12,700 UZS)
- The platform helps reduce food waste while giving customers great deals (30-70% off)

Be friendly, concise, and helpful. For shop owners: help with pricing, descriptions, and waste reduction tips.
For customers: help find deals, suggest foods, and explain how the platform works.

User message: {message_text}"""

    try:
        reply = gemini_generate(client, system_context)
        return jsonify({"reply": reply})
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower():
            return jsonify({"error": "AI quota exceeded. Please try again later."}), 429
        return jsonify({"error": "AI service error. Please try again."}), 500
