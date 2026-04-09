from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import Bcrypt
from models import db, User, Shop, VerificationCode
from utils.email import send_verification_email, send_reset_email

auth_bp = Blueprint("auth", __name__)
bcrypt = Bcrypt()

# In-memory failed attempt tracker: {user_id: fail_count}
# Resets on correct code or when a new code is generated
_verify_attempts: dict = {}
MAX_VERIFY_ATTEMPTS = 5


def _user_response(user):
    data = user.to_dict()
    if user.role == "shop":
        data["shops"] = [s.to_dict() for s in user.shops]
    return data


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
        is_verified=False,
        is_approved=data["role"] != "shop",  # shops start unapproved
    )
    db.session.add(user)
    db.session.flush()

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

    vc = VerificationCode.generate(user.id, "register")
    db.session.commit()

    send_verification_email(user.email, user.name, vc.code)

    return jsonify({
        "message": "Account created. Please check your email for the verification code.",
        "email": user.email,
        "user_id": user.id,
    }), 201


@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.is_verified:
        # Already verified — check approval for shops before issuing token
        if user.role == "shop" and not user.is_approved:
            return jsonify({
                "pending_approval": True,
                "email": user.email,
                "message": "Your shop application is still under review.",
            })
        access_token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": access_token, "user": _user_response(user)})

    # Rate limit: block after too many failed attempts
    attempts = _verify_attempts.get(user.id, 0)
    if attempts >= MAX_VERIFY_ATTEMPTS:
        return jsonify({"error": "Too many failed attempts. Please request a new code."}), 429

    vc = VerificationCode.query.filter_by(
        user_id=user.id, purpose="register", is_used=False
    ).order_by(VerificationCode.created_at.desc()).first()

    if not vc or vc.code != code:
        _verify_attempts[user.id] = attempts + 1
        remaining = MAX_VERIFY_ATTEMPTS - _verify_attempts[user.id]
        msg = "Invalid code. Please check and try again."
        if remaining <= 2:
            msg += f" {remaining} attempt{'s' if remaining != 1 else ''} remaining."
        return jsonify({"error": msg}), 400
    if vc.expires_at < datetime.utcnow():
        return jsonify({"error": "Code has expired. Please request a new one."}), 400

    # Success — clear attempt counter
    _verify_attempts.pop(user.id, None)
    vc.is_used = True
    user.is_verified = True
    db.session.commit()

    # Shop owners must wait for admin approval before accessing dashboard
    if user.role == "shop" and not user.is_approved:
        return jsonify({
            "pending_approval": True,
            "email": user.email,
            "message": "Email verified! Your shop application is now under review. We'll notify you once it's approved.",
        })

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token, "user": _user_response(user)})


@auth_bp.route("/resend-code", methods=["POST"])
def resend_code():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    purpose = data.get("purpose", "register")

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "No account with that email."}), 404

    # Reset failed attempt counter when a new code is requested
    _verify_attempts.pop(user.id, None)

    if purpose == "register" and user.is_verified:
        return jsonify({"error": "Account already verified."}), 400

    vc = VerificationCode.generate(user.id, purpose)
    db.session.commit()

    if purpose == "reset":
        send_reset_email(user.email, user.name, vc.code)
    else:
        send_verification_email(user.email, user.name, vc.code)

    return jsonify({"message": "A new code has been sent to your email."})


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    user = User.query.filter_by(email=data.get("email")).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, data.get("password", "")):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_verified:
        # Resend a fresh code and tell the frontend to go to verify screen
        vc = VerificationCode.generate(user.id, "register")
        db.session.commit()
        send_verification_email(user.email, user.name, vc.code)
        return jsonify({
            "error": "Email not verified. We've sent a new code to your email.",
            "unverified": True,
            "email": user.email,
        }), 403

    if user.role == "shop" and not user.is_approved:
        return jsonify({
            "error": "Your shop account is pending admin approval. You'll be notified once it's reviewed.",
            "pending_approval": True,
            "email": user.email,
        }), 403

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token, "user": _user_response(user)})


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email", "").strip().lower()

    user = User.query.filter_by(email=email).first()
    # Always return 200 to avoid user enumeration
    if user and user.is_verified:
        vc = VerificationCode.generate(user.id, "reset")
        db.session.commit()
        send_reset_email(user.email, user.name, vc.code)

    return jsonify({"message": "If that email exists, a reset code has been sent."})


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()
    new_password = data.get("new_password", "")

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid request"}), 400

    vc = VerificationCode.query.filter_by(
        user_id=user.id, purpose="reset", is_used=False
    ).order_by(VerificationCode.created_at.desc()).first()

    if not vc or vc.code != code:
        return jsonify({"error": "Invalid code. Please check and try again."}), 400
    if vc.expires_at < datetime.utcnow():
        return jsonify({"error": "Code has expired. Please request a new one."}), 400

    vc.is_used = True
    user.password_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
    db.session.commit()

    return jsonify({"message": "Password reset successfully. You can now log in."})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    return jsonify(_user_response(user))


@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if "name" in data:
        if not data["name"].strip():
            return jsonify({"error": "Name cannot be empty"}), 400
        user.name = data["name"].strip()

    if "phone" in data:
        user.phone = data["phone"].strip()

    if "email" in data:
        new_email = data["email"].strip().lower()
        if new_email != user.email:
            if User.query.filter_by(email=new_email).first():
                return jsonify({"error": "Email already in use"}), 409
            user.email = new_email

    if "new_password" in data:
        current = data.get("current_password", "")
        if not bcrypt.check_password_hash(user.password_hash, current):
            return jsonify({"error": "Current password is incorrect"}), 400
        if len(data["new_password"]) < 6:
            return jsonify({"error": "New password must be at least 6 characters"}), 400
        user.password_hash = bcrypt.generate_password_hash(data["new_password"]).decode("utf-8")

    db.session.commit()
    return jsonify(_user_response(user))
