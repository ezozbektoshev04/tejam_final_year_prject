from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import Bcrypt
from models import db, User, Shop

auth_bp = Blueprint("auth", __name__)
bcrypt = Bcrypt()


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required = ["email", "password", "role", "name"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    if data["role"] not in ("shop", "customer"):
        return jsonify({"error": "role must be 'shop' or 'customer'"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    password_hash = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
    user = User(
        email=data["email"],
        password_hash=password_hash,
        role=data["role"],
        name=data["name"],
        phone=data.get("phone", ""),
    )
    db.session.add(user)
    db.session.flush()  # get user.id before commit

    if data["role"] == "shop":
        shop = Shop(
            user_id=user.id,
            name=data.get("shop_name", data["name"]),
            description=data.get("shop_description", ""),
            address=data.get("shop_address", ""),
            city=data.get("shop_city", "Tashkent"),
            category=data.get("shop_category", "General"),
        )
        db.session.add(shop)

    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": access_token,
        "user": user.to_dict(),
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    user = User.query.filter_by(email=data.get("email")).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, data.get("password", "")):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": access_token,
        "user": user.to_dict(),
    })


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = user.to_dict()
    if user.role == "shop" and user.shop:
        data["shop"] = user.shop.to_dict()
    return jsonify(data)
