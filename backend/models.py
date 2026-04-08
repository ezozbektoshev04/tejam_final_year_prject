import uuid
import random
import string
from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def _gen_order_ref():
    chars = string.ascii_uppercase + string.digits
    return 'TJ-' + ''.join(random.choices(chars, k=6))


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'shop' | 'customer'
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(30))
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    shops = db.relationship("Shop", backref="owner", uselist=True, lazy=True)
    orders = db.relationship("Order", backref="customer", lazy=True, foreign_keys="Order.customer_id")
    reviews = db.relationship("Review", backref="reviewer", lazy=True, foreign_keys="Review.customer_id")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "name": self.name,
            "phone": self.phone,
            "created_at": self.created_at.isoformat(),
        }


class Shop(db.Model):
    __tablename__ = "shops"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    address = db.Column(db.String(255))
    city = db.Column(db.String(100))
    category = db.Column(db.String(100))
    image_url = db.Column(db.String(500))
    rating = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)

    food_items = db.relationship("FoodItem", backref="shop", lazy=True)
    reviews = db.relationship("Review", backref="shop", lazy=True, foreign_keys="Review.shop_id")

    def to_dict(self, include_items=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "address": self.address,
            "city": self.city,
            "category": self.category,
            "image_url": self.image_url,
            "rating": self.rating,
            "is_active": self.is_active,
            "lat": self.lat,
            "lng": self.lng,
        }
        if include_items:
            data["food_items"] = [item.to_dict() for item in self.food_items if not item.is_archived]
            data["archived_items"] = [item.to_dict() for item in self.food_items if item.is_archived]
        return data


class FoodItem(db.Model):
    __tablename__ = "food_items"

    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    original_price = db.Column(db.Float, nullable=False)
    discounted_price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, default=1)
    pickup_start = db.Column(db.String(10))  # e.g. "17:00"
    pickup_end = db.Column(db.String(10))    # e.g. "20:00"
    image_url = db.Column(db.String(500))
    is_available = db.Column(db.Boolean, default=True)
    is_archived = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    orders = db.relationship("Order", backref="food_item", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "name": self.name,
            "description": self.description,
            "original_price": self.original_price,
            "discounted_price": self.discounted_price,
            "quantity": self.quantity,
            "pickup_start": self.pickup_start,
            "pickup_end": self.pickup_end,
            "image_url": self.image_url,
            "is_available": self.is_available,
            "is_archived": self.is_archived,
            "created_at": self.created_at.isoformat(),
            "shop_name": self.shop.name if self.shop else None,
            "shop_city": self.shop.city if self.shop else None,
        }


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    food_item_id = db.Column(db.Integer, db.ForeignKey("food_items.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    total_price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending_payment|pending|confirmed|picked_up|cancelled
    payment_method = db.Column(db.String(10), default="cash")  # cash|online
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    pickup_token = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    order_ref = db.Column(db.String(12), unique=True, default=lambda: _gen_order_ref())

    review = db.relationship("Review", backref="order", uselist=False, lazy=True)

    def to_dict(self):
        item = self.food_item
        shop = item.shop if item else None
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "food_item_id": self.food_item_id,
            "food_item_name": item.name if item else None,
            "food_item_image": item.image_url if item else None,
            "shop_name": shop.name if shop else None,
            "shop_id": shop.id if shop else None,
            "shop_address": shop.address if shop else None,
            "shop_city": shop.city if shop else None,
            "pickup_token": self.pickup_token,
            "quantity": self.quantity,
            "total_price": self.total_price,
            "status": self.status,
            "payment_method": self.payment_method or "cash",
            "created_at": self.created_at.isoformat(),
            "notes": self.notes,
            "order_ref": self.order_ref or f"TJ-{self.id:06d}",
            "review": self.review.to_dict() if self.review else None,
        }


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    link = db.Column(db.String(255))          # frontend route to navigate to
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "message": self.message,
            "link": self.link,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }


class PlatformSetting(db.Model):
    """Key-value store for admin-configurable platform settings."""
    __tablename__ = "platform_settings"

    id    = db.Column(db.Integer, primary_key=True)
    key   = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=False)  # JSON-encoded

    @staticmethod
    def get(key, default=None):
        import json
        row = PlatformSetting.query.filter_by(key=key).first()
        if row is None:
            return default
        try:
            return json.loads(row.value)
        except Exception:
            return row.value

    @staticmethod
    def set(key, value):
        import json
        row = PlatformSetting.query.filter_by(key=key).first()
        encoded = json.dumps(value)
        if row:
            row.value = encoded
        else:
            row = PlatformSetting(key=key, value=encoded)
            db.session.add(row)


class VerificationCode(db.Model):
    __tablename__ = "verification_codes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    purpose = db.Column(db.String(20), nullable=False)  # 'register' | 'reset'
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def generate(user_id, purpose):
        # Invalidate any previous unused codes for same user+purpose
        VerificationCode.query.filter_by(
            user_id=user_id, purpose=purpose, is_used=False
        ).update({"is_used": True})
        code = str(random.randint(100000, 999999))
        vc = VerificationCode(
            user_id=user_id,
            code=code,
            purpose=purpose,
            expires_at=datetime.utcnow() + timedelta(minutes=15),
        )
        db.session.add(vc)
        return vc


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False)
    food_item_id = db.Column(db.Integer, db.ForeignKey("food_items.id"), nullable=True)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "customer_id": self.customer_id,
            "customer_name": self.reviewer.name if self.reviewer else None,
            "shop_id": self.shop_id,
            "food_item_id": self.food_item_id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat(),
        }
