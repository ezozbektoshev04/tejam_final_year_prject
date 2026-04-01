import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'shop' | 'customer'
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(30))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    shop = db.relationship("Shop", backref="owner", uselist=False, lazy=True)
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
            data["food_items"] = [item.to_dict() for item in self.food_items if item.is_available]
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
    status = db.Column(db.String(20), default="pending")  # pending|confirmed|picked_up|cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    pickup_token = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))

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
            "created_at": self.created_at.isoformat(),
            "notes": self.notes,
        }


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False)
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
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat(),
        }
