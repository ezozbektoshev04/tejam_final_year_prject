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
        _seed_settings()
        seed_database(app)

    return app


def _seed_settings():
    """Insert default platform settings if they don't exist yet."""
    import json
    from models import PlatformSetting
    defaults = {
        "categories": ["Bakery", "Restaurant", "Grocery", "Cafe", "Fast Food", "Sweets", "General"],
        "min_discount_percent": 20,
        "max_discount_percent": 80,
        "low_stock_threshold": 2,
        "notification_order_placed":    "Order {ref} placed! Head to {shop} between {pickup_start}–{pickup_end} to pick up your '{item}'. Show your QR code at the counter.",
        "notification_order_confirmed": "Great news! Your order {ref} has been confirmed by the shop. Head over and show your QR code!",
        "notification_order_picked_up": "Enjoy your meal! Order {ref} — '{item}' has been picked up. Thanks for choosing Tejam and helping reduce food waste!",
        "notification_order_cancelled": "Your order {ref} for '{item}' was cancelled by the shop. Sorry for the inconvenience!",
    }
    for key, value in defaults.items():
        if not PlatformSetting.query.filter_by(key=key).first():
            PlatformSetting.set(key, value)
    db.session.commit()


def _migrate_db():
    """Add columns that may not exist in older DB files."""
    from sqlalchemy import text
    with db.engine.connect() as conn:
        for stmt in [
            "ALTER TABLE orders ADD COLUMN payment_method VARCHAR(10) DEFAULT 'cash'",
            "ALTER TABLE reviews ADD COLUMN food_item_id INTEGER REFERENCES food_items(id)",
            "ALTER TABLE orders ADD COLUMN order_ref VARCHAR(12)",
            "ALTER TABLE food_items ADD COLUMN is_archived BOOLEAN DEFAULT 0",
            "ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # Column already exists


def seed_database(app):
    """Seed database with 6 partners, 10 customers, 15+ orders each."""
    import random
    from datetime import datetime, timedelta
    from models import User, Shop, FoodItem, Order, Review
    from flask_bcrypt import generate_password_hash

    password_hash = generate_password_hash("password123").decode("utf-8")

    # Ensure admin always exists and is verified
    admin = User.query.filter_by(email="admin@tejam.uz").first()
    if not admin:
        admin = User(email="admin@tejam.uz", password_hash=password_hash,
                     role="admin", name="Tejam Admin", phone="+998900000000",
                     is_verified=True)
        db.session.add(admin)
        db.session.commit()
        print("Admin user created.")
    elif not admin.is_verified:
        admin.is_verified = True
        db.session.commit()
        print("Admin user marked as verified.")

    if User.query.count() > 1:
        return

    print("Seeding fresh database...")

    # ── SHOP ACCOUNTS ────────────────────────────────────────────────────────
    u_korzinka   = User(email="korzinka@tejam.uz",   password_hash=password_hash, role="shop", name="Korzinka",    phone="+998781230010", is_verified=True)
    u_sofia      = User(email="sofia@tejam.uz",      password_hash=password_hash, role="shop", name="Sofia",       phone="+998781230030", is_verified=True)
    u_tarnov     = User(email="tarnov@tejam.uz",     password_hash=password_hash, role="shop", name="Tarnov",      phone="+998781230040", is_verified=True)
    u_dietbistro = User(email="dietbistro@tejam.uz", password_hash=password_hash, role="shop", name="Diet Bistro", phone="+998781230050", is_verified=True)
    u_feedup     = User(email="feedup@tejam.uz",     password_hash=password_hash, role="shop", name="Feed UP",     phone="+998781230060", is_verified=True)

    # ── CUSTOMER ACCOUNTS ────────────────────────────────────────────────────
    customers_data = [
        ("Kamola Ergasheva",   "customer1@tejam.uz",  "+998901111111"),
        ("Jasur Mirzayev",     "customer2@tejam.uz",  "+998902222222"),
        ("Nilufar Toshmatova", "customer3@tejam.uz",  "+998903333333"),
        ("Bobur Yusupov",      "customer4@tejam.uz",  "+998904444444"),
        ("Zulfiya Xolmatova",  "customer5@tejam.uz",  "+998905555555"),
        ("Sardor Qodirov",     "customer6@tejam.uz",  "+998906666666"),
        ("Malika Rahimova",    "customer7@tejam.uz",  "+998907777777"),
        ("Sherzod Nazarov",    "customer8@tejam.uz",  "+998908888888"),
        ("Dilorom Umarova",    "customer9@tejam.uz",  "+998909999999"),
        ("Firdavs Alimov",     "customer10@tejam.uz", "+998900000001"),
    ]
    customers = []
    for name, email, phone in customers_data:
        u = User(email=email, password_hash=password_hash, role="customer", name=name, phone=phone, is_verified=True)
        customers.append(u)

    all_users = [u_korzinka, u_sofia, u_tarnov, u_dietbistro, u_feedup] + customers
    db.session.add_all(all_users)
    db.session.flush()

    # ── SHOPS / BRANCHES ─────────────────────────────────────────────────────
    GROCERY_IMG  = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600"
    BAKERY_IMG   = "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600"
    RESTAURANT_IMG = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600"
    FASTFOOD_IMG = "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600"

    # Korzinka — Grocery — 2 branches
    sk1 = Shop(user_id=u_korzinka.id, name="Korzinka",
        description="Uzbekistan's leading supermarket chain with fresh in-store bakery, ready meals, dairy, produce, and groceries at affordable everyday prices.",
        address="Chilonzor (C1)", city="Tashkent",
        category="Grocery", image_url=GROCERY_IMG, rating=4.7, is_active=True, lat=41.310040, lng=69.292511)
    sk2 = Shop(user_id=u_korzinka.id, name="Korzinka",
        description="Uzbekistan's leading supermarket chain with fresh in-store bakery, ready meals, dairy, produce, and groceries at affordable everyday prices.",
        address="Oybek ko'chasi", city="Tashkent",
        category="Grocery", image_url=GROCERY_IMG, rating=4.8, is_active=True, lat=41.295767, lng=69.274922)

    # Sofia — Bakery — 2 branches
    ss1 = Shop(user_id=u_sofia.id, name="Sofia",
        description="Premium Tashkent bakery known for freshly baked breads, croissants, cakes, and traditional Uzbek pastries. Everything made from scratch daily.",
        address="Chilonzor tumani", city="Tashkent",
        category="Bakery", image_url=BAKERY_IMG, rating=4.9, is_active=True, lat=41.306707, lng=69.292044)
    ss2 = Shop(user_id=u_sofia.id, name="Sofia",
        description="Premium Tashkent bakery known for freshly baked breads, croissants, cakes, and traditional Uzbek pastries. Everything made from scratch daily.",
        address="Mirzo Ulug'bek tumani", city="Tashkent",
        category="Bakery", image_url=BAKERY_IMG, rating=4.8, is_active=True, lat=41.319319, lng=69.279934)

    # Tarnov — Restaurant — 2 branches
    st1 = Shop(user_id=u_tarnov.id, name="Tarnov",
        description="Upscale Uzbek restaurant serving authentic national cuisine — plov, manti, lagman, shurpa and kebabs in a traditional atmosphere.",
        address="Sabzor ko'chasi", city="Tashkent",
        category="Restaurant", image_url=RESTAURANT_IMG, rating=4.8, is_active=True, lat=41.334887, lng=69.252877)
    st2 = Shop(user_id=u_tarnov.id, name="Tarnov",
        description="Upscale Uzbek restaurant serving authentic national cuisine — plov, manti, lagman, shurpa and kebabs in a traditional atmosphere.",
        address="Chorsu", city="Tashkent",
        category="Restaurant", image_url=RESTAURANT_IMG, rating=4.7, is_active=True, lat=41.325989, lng=69.229224)

    # Diet Bistro — Restaurant — 2 branches
    sd1 = Shop(user_id=u_dietbistro.id, name="Diet Bistro",
        description="Healthy dining concept in Tashkent. Balanced meals, salads, grain bowls, and fresh juices. Calorie-counted menus for health-conscious customers.",
        address="Labzak ko'chasi", city="Tashkent",
        category="Restaurant", image_url=RESTAURANT_IMG, rating=4.6, is_active=True, lat=41.337940, lng=69.267969)
    sd2 = Shop(user_id=u_dietbistro.id, name="Diet Bistro",
        description="Healthy dining concept in Tashkent. Balanced meals, salads, grain bowls, and fresh juices. Calorie-counted menus for health-conscious customers.",
        address="Yunusobod tumani", city="Tashkent",
        category="Restaurant", image_url=RESTAURANT_IMG, rating=4.5, is_active=True, lat=41.309593, lng=69.302958)

    # Feed UP — Fast Food — 2 branches
    sf1 = Shop(user_id=u_feedup.id, name="Feed UP",
        description="Tashkent's go-to fast food spot. Juicy burgers, crispy fries, hot dogs, chicken wraps, and refreshing drinks. Fast, fresh, and affordable.",
        address="Abay ko'chasi", city="Tashkent",
        category="Fast Food", image_url=FASTFOOD_IMG, rating=4.4, is_active=True, lat=41.326146, lng=69.255397)
    sf2 = Shop(user_id=u_feedup.id, name="Feed UP",
        description="Tashkent's go-to fast food spot. Juicy burgers, crispy fries, hot dogs, chicken wraps, and refreshing drinks. Fast, fresh, and affordable.",
        address="Chilonzor (C1)", city="Tashkent",
        category="Fast Food", image_url=FASTFOOD_IMG, rating=4.3, is_active=True, lat=41.311525, lng=69.288530)

    all_shops = [sk1, sk2, ss1, ss2, st1, st2, sd1, sd2, sf1, sf2]
    db.session.add_all(all_shops)
    db.session.flush()

    # ── FOOD ITEMS ───────────────────────────────────────────────────────────
    # Grocery images
    G1 = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500"
    G2 = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500"
    G3 = "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500"
    G4 = "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=500"
    G5 = "https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=500"
    G6 = "https://images.unsplash.com/photo-1585982768578-17e5a3a33924?w=500"
    G7 = "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500"
    # Bakery images
    B1 = "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500"
    B2 = "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500"
    B3 = "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500"
    B4 = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500"
    B5 = "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500"
    B6 = "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=500"
    B7 = "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=500"
    # Restaurant images
    R1 = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500"
    R2 = "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500"
    R3 = "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500"
    R4 = "https://images.unsplash.com/photo-1547592180-85f173990554?w=500"
    R5 = "https://images.unsplash.com/photo-1574484284002-952d92456975?w=500"
    R6 = "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=500"
    R7 = "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=500"
    # Fast food images
    F1 = "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500"
    F2 = "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500"
    F3 = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500"
    F4 = "https://images.unsplash.com/photo-1585581208773-33bb3a5fd9b0?w=500"
    F5 = "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=500"
    F6 = "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500"
    F7 = "https://images.unsplash.com/photo-1550317138-10000687a72b?w=500"

    items = [
        # ── Korzinka Branch 1 (sk1) — 7 bags ──────────────────────────────
        FoodItem(shop_id=sk1.id, name="Freshly Baked Non Bread (4 pieces)",
            description="Korzinka's in-store bakery non bread baked fresh daily. Soft, fragrant, and perfect with tea or as a meal accompaniment. End-of-day discount.",
            original_price=22000, discounted_price=9000, quantity=12,
            pickup_start="18:00", pickup_end="21:00", image_url=B3, is_available=True),
        FoodItem(shop_id=sk1.id, name="Ready Meal Box (2 portions)",
            description="Today's hot ready meals — mashed potato with chicken cutlet or vegetable rice pilaf. Prepared fresh in-store, discounted before closing.",
            original_price=55000, discounted_price=24000, quantity=8,
            pickup_start="19:00", pickup_end="21:30", image_url=G4, is_available=True),
        FoodItem(shop_id=sk1.id, name="Fruit & Veggie Rescue Bag",
            description="Assorted fresh fruits and vegetables at end-of-day price. Always fresh — tomatoes, peppers, cucumbers, apples, and seasonal extras.",
            original_price=40000, discounted_price=15000, quantity=10,
            pickup_start="18:30", pickup_end="21:00", image_url=G2, is_available=True),
        FoodItem(shop_id=sk1.id, name="Dairy Bundle (kefir + suzma + kaymak)",
            description="Fresh local dairy: kefir, strained suzma yogurt, and rich kaymak cream. Farm-fresh daily. Great for breakfast or cooking.",
            original_price=30000, discounted_price=13000, quantity=7,
            pickup_start="17:00", pickup_end="20:00", image_url=G3, is_available=True),
        FoodItem(shop_id=sk1.id, name="Bakery Surprise Bag (6 items)",
            description="Mixed bag from Korzinka's in-store bakery — rolls, buns, and pastries baked today. Different every day, always delicious.",
            original_price=35000, discounted_price=14000, quantity=9,
            pickup_start="17:30", pickup_end="20:30", image_url=B1, is_available=True),
        FoodItem(shop_id=sk1.id, name="Chilled Deli Pack",
            description="Sliced deli meats, cheeses, and cold cuts from today's counter. Perfectly fresh, packaged for convenience. Great for sandwiches.",
            original_price=48000, discounted_price=20000, quantity=5,
            pickup_start="18:00", pickup_end="21:00", image_url=G5, is_available=True),
        FoodItem(shop_id=sk1.id, name="Snack & Drinks Bag",
            description="Assorted near-expiry snacks, juices, and soft drinks from Korzinka shelves. Great value bundle — random selection, always worth it.",
            original_price=25000, discounted_price=10000, quantity=15,
            pickup_start="19:00", pickup_end="22:00", image_url=G6, is_available=True),

        # ── Korzinka Branch 2 (sk2) — 7 bags ──────────────────────────────
        FoodItem(shop_id=sk2.id, name="Grocery Mystery Bag (Large)",
            description="Large surprise bag from Korzinka Yunusobod — mix of pantry staples, snacks, and fresh items. Value guaranteed to exceed the price.",
            original_price=60000, discounted_price=25000, quantity=8,
            pickup_start="18:00", pickup_end="21:00", image_url=G1, is_available=True),
        FoodItem(shop_id=sk2.id, name="Fresh Juice Pack (4 bottles)",
            description="Cold-pressed juices and smoothies from today's production — apple, carrot, pomegranate, and seasonal blend. Best before tonight.",
            original_price=32000, discounted_price=13000, quantity=10,
            pickup_start="17:00", pickup_end="20:00", image_url=G7, is_available=True),
        FoodItem(shop_id=sk2.id, name="Egg & Dairy Bundle",
            description="Farm eggs (10 pcs) plus a bottle of fresh milk and a tub of butter. Sourced daily from local farms. Perfect for breakfast prep.",
            original_price=38000, discounted_price=16000, quantity=6,
            pickup_start="18:00", pickup_end="20:30", image_url=G3, is_available=True),
        FoodItem(shop_id=sk2.id, name="In-Store Bakery Loaves (2 pcs)",
            description="Two whole loaves of Korzinka's in-store baked bread — white and grain varieties. Fresh from the oven this morning.",
            original_price=20000, discounted_price=8000, quantity=12,
            pickup_start="17:30", pickup_end="20:00", image_url=B3, is_available=True),
        FoodItem(shop_id=sk2.id, name="Seasonal Fruit Box",
            description="A box of premium seasonal fruits handpicked from today's fresh delivery — apples, pears, or citrus depending on the season.",
            original_price=45000, discounted_price=19000, quantity=7,
            pickup_start="18:00", pickup_end="21:00", image_url=G2, is_available=True),
        FoodItem(shop_id=sk2.id, name="Ready Soup Pack (2 jars)",
            description="Korzinka kitchen-made soups — shurpa or lagman style, fresh today. Just heat and serve. Comforting and filling.",
            original_price=40000, discounted_price=17000, quantity=5,
            pickup_start="19:00", pickup_end="21:30", image_url=R4, is_available=True),
        FoodItem(shop_id=sk2.id, name="Yogurt & Cheese Basket",
            description="Selection of local yogurts and soft cheeses from today's dairy section. All within date, perfect for snacking or cooking.",
            original_price=35000, discounted_price=14000, quantity=8,
            pickup_start="17:00", pickup_end="20:00", image_url=G3, is_available=True),

        # ── Sofia Bakery Branch 1 (ss1) — 7 bags ──────────────────────────
        FoodItem(shop_id=ss1.id, name="Sofia Pastry Bag (6 pieces)",
            description="Sofia's signature assorted pastries — croissants, pain au chocolat, and almond puffs baked fresh this morning. End-of-day at half price.",
            original_price=65000, discounted_price=28000, quantity=8,
            pickup_start="17:00", pickup_end="20:00", image_url=B1, is_available=True),
        FoodItem(shop_id=ss1.id, name="Sourdough & Artisan Bread Bag",
            description="Two sourdough loaves and one rosemary focaccia from Sofia's stone oven. Made with natural starter. Today's unsold stock.",
            original_price=48000, discounted_price=20000, quantity=6,
            pickup_start="17:00", pickup_end="20:00", image_url=B2, is_available=True),
        FoodItem(shop_id=ss1.id, name="Cake Slice Box (4 slices)",
            description="Four slices of Sofia's premium cakes — honey, chocolate, fruit tart, and tiramisu. Baked fresh today, discounted before closing.",
            original_price=80000, discounted_price=34000, quantity=5,
            pickup_start="17:30", pickup_end="20:30", image_url=B4, is_available=True),
        FoodItem(shop_id=ss1.id, name="Cookie Assortment Box (20 pcs)",
            description="Sofia's famous butter cookies — almond, jam, chocolate chip, and coconut. Today's freshly baked batch at end-of-day discount.",
            original_price=55000, discounted_price=23000, quantity=9,
            pickup_start="16:30", pickup_end="19:30", image_url=B5, is_available=True),
        FoodItem(shop_id=ss1.id, name="Non & Flatbread Bundle (5 pcs)",
            description="Traditional Uzbek non bread and flatbreads from Sofia's tandoor oven — sesame non, obi non, and crispy lavash. Fresh today.",
            original_price=30000, discounted_price=12000, quantity=12,
            pickup_start="17:00", pickup_end="20:00", image_url=B3, is_available=True),
        FoodItem(shop_id=ss1.id, name="Cream Cake (whole, 500g)",
            description="Sofia's signature honey-sponge layered cream cake — today's unsold whole cake at a significant discount. Serves 4–6 people.",
            original_price=130000, discounted_price=55000, quantity=3,
            pickup_start="18:00", pickup_end="20:30", image_url=B4, is_available=True),
        FoodItem(shop_id=ss1.id, name="Brownie & Muffin Pack (6 pcs)",
            description="Three chocolate brownies and three blueberry muffins — Sofia's bestselling café baked goods. Perfect with coffee.",
            original_price=60000, discounted_price=25000, quantity=7,
            pickup_start="16:00", pickup_end="19:00", image_url=B6, is_available=True),

        # ── Sofia Bakery Branch 2 (ss2) — 7 bags ──────────────────────────
        FoodItem(shop_id=ss2.id, name="Sofia Navoiy — Morning Pastry Bag",
            description="Today's morning pastry surplus — croissants, danishes, and cinnamon rolls. All baked before 8am, best enjoyed today.",
            original_price=60000, discounted_price=25000, quantity=8,
            pickup_start="17:00", pickup_end="20:00", image_url=B1, is_available=True),
        FoodItem(shop_id=ss2.id, name="Artisan Loaf Duo",
            description="Two premium artisan loaves — multigrain and classic white sourdough. Hand-shaped, stone-baked at Sofia's Navoiy branch.",
            original_price=45000, discounted_price=19000, quantity=6,
            pickup_start="17:00", pickup_end="20:00", image_url=B2, is_available=True),
        FoodItem(shop_id=ss2.id, name="Birthday Cake Slice Box",
            description="Leftover slices from today's celebration cakes — vanilla cream, strawberry, and chocolate ganache. Perfect for dessert.",
            original_price=75000, discounted_price=32000, quantity=4,
            pickup_start="18:00", pickup_end="20:30", image_url=B4, is_available=True),
        FoodItem(shop_id=ss2.id, name="Tart & Éclair Selection (5 pcs)",
            description="Sofia's French-inspired tarts and éclairs — lemon tart, fruit tart, chocolate éclair, and caramel. Today's pastry chef special.",
            original_price=70000, discounted_price=30000, quantity=5,
            pickup_start="17:30", pickup_end="20:30", image_url=B5, is_available=True),
        FoodItem(shop_id=ss2.id, name="Halva & Traditional Sweets Box",
            description="Premium Uzbek halva, parvarda, and nougat from Sofia's confectionery counter. Natural ingredients, traditional recipes.",
            original_price=65000, discounted_price=28000, quantity=7,
            pickup_start="16:00", pickup_end="19:00", image_url=B5, is_available=True),
        FoodItem(shop_id=ss2.id, name="Focaccia & Herb Bread Pack",
            description="Rosemary focaccia, olive bread, and herb flatbreads from today's specialty bake. Great for sharing or as a side.",
            original_price=42000, discounted_price=17000, quantity=8,
            pickup_start="17:00", pickup_end="20:00", image_url=B2, is_available=True),
        FoodItem(shop_id=ss2.id, name="Cheesecake Slices (3 pcs)",
            description="Three generous slices of Sofia's NY-style cheesecake — classic, strawberry, and chocolate marble. Chilled and ready.",
            original_price=72000, discounted_price=30000, quantity=4,
            pickup_start="17:30", pickup_end="20:30", image_url=B7, is_available=True),

        # ── Tarnov Restaurant Branch 1 (st1) — 7 bags ─────────────────────
        FoodItem(shop_id=st1.id, name="Plov Bag (2 large portions)",
            description="Tarnov's signature Fergana-style plov — tender lamb, golden carrots, and fragrant rice cooked in a cast-iron kazan. End-of-evening deal.",
            original_price=95000, discounted_price=42000, quantity=5,
            pickup_start="19:00", pickup_end="22:00", image_url=R2, is_available=True),
        FoodItem(shop_id=st1.id, name="Manti Bag (12 pieces)",
            description="Steamed manti dumplings filled with juicy lamb and caramelised onion. Served with homemade suzma. Last order of the evening.",
            original_price=75000, discounted_price=33000, quantity=4,
            pickup_start="18:30", pickup_end="21:30", image_url=R3, is_available=True),
        FoodItem(shop_id=st1.id, name="Samsa Bag (8 pieces)",
            description="Golden tandoor-baked samsa filled with seasoned lamb and onion. Crispy pastry, juicy filling. Last batch from today's tandoor.",
            original_price=56000, discounted_price=24000, quantity=7,
            pickup_start="17:30", pickup_end="20:30", image_url=B3, is_available=True),
        FoodItem(shop_id=st1.id, name="Lagman Bag (2 portions)",
            description="Tarnov's hand-pulled lagman noodles in rich lamb broth with vegetables. A hearty Uzbek classic at closing time price.",
            original_price=70000, discounted_price=31000, quantity=4,
            pickup_start="19:00", pickup_end="22:00", image_url=R4, is_available=True),
        FoodItem(shop_id=st1.id, name="Kebab Plate (6 skewers)",
            description="Mixed kebab platter — lamb kofta, chicken shashlik, and beef ribs. Grilled fresh today, available at end-of-service discount.",
            original_price=120000, discounted_price=52000, quantity=3,
            pickup_start="20:00", pickup_end="22:30", image_url=R5, is_available=True),
        FoodItem(shop_id=st1.id, name="Shurpa Soup (2 bowls)",
            description="Traditional Tarnov shurpa — slow-cooked lamb and vegetable soup with fresh herbs. Warming, filling, and deeply flavourful.",
            original_price=60000, discounted_price=26000, quantity=5,
            pickup_start="18:00", pickup_end="21:00", image_url=R4, is_available=True),
        FoodItem(shop_id=st1.id, name="Dimlama Bag (2 portions)",
            description="Slow-cooked dimlama stew — lamb, potatoes, cabbage, and peppers layered and steamed. A comforting Uzbek family dish.",
            original_price=80000, discounted_price=35000, quantity=4,
            pickup_start="19:00", pickup_end="22:00", image_url=R6, is_available=True),

        # ── Tarnov Restaurant Branch 2 (st2) — 7 bags ─────────────────────
        FoodItem(shop_id=st2.id, name="Plov & Salad Combo (2 persons)",
            description="Two portions of Tarnov's Uchtepa plov paired with achichuk salad and fresh non. A complete Uzbek meal at half price.",
            original_price=100000, discounted_price=44000, quantity=4,
            pickup_start="19:00", pickup_end="22:00", image_url=R2, is_available=True),
        FoodItem(shop_id=st2.id, name="Chuchvara Bag (20 pieces)",
            description="Tarnov's small steamed chuchvara dumplings with lamb filling, served in a light broth. Delicate and delicious.",
            original_price=65000, discounted_price=28000, quantity=5,
            pickup_start="18:30", pickup_end="21:30", image_url=R3, is_available=True),
        FoodItem(shop_id=st2.id, name="Mixed Grill Bag (assorted)",
            description="Assortment of today's grilled meats — lamb kebab, chicken shashlik, and liver. Best enjoyed right away.",
            original_price=110000, discounted_price=48000, quantity=3,
            pickup_start="20:00", pickup_end="22:30", image_url=R5, is_available=True),
        FoodItem(shop_id=st2.id, name="Naryn Bag (2 portions)",
            description="Cold naryn noodles with horse meat and onion — a traditional Uzbek dish not commonly found in restaurants. Today's special.",
            original_price=72000, discounted_price=31000, quantity=4,
            pickup_start="18:00", pickup_end="21:00", image_url=R2, is_available=True),
        FoodItem(shop_id=st2.id, name="Samsa & Non Bundle",
            description="Six freshly baked samsa plus two loaves of tandoor non. Perfect takeaway combo from Tarnov Uchtepa at end-of-day.",
            original_price=60000, discounted_price=26000, quantity=6,
            pickup_start="17:30", pickup_end="20:30", image_url=B3, is_available=True),
        FoodItem(shop_id=st2.id, name="Stewed Meat & Rice Bag (2 pcs)",
            description="Tender slow-stewed lamb with saffron rice. Tarnov kitchen leftover from today's lunch service. Rich flavour, generous portions.",
            original_price=85000, discounted_price=37000, quantity=4,
            pickup_start="19:30", pickup_end="22:00", image_url=R6, is_available=True),
        FoodItem(shop_id=st2.id, name="Vegetable Tandir Bag",
            description="Roasted tandir vegetables — eggplant, peppers, tomatoes, and onions cooked in the traditional clay oven. A healthy side or main.",
            original_price=45000, discounted_price=19000, quantity=6,
            pickup_start="18:00", pickup_end="21:00", image_url=R4, is_available=True),

        # ── Diet Bistro Branch 1 (sd1) — 7 bags ───────────────────────────
        FoodItem(shop_id=sd1.id, name="Balanced Meal Box (2 servings)",
            description="Diet Bistro's calorie-counted lunch box — grilled chicken breast, quinoa, steamed broccoli, and a side salad. ~600 kcal per serving.",
            original_price=75000, discounted_price=33000, quantity=6,
            pickup_start="14:00", pickup_end="18:00", image_url=R1, is_available=True),
        FoodItem(shop_id=sd1.id, name="Fresh Salad Bag (3 large)",
            description="Three large fresh salads from today's menu — Caesar, Greek, and tuna nicoise. All dressed separately. Best eaten today.",
            original_price=65000, discounted_price=28000, quantity=7,
            pickup_start="13:00", pickup_end="18:00", image_url=R1, is_available=True),
        FoodItem(shop_id=sd1.id, name="Grain Bowl Bundle (2 bowls)",
            description="Two protein-packed grain bowls — brown rice base with roasted vegetables, chickpeas, and tahini dressing. Nutritious and filling.",
            original_price=70000, discounted_price=30000, quantity=5,
            pickup_start="14:00", pickup_end="18:00", image_url=R2, is_available=True),
        FoodItem(shop_id=sd1.id, name="Cold Press Juice Pack (4 bottles)",
            description="Four cold-pressed juices from today's batch — green detox, carrot-ginger, beetroot, and apple-mint. No added sugar.",
            original_price=60000, discounted_price=25000, quantity=8,
            pickup_start="12:00", pickup_end="18:00", image_url=G7, is_available=True),
        FoodItem(shop_id=sd1.id, name="Soup & Bread Set (2 servings)",
            description="Diet Bistro's daily soup — lentil or mushroom cream soup — plus whole grain sourdough rolls. Light and nourishing.",
            original_price=50000, discounted_price=21000, quantity=7,
            pickup_start="13:30", pickup_end="17:30", image_url=R4, is_available=True),
        FoodItem(shop_id=sd1.id, name="Overnight Oats Pack (3 jars)",
            description="Three jars of Diet Bistro's overnight oats — berry, banana-nut, and matcha chia. Made last night, perfect for today.",
            original_price=45000, discounted_price=19000, quantity=9,
            pickup_start="12:00", pickup_end="17:00", image_url=R1, is_available=True),
        FoodItem(shop_id=sd1.id, name="Protein Wrap Bag (3 pieces)",
            description="Three whole-wheat wraps filled with grilled chicken, avocado, and fresh vegetables. Macro-balanced and delicious.",
            original_price=68000, discounted_price=29000, quantity=6,
            pickup_start="13:00", pickup_end="18:00", image_url=R7, is_available=True),

        # ── Diet Bistro Branch 2 (sd2) — 7 bags ───────────────────────────
        FoodItem(shop_id=sd2.id, name="Diet Lunch Combo (2 pax)",
            description="Two complete diet lunches from Diet Bistro Sergeli — protein, carbs, and veggies balanced perfectly. Today's remaining stock.",
            original_price=80000, discounted_price=35000, quantity=5,
            pickup_start="14:00", pickup_end="18:00", image_url=R1, is_available=True),
        FoodItem(shop_id=sd2.id, name="Vegan Meal Bag",
            description="100% plant-based meals — stuffed bell peppers with quinoa, lentil patties, and roasted cauliflower. Vegan and gluten-free.",
            original_price=65000, discounted_price=27000, quantity=6,
            pickup_start="14:00", pickup_end="18:00", image_url=R1, is_available=True),
        FoodItem(shop_id=sd2.id, name="Smoothie Bowl Pack (2 bowls)",
            description="Thick blended smoothie bowls topped with granola, fresh fruit, and seeds. Acai and mango varieties available today.",
            original_price=55000, discounted_price=23000, quantity=7,
            pickup_start="12:00", pickup_end="17:00", image_url=G7, is_available=True),
        FoodItem(shop_id=sd2.id, name="Low-Calorie Dessert Box",
            description="Sugar-free and low-cal desserts — protein brownies, fruit jellies, and coconut bites. Guilt-free sweetness from Diet Bistro.",
            original_price=48000, discounted_price=20000, quantity=8,
            pickup_start="13:00", pickup_end="18:00", image_url=B6, is_available=True),
        FoodItem(shop_id=sd2.id, name="Meal Prep Bundle (3 containers)",
            description="Three portioned meal prep containers — different dishes for variety. Calorie info on each lid. Ideal for busy weekdays.",
            original_price=90000, discounted_price=39000, quantity=4,
            pickup_start="14:30", pickup_end="18:30", image_url=R2, is_available=True),
        FoodItem(shop_id=sd2.id, name="Fresh Veggie Wrap Set",
            description="Three fresh veggie-packed wraps with hummus, roasted peppers, and leafy greens. Light, crisp, and satisfying.",
            original_price=52000, discounted_price=22000, quantity=7,
            pickup_start="13:00", pickup_end="17:30", image_url=R7, is_available=True),
        FoodItem(shop_id=sd2.id, name="Detox Salad Trio",
            description="Three detox salads — kale & quinoa, beet & walnut, and cucumber mint. Fresh, vibrant, and nutritious.",
            original_price=58000, discounted_price=24000, quantity=6,
            pickup_start="12:30", pickup_end="17:30", image_url=R1, is_available=True),

        # ── Feed UP Fast Food Branch 1 (sf1) — 7 bags ─────────────────────
        FoodItem(shop_id=sf1.id, name="Burger Combo Bag (2 sets)",
            description="Two Feed UP beef burger combos — burger, fries, and drink each. End-of-shift surplus, freshly assembled. Best enjoyed now.",
            original_price=90000, discounted_price=39000, quantity=5,
            pickup_start="20:00", pickup_end="22:30", image_url=F3, is_available=True),
        FoodItem(shop_id=sf1.id, name="Chicken Wrap Pack (3 pieces)",
            description="Three crispy chicken wraps with fresh lettuce, tomato, and mayo. Freshly made today, discounted before closing.",
            original_price=65000, discounted_price=28000, quantity=7,
            pickup_start="19:30", pickup_end="22:00", image_url=F4, is_available=True),
        FoodItem(shop_id=sf1.id, name="Hot Dog Bag (4 pieces)",
            description="Feed UP classic hot dogs with mustard, ketchup, and crispy onions. End-of-day batch at half price. Quick and satisfying.",
            original_price=44000, discounted_price=18000, quantity=8,
            pickup_start="19:30", pickup_end="22:00", image_url=F2, is_available=True),
        FoodItem(shop_id=sf1.id, name="Loaded Fries Box (large)",
            description="Extra-large portion of Feed UP's seasoned fries with cheese sauce and jalapeños. Today's last batch at end-of-shift.",
            original_price=38000, discounted_price=15000, quantity=10,
            pickup_start="20:00", pickup_end="22:30", image_url=F5, is_available=True),
        FoodItem(shop_id=sf1.id, name="Nuggets & Dip Pack (15 pcs)",
            description="15 crispy chicken nuggets with three dipping sauces — BBQ, ranch, and sweet chili. End-of-shift surplus from Feed UP kitchen.",
            original_price=55000, discounted_price=23000, quantity=6,
            pickup_start="20:00", pickup_end="22:30", image_url=F1, is_available=True),
        FoodItem(shop_id=sf1.id, name="Pizza Slice Bag (4 slices)",
            description="Four slices of today's Feed UP pizza — pepperoni, margherita, and veggie options. End-of-evening at discount.",
            original_price=60000, discounted_price=25000, quantity=5,
            pickup_start="20:30", pickup_end="23:00", image_url=F6, is_available=True),
        FoodItem(shop_id=sf1.id, name="Combo Mystery Bag",
            description="Feed UP closing surprise bag — random assortment of burgers, wraps, sides, and drinks from tonight's kitchen. Always great value.",
            original_price=80000, discounted_price=33000, quantity=7,
            pickup_start="21:00", pickup_end="23:00", image_url=F7, is_available=True),

        # ── Feed UP Fast Food Branch 2 (sf2) — 7 bags ─────────────────────
        FoodItem(shop_id=sf2.id, name="Double Burger Meal (2 pax)",
            description="Two Feed UP double beef burgers with sides. Freshly assembled from today's closing inventory. Great deal for two.",
            original_price=95000, discounted_price=41000, quantity=4,
            pickup_start="20:00", pickup_end="22:30", image_url=F3, is_available=True),
        FoodItem(shop_id=sf2.id, name="Snack Attack Box",
            description="Assorted fast food snacks from Feed UP Chilonzor — mini burgers, nuggets, fries, and onion rings. End-of-shift mixed box.",
            original_price=70000, discounted_price=30000, quantity=6,
            pickup_start="20:00", pickup_end="22:30", image_url=F1, is_available=True),
        FoodItem(shop_id=sf2.id, name="Shawarma Pack (3 pieces)",
            description="Three Feed UP shawarmas — chicken and beef varieties with garlic sauce and fresh vegetables in warm lavash.",
            original_price=72000, discounted_price=31000, quantity=7,
            pickup_start="19:30", pickup_end="22:00", image_url=F4, is_available=True),
        FoodItem(shop_id=sf2.id, name="Family Fries Pack (XL)",
            description="Jumbo portion of Feed UP fries — enough for 3-4 people. Seasoned, crispy, and freshly cooked. End of service discount.",
            original_price=40000, discounted_price=16000, quantity=9,
            pickup_start="20:00", pickup_end="22:30", image_url=F5, is_available=True),
        FoodItem(shop_id=sf2.id, name="Drink & Dessert Bundle",
            description="Four large drinks (cola, lemonade, juice) plus two dessert pots from Feed UP. Perfect close to the meal.",
            original_price=45000, discounted_price=18000, quantity=8,
            pickup_start="20:30", pickup_end="22:30", image_url=F6, is_available=True),
        FoodItem(shop_id=sf2.id, name="Chicken Burger + Side Bag (3 sets)",
            description="Three chicken burger meals with fries. Freshly prepared from today's last service. Feed UP Chilonzor closing special.",
            original_price=85000, discounted_price=36000, quantity=5,
            pickup_start="20:00", pickup_end="22:30", image_url=F3, is_available=True),
        FoodItem(shop_id=sf2.id, name="Late Night Surprise Bag",
            description="Feed UP's end-of-night mystery bag — whatever is left from the kitchen, always valued at double the price. No two bags are the same.",
            original_price=75000, discounted_price=30000, quantity=6,
            pickup_start="21:30", pickup_end="23:30", image_url=F7, is_available=True),
    ]

    db.session.add_all(items)
    db.session.flush()

    # ── ORDERS (15+ per customer) ─────────────────────────────────────────
    random.seed(42)
    statuses = ["picked_up", "picked_up", "picked_up", "confirmed", "cancelled", "pending"]
    payments = ["cash", "cash", "cash", "online"]
    all_orders = []
    all_reviews = []

    review_comments = [
        "Amazing value, so fresh!", "Great deal, will order again.",
        "Exactly as described. Love Tejam!", "Picked up and it was perfect.",
        "Such a good find, highly recommend.", "Fresh and delicious!",
        "Great food at an unbeatable price.", "Really happy with this order.",
        "Staff was very friendly at pickup.", "Best deal I've found in Tashkent.",
    ]

    for customer in customers:
        for i in range(15):
            item = random.choice(items)
            qty = random.randint(1, 2)
            status = random.choice(statuses)
            payment = random.choice(payments)
            days_ago = random.randint(0, 45)
            created = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 8))
            order = Order(
                customer_id=customer.id,
                food_item_id=item.id,
                quantity=qty,
                total_price=item.discounted_price * qty,
                status=status,
                payment_method=payment,
                notes="",
            )
            order.created_at = created
            all_orders.append(order)

    db.session.add_all(all_orders)
    db.session.flush()

    # Reviews for picked_up orders
    for order in all_orders:
        if order.status == "picked_up":
            item = next((i for i in items if i.id == order.food_item_id), None)
            if not item:
                continue
            review = Review(
                order_id=order.id,
                customer_id=order.customer_id,
                shop_id=item.shop_id,
                rating=random.randint(4, 5),
                comment=random.choice(review_comments),
            )
            all_reviews.append(review)

    db.session.add_all(all_reviews)

    # Update shop ratings from reviews
    from collections import defaultdict
    shop_ratings = defaultdict(list)
    for r in all_reviews:
        shop_ratings[r.shop_id].append(r.rating)
    for shop in all_shops:
        if shop_ratings[shop.id]:
            shop.rating = round(sum(shop_ratings[shop.id]) / len(shop_ratings[shop.id]), 1)

    db.session.commit()
    print(f"Database seeded: 5 partners, {len(customers)} customers, {len(items)} listings, {len(all_orders)} orders, {len(all_reviews)} reviews.")


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
