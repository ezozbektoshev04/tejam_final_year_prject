import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt

from config import Config
from models import db

bcrypt = Bcrypt()
jwt = JWTManager()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app, origins=config_class.CORS_ORIGINS, supports_credentials=True)

    # Register blueprints
    from routes.auth import auth_bp
    from routes.shops import shops_bp
    from routes.food_items import food_bp
    from routes.orders import orders_bp
    from routes.ai import ai_bp
    from routes.uploads import uploads_bp
    from routes.admin import admin_bp
    from routes.payments import payments_bp
    from routes.reports import reports_bp
    from routes.notifications import notifications_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(shops_bp, url_prefix="/api/shops")
    app.register_blueprint(food_bp, url_prefix="/api/food-items")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
    app.register_blueprint(uploads_bp, url_prefix="/uploads")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(payments_bp, url_prefix="/api/payments")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")

    # Create tables
    with app.app_context():
        db.create_all()
        _migrate_db()
        seed_database(app)

    return app


def _migrate_db():
    """Add columns that may not exist in older DB files."""
    from sqlalchemy import text
    with db.engine.connect() as conn:
        for stmt in [
            "ALTER TABLE orders ADD COLUMN payment_method VARCHAR(10) DEFAULT 'cash'",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # Column already exists


def seed_database(app):
    """Seed the database with real Tashkent brand data."""
    from models import User, Shop, FoodItem, Order, Review
    from flask_bcrypt import generate_password_hash

    # Ensure admin account always exists
    password_hash = generate_password_hash("password123").decode("utf-8")
    if not User.query.filter_by(email="admin@tejam.uz").first():
        admin = User(email="admin@tejam.uz", password_hash=password_hash,
                     role="admin", name="Tejam Admin", phone="+998900000000")
        db.session.add(admin)
        db.session.commit()
        print("Admin user created.")

    # Only seed rest if empty
    if User.query.count() > 1:
        return

    print("Seeding database with Tashkent brand data...")

    # --- One account per company (owns all its branches) ---
    u_korzinka = User(email="korzinka@tejam.uz", password_hash=password_hash,
                      role="shop", name="Korzinka", phone="+998781230010")
    u_havas    = User(email="havas@tejam.uz", password_hash=password_hash,
                      role="shop", name="Havas", phone="+998781230020")
    u_safia    = User(email="safia@tejam.uz", password_hash=password_hash,
                      role="shop", name="Safia", phone="+998781230030")
    u_navat    = User(email="navat@tejam.uz", password_hash=password_hash,
                      role="shop", name="Navat", phone="+998781230040")
    u_caravan  = User(email="caravan@tejam.uz", password_hash=password_hash,
                      role="shop", name="Caravan", phone="+998781230050")

    # --- Customer accounts ---
    cust1 = User(email="customer1@example.com", password_hash=password_hash,
                 role="customer", name="Kamola Ergasheva", phone="+998901111111")
    cust2 = User(email="customer2@example.com", password_hash=password_hash,
                 role="customer", name="Jasur Mirzayev", phone="+998902222222")

    all_users = [u_korzinka, u_havas, u_safia, u_navat, u_caravan, cust1, cust2]
    db.session.add_all(all_users)
    db.session.flush()

    # --- Shops (branches) — multiple shops per company user ---
    KORZINKA_DESC = "Uzbekistan's leading supermarket chain. Fresh in-store bakery, ready meals, produce, and groceries — all at affordable prices every day."
    HAVAS_DESC    = "Tashkent's beloved café and bakery chain. Fresh pastries, cakes, sandwiches, and premium coffee — a cozy spot for breakfast and lunch."
    SAFIA_DESC    = "Premium Uzbek confectionery and bakery. Traditional sweets, cakes, and holiday desserts made with natural ingredients since 1998."
    NAVAT_DESC    = "Traditional Uzbek national dishes restaurant chain. Authentic plov, manti, shurpa, and samsa — classic recipes passed down through generations."
    CARAVAN_DESC  = "Popular fast food and snack chain in Tashkent. Burgers, hot dogs, samsa, and fresh juices at accessible prices across the city."

    # Korzinka — 3 branches (all owned by u_korzinka)
    shop_korz1 = Shop(user_id=u_korzinka.id, name="Korzinka",
        description=KORZINKA_DESC,
        address="Amir Temur shoh ko'chasi 1, Mirzo Ulug'bek tumani",
        city="Tashkent", category="Grocery",
        image_url="https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
        rating=4.7, is_active=True, lat=41.3105, lng=69.3247)
    shop_korz2 = Shop(user_id=u_korzinka.id, name="Korzinka",
        description=KORZINKA_DESC,
        address="Qatortol ko'chasi 56, Chilonzor tumani",
        city="Tashkent", category="Grocery",
        image_url="https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
        rating=4.6, is_active=True, lat=41.2934, lng=69.2082)
    shop_korz3 = Shop(user_id=u_korzinka.id, name="Korzinka",
        description=KORZINKA_DESC,
        address="Yunusobod ko'chasi 12, Yunusobod tumani",
        city="Tashkent", category="Grocery",
        image_url="https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
        rating=4.8, is_active=True, lat=41.3552, lng=69.2858)

    # Havas — 3 branches (all owned by u_havas)
    shop_havas1 = Shop(user_id=u_havas.id, name="Havas",
        description=HAVAS_DESC,
        address="Mustaqillik maydoni 6, Yunusobod tumani",
        city="Tashkent", category="Cafe",
        image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
        rating=4.9, is_active=True, lat=41.2993, lng=69.2401)
    shop_havas2 = Shop(user_id=u_havas.id, name="Havas",
        description=HAVAS_DESC,
        address="Shayxontohur ko'chasi 33, Shayxontohur tumani",
        city="Tashkent", category="Cafe",
        image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
        rating=4.7, is_active=True, lat=41.3163, lng=69.2556)
    shop_havas3 = Shop(user_id=u_havas.id, name="Havas",
        description=HAVAS_DESC,
        address="Mirzo Ulug'bek ko'chasi 77, Mirzo Ulug'bek tumani",
        city="Tashkent", category="Cafe",
        image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
        rating=4.8, is_active=True, lat=41.3200, lng=69.3150)

    # Safia — 2 branches (all owned by u_safia)
    shop_safia1 = Shop(user_id=u_safia.id, name="Safia",
        description=SAFIA_DESC,
        address="Chilonzor ko'chasi 14, Chilonzor tumani",
        city="Tashkent", category="Sweets",
        image_url="https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400",
        rating=4.9, is_active=True, lat=41.2950, lng=69.2100)
    shop_safia2 = Shop(user_id=u_safia.id, name="Safia",
        description=SAFIA_DESC,
        address="Amir Temur ko'chasi 105, Yakkasaroy tumani",
        city="Tashkent", category="Sweets",
        image_url="https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400",
        rating=4.8, is_active=True, lat=41.2860, lng=69.2670)

    # Navat — 2 branches (all owned by u_navat)
    shop_navat1 = Shop(user_id=u_navat.id, name="Navat",
        description=NAVAT_DESC,
        address="Buyuk Ipak Yo'li ko'chasi 78, Shayxontohur tumani",
        city="Tashkent", category="Restaurant",
        image_url="https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400",
        rating=4.8, is_active=True, lat=41.3163, lng=69.2556)
    shop_navat2 = Shop(user_id=u_navat.id, name="Navat",
        description=NAVAT_DESC,
        address="Uchtepa ko'chasi 22, Uchtepa tumani",
        city="Tashkent", category="Restaurant",
        image_url="https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400",
        rating=4.7, is_active=True, lat=41.3080, lng=69.2030)

    # Caravan — 2 branches (all owned by u_caravan)
    shop_caravan1 = Shop(user_id=u_caravan.id, name="Caravan",
        description=CARAVAN_DESC,
        address="Navoiy ko'chasi 30, Mirzo Ulug'bek tumani",
        city="Tashkent", category="Fast Food",
        image_url="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
        rating=4.5, is_active=True, lat=41.3200, lng=69.2800)
    shop_caravan2 = Shop(user_id=u_caravan.id, name="Caravan",
        description=CARAVAN_DESC,
        address="Sergeli ko'chasi 5, Sergeli tumani",
        city="Tashkent", category="Fast Food",
        image_url="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
        rating=4.4, is_active=True, lat=41.2329, lng=69.2553)

    all_shops = [
        shop_korz1, shop_korz2, shop_korz3,
        shop_havas1, shop_havas2, shop_havas3,
        shop_safia1, shop_safia2,
        shop_navat1, shop_navat2,
        shop_caravan1, shop_caravan2,
    ]
    db.session.add_all(all_shops)
    db.session.flush()

    # --- Food Items (assigned to one representative branch each) ---
    items = [
        # Korzinka Amir Temur branch
        FoodItem(shop_id=shop_korz1.id, name="Freshly Baked Non (4 pieces)",
                 description="Korzinka's in-store bakery non bread, baked fresh throughout the day. Soft and fragrant — perfect with tea or as a meal accompaniment.",
                 original_price=22000, discounted_price=10000, quantity=10,
                 pickup_start="18:00", pickup_end="21:00",
                 image_url="https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400",
                 is_available=True),
        FoodItem(shop_id=shop_korz1.id, name="Ready Meal Box (2 portions)",
                 description="Today's ready-to-eat meal selection: mashed potato with chicken cutlet or vegetable rice. Prepared fresh in-store, discounted before closing.",
                 original_price=55000, discounted_price=25000, quantity=6,
                 pickup_start="19:00", pickup_end="21:30",
                 image_url="https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400",
                 is_available=True),
        # Korzinka Chilonzor branch
        FoodItem(shop_id=shop_korz2.id, name="Fruit & Veggie Rescue Bag",
                 description="Assorted fresh fruits and vegetables at end-of-day discount. Random selection but always fresh — tomatoes, peppers, apples, and more.",
                 original_price=40000, discounted_price=16000, quantity=8,
                 pickup_start="18:30", pickup_end="21:00",
                 image_url="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
                 is_available=True),
        # Korzinka Yunusobod branch
        FoodItem(shop_id=shop_korz3.id, name="Dairy Bundle",
                 description="Local dairy products: fresh kefir, suzma (strained yogurt), and kaymak (cream). Made from farm-fresh milk daily.",
                 original_price=28000, discounted_price=13000, quantity=6,
                 pickup_start="17:00", pickup_end="20:00",
                 image_url="https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400",
                 is_available=True),

        # Havas Mustaqillik branch
        FoodItem(shop_id=shop_havas1.id, name="Pastry Bag (5 pieces)",
                 description="Havas signature assorted pastries — croissants, cheesecakes, and puff pastries. Made fresh this morning, now at half price.",
                 original_price=60000, discounted_price=28000, quantity=5,
                 pickup_start="17:00", pickup_end="20:00",
                 image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
                 is_available=True),
        FoodItem(shop_id=shop_havas1.id, name="Cake Slice Assortment (4 slices)",
                 description="End-of-day selection of Havas café cakes — chocolate, honey, and fruit varieties. Perfect for dessert or an evening treat at a great price.",
                 original_price=72000, discounted_price=32000, quantity=3,
                 pickup_start="17:30", pickup_end="20:30",
                 image_url="https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400",
                 is_available=True),
        # Havas Mirzo Ulugbek branch
        FoodItem(shop_id=shop_havas3.id, name="Sandwich Box (3 pieces)",
                 description="Freshly prepared Havas sandwiches: chicken, tuna, and veggie options. Made with in-house baked bread. Best consumed today.",
                 original_price=48000, discounted_price=22000, quantity=4,
                 pickup_start="16:30", pickup_end="19:30",
                 image_url="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
                 is_available=True),

        # Safia Chilonzor branch
        FoodItem(shop_id=shop_safia1.id, name="Safia Halva Box (500g)",
                 description="Safia's premium walnut and pistachio halva, made with natural sesame and honey. A classic Uzbek sweet treat — discounted to avoid waste.",
                 original_price=65000, discounted_price=30000, quantity=6,
                 pickup_start="16:00", pickup_end="19:00",
                 image_url="https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400",
                 is_available=True),
        FoodItem(shop_id=shop_safia1.id, name="Assorted Cookie Box (20 pieces)",
                 description="Safia's famous butter cookies with almond, jam, and chocolate fillings. Today's batch at end-of-day discount. Great for family or guests.",
                 original_price=50000, discounted_price=22000, quantity=7,
                 pickup_start="17:00", pickup_end="20:00",
                 image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
                 is_available=True),
        # Safia Yakkasaroy branch
        FoodItem(shop_id=shop_safia2.id, name="Cream Cake (whole, 500g)",
                 description="Safia's signature layered cream cake — today's unsold whole cake at a big discount. Honey sponge with fresh cream. Serves 4–6 people.",
                 original_price=120000, discounted_price=55000, quantity=2,
                 pickup_start="18:00", pickup_end="20:30",
                 image_url="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400",
                 is_available=True),

        # Navat Buyuk Ipak Yo'li branch
        FoodItem(shop_id=shop_navat1.id, name="Plov (2 portions)",
                 description="Navat's signature Fergana-style plov — tender lamb, carrots, and fragrant rice cooked in a cast-iron kazan. End-of-evening discount.",
                 original_price=90000, discounted_price=42000, quantity=4,
                 pickup_start="19:00", pickup_end="22:00",
                 image_url="https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400",
                 is_available=True),
        FoodItem(shop_id=shop_navat1.id, name="Manti (10 pieces)",
                 description="Navat's steamed manti with juicy lamb and onion filling, served with homemade suzma. A traditional Uzbek staple at evening closing price.",
                 original_price=70000, discounted_price=32000, quantity=3,
                 pickup_start="18:30", pickup_end="21:30",
                 image_url="https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400",
                 is_available=True),
        # Navat Uchtepa branch
        FoodItem(shop_id=shop_navat2.id, name="Samsa (6 pieces)",
                 description="Navat's golden tandoor-baked samsa with lamb and onion filling. Crispy pastry, juicy inside. Last batch of the day.",
                 original_price=48000, discounted_price=22000, quantity=5,
                 pickup_start="17:30", pickup_end="20:30",
                 image_url="https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400",
                 is_available=True),

        # Caravan Navoiy branch
        FoodItem(shop_id=shop_caravan1.id, name="Burger Combo (2 sets)",
                 description="Caravan beef burger with fries and a drink. Two combo sets at end-of-shift discount. Freshly assembled, best enjoyed immediately.",
                 original_price=80000, discounted_price=36000, quantity=4,
                 pickup_start="20:00", pickup_end="22:00",
                 image_url="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400",
                 is_available=True),
        # Caravan Sergeli branch
        FoodItem(shop_id=shop_caravan2.id, name="Hot Dog Pack (3 pieces)",
                 description="Caravan's classic hot dogs with mustard, ketchup, and crispy onions. End-of-day batch going at half price. Quick and satisfying.",
                 original_price=36000, discounted_price=16000, quantity=6,
                 pickup_start="19:30", pickup_end="22:00",
                 image_url="https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400",
                 is_available=True),
    ]

    db.session.add_all(items)
    db.session.flush()

    # --- Sample Orders ---
    order1 = Order(customer_id=cust1.id, food_item_id=items[0].id,
                   quantity=1, total_price=items[0].discounted_price,
                   status="picked_up", notes="")
    order2 = Order(customer_id=cust1.id, food_item_id=items[10].id,
                   quantity=1, total_price=items[10].discounted_price,
                   status="confirmed", notes="Extra napkins please")
    order3 = Order(customer_id=cust2.id, food_item_id=items[4].id,
                   quantity=2, total_price=items[4].discounted_price * 2,
                   status="pending", notes="")

    db.session.add_all([order1, order2, order3])
    db.session.flush()

    # --- Sample Reviews ---
    review1 = Review(order_id=order1.id, customer_id=cust1.id,
                     shop_id=shop_korz1.id, rating=5,
                     comment="Non bread was still warm! Great value from Korzinka.")
    review2 = Review(order_id=order2.id, customer_id=cust1.id,
                     shop_id=shop_navat1.id, rating=5,
                     comment="Navat's plov is always incredible. Amazing deal!")

    db.session.add_all([review1, review2])
    db.session.commit()
    print("Database seeded successfully!")


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
