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
        "commission_rate": 0.10,
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
            "ALTER TABLE food_items ADD COLUMN contents_hint TEXT",
            "ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 1",
            "ALTER TABLE orders ADD COLUMN commission_rate REAL DEFAULT 0.10",
            "ALTER TABLE orders ADD COLUMN commission_amount REAL DEFAULT 0.0",
            "ALTER TABLE orders ADD COLUMN shop_payout REAL DEFAULT 0.0",
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
        FoodItem(shop_id=sk1.id, name="Korzinka Bakery Surprise Bag",
            description="A surprise selection from Korzinka's in-store bakery. Freshly baked today — contents vary daily but always great value.",
            contents_hint="May include: non bread, rolls, buns, flatbreads, or pastries",
            original_price=35000, discounted_price=14000, quantity=12,
            pickup_start="18:00", pickup_end="21:00", image_url=B3, is_available=True),
        FoodItem(shop_id=sk1.id, name="Korzinka Ready Meal Surprise Bag",
            description="Today's surplus hot ready meals from Korzinka's kitchen counter. Prepared fresh in-store, discounted before closing. Exact dishes vary.",
            contents_hint="May include: rice dishes, cutlets, stews, or pilaf — minimum 2 portions",
            original_price=55000, discounted_price=24000, quantity=8,
            pickup_start="19:00", pickup_end="21:30", image_url=G4, is_available=True),
        FoodItem(shop_id=sk1.id, name="Korzinka Fruit & Veggie Rescue Bag",
            description="Assorted fresh fruits and vegetables at end-of-day price. All perfectly fresh — just surplus from today's delivery.",
            contents_hint="May include: tomatoes, peppers, cucumbers, apples, and seasonal produce",
            original_price=40000, discounted_price=15000, quantity=10,
            pickup_start="18:30", pickup_end="21:00", image_url=G2, is_available=True),
        FoodItem(shop_id=sk1.id, name="Korzinka Dairy Surprise Bag",
            description="A surprise selection of fresh local dairy products from today's surplus. Farm-fresh and within date.",
            contents_hint="May include: kefir, suzma, kaymak, yogurt, or fresh milk",
            original_price=30000, discounted_price=13000, quantity=7,
            pickup_start="17:00", pickup_end="20:00", image_url=G3, is_available=True),
        FoodItem(shop_id=sk1.id, name="Korzinka Deli Surprise Bag",
            description="Surplus deli items from today's counter at Korzinka. Perfectly fresh, packaged for convenience.",
            contents_hint="May include: sliced meats, cheeses, cold cuts, or deli salads",
            original_price=48000, discounted_price=20000, quantity=5,
            pickup_start="18:00", pickup_end="21:00", image_url=G5, is_available=True),
        FoodItem(shop_id=sk1.id, name="Korzinka Snack Surprise Bag",
            description="Assorted near-expiry snacks and drinks from Korzinka shelves. Random selection, always worth more than you pay.",
            contents_hint="May include: snacks, juices, soft drinks, or packaged treats",
            original_price=25000, discounted_price=10000, quantity=15,
            pickup_start="19:00", pickup_end="22:00", image_url=G6, is_available=True),
        FoodItem(shop_id=sk1.id, name="Korzinka Mystery Bag (Large)",
            description="Our biggest surprise bag — a large assortment from across Korzinka's departments. Value always exceeds the price paid.",
            contents_hint="May include: bread, dairy, snacks, ready meals, fruits, or drinks",
            original_price=60000, discounted_price=22000, quantity=6,
            pickup_start="19:30", pickup_end="22:00", image_url=G1, is_available=True),

        # ── Korzinka Branch 2 (sk2) — 7 bags ──────────────────────────────
        FoodItem(shop_id=sk2.id, name="Korzinka Grocery Surprise Bag",
            description="A surprise mix of pantry staples and fresh items from Korzinka Oybek. Contents change daily — always great value.",
            contents_hint="May include: bread, dairy, snacks, fruits, or packaged goods",
            original_price=60000, discounted_price=25000, quantity=8,
            pickup_start="18:00", pickup_end="21:00", image_url=G1, is_available=True),
        FoodItem(shop_id=sk2.id, name="Korzinka Juice & Drink Surprise Bag",
            description="Today's surplus juices and drinks from Korzinka's chilled section. Best before tonight.",
            contents_hint="May include: cold-pressed juices, smoothies, or bottled drinks",
            original_price=32000, discounted_price=13000, quantity=10,
            pickup_start="17:00", pickup_end="20:00", image_url=G7, is_available=True),
        FoodItem(shop_id=sk2.id, name="Korzinka Breakfast Surprise Bag",
            description="Everything you need for a fresh breakfast — surplus from today's morning delivery.",
            contents_hint="May include: eggs, milk, butter, yogurt, or bread",
            original_price=38000, discounted_price=16000, quantity=6,
            pickup_start="18:00", pickup_end="20:30", image_url=G3, is_available=True),
        FoodItem(shop_id=sk2.id, name="Korzinka Bread Surprise Bag",
            description="Today's unsold bread from Korzinka's in-store bakery — baked fresh this morning.",
            contents_hint="May include: white loaves, grain bread, flatbreads, or rolls",
            original_price=20000, discounted_price=8000, quantity=12,
            pickup_start="17:30", pickup_end="20:00", image_url=B3, is_available=True),
        FoodItem(shop_id=sk2.id, name="Korzinka Seasonal Fruit Surprise Bag",
            description="A surprise box of fresh seasonal fruits from today's delivery. Exact contents depend on what's freshest today.",
            contents_hint="May include: apples, pears, citrus, grapes, or seasonal local fruits",
            original_price=45000, discounted_price=19000, quantity=7,
            pickup_start="18:00", pickup_end="21:00", image_url=G2, is_available=True),
        FoodItem(shop_id=sk2.id, name="Korzinka Soup & Meal Surprise Bag",
            description="Surplus kitchen-made meals and soups from Korzinka's hot food section. Just heat and serve.",
            contents_hint="May include: shurpa, lagman, or other ready soups and hot dishes",
            original_price=40000, discounted_price=17000, quantity=5,
            pickup_start="19:00", pickup_end="21:30", image_url=R4, is_available=True),
        FoodItem(shop_id=sk2.id, name="Korzinka Dairy & Cheese Surprise Bag",
            description="A surprise selection of local yogurts and cheeses from today's dairy surplus at Korzinka Oybek.",
            contents_hint="May include: yogurts, soft cheeses, sour cream, or dairy spreads",
            original_price=35000, discounted_price=14000, quantity=8,
            pickup_start="17:00", pickup_end="20:00", image_url=G3, is_available=True),

        # ── Sofia Bakery Branch 1 (ss1) — 7 bags ──────────────────────────
        FoodItem(shop_id=ss1.id, name="Sofia Pastry Surprise Bag",
            description="A surprise selection of Sofia's freshly baked pastries — whatever came out of the oven today. End-of-day at half price.",
            contents_hint="May include: croissants, danishes, pain au chocolat, almond puffs, or cinnamon rolls",
            original_price=65000, discounted_price=28000, quantity=8,
            pickup_start="17:00", pickup_end="20:00", image_url=B1, is_available=True),
        FoodItem(shop_id=ss1.id, name="Sofia Artisan Bread Surprise Bag",
            description="Today's unsold artisan breads from Sofia's stone oven. Made with natural starter — exact loaves vary daily.",
            contents_hint="May include: sourdough, focaccia, rosemary bread, or grain loaves",
            original_price=48000, discounted_price=20000, quantity=6,
            pickup_start="17:00", pickup_end="20:00", image_url=B2, is_available=True),
        FoodItem(shop_id=ss1.id, name="Sofia Sweet Surprise Bag",
            description="A surprise selection of Sofia's freshly baked cakes and sweets — whatever's left at the end of the day. Always a treat.",
            contents_hint="May include: cake slices, cookies, brownies, muffins, or tarts",
            original_price=80000, discounted_price=34000, quantity=5,
            pickup_start="17:30", pickup_end="20:30", image_url=B4, is_available=True),
        FoodItem(shop_id=ss1.id, name="Sofia Cookie & Biscuit Surprise Bag",
            description="Today's surplus cookies and biscuits from Sofia's baking — freshly made, discounted before closing.",
            contents_hint="May include: butter cookies, almond biscuits, jam cookies, or chocolate chip",
            original_price=55000, discounted_price=23000, quantity=9,
            pickup_start="16:30", pickup_end="19:30", image_url=B5, is_available=True),
        FoodItem(shop_id=ss1.id, name="Sofia Uzbek Bread Surprise Bag",
            description="Traditional Uzbek breads from Sofia's tandoor oven — exact varieties depend on what was baked today.",
            contents_hint="May include: sesame non, obi non, flatbreads, or crispy lavash",
            original_price=30000, discounted_price=12000, quantity=12,
            pickup_start="17:00", pickup_end="20:00", image_url=B3, is_available=True),
        FoodItem(shop_id=ss1.id, name="Sofia Whole Cake Surprise",
            description="Today's unsold whole cake from Sofia's display — exact flavour is a surprise. Serves 4–6 people at a big discount.",
            contents_hint="May be: honey-sponge, chocolate layer, fruit cream, or carrot cake",
            original_price=130000, discounted_price=55000, quantity=3,
            pickup_start="18:00", pickup_end="20:30", image_url=B4, is_available=True),
        FoodItem(shop_id=ss1.id, name="Sofia Café Bakes Surprise Bag",
            description="Surplus baked goods from Sofia's café section — perfect with coffee or tea.",
            contents_hint="May include: brownies, muffins, scones, or mini cakes",
            original_price=60000, discounted_price=25000, quantity=7,
            pickup_start="16:00", pickup_end="19:00", image_url=B6, is_available=True),

        # ── Sofia Bakery Branch 2 (ss2) — 7 bags ──────────────────────────
        FoodItem(shop_id=ss2.id, name="Sofia Morning Pastry Surprise Bag",
            description="Today's morning pastry surplus from Sofia Mirzo Ulug'bek — baked before 8am, best enjoyed today.",
            contents_hint="May include: croissants, danishes, cinnamon rolls, or pain au chocolat",
            original_price=60000, discounted_price=25000, quantity=8,
            pickup_start="17:00", pickup_end="20:00", image_url=B1, is_available=True),
        FoodItem(shop_id=ss2.id, name="Sofia Artisan Loaf Surprise Bag",
            description="Today's unsold artisan loaves — hand-shaped and stone-baked at Sofia Mirzo Ulug'bek. Exact varieties vary.",
            contents_hint="May include: multigrain loaves, sourdough, white sandwich bread, or rye",
            original_price=45000, discounted_price=19000, quantity=6,
            pickup_start="17:00", pickup_end="20:00", image_url=B2, is_available=True),
        FoodItem(shop_id=ss2.id, name="Sofia Celebration Cake Surprise Bag",
            description="Leftover slices from today's celebration cakes — flavour is a surprise every time. Perfect for dessert.",
            contents_hint="May include: vanilla cream, strawberry, chocolate ganache, or fruit cake slices",
            original_price=75000, discounted_price=32000, quantity=4,
            pickup_start="18:00", pickup_end="20:30", image_url=B4, is_available=True),
        FoodItem(shop_id=ss2.id, name="Sofia Patisserie Surprise Bag",
            description="French-inspired surplus from today's patisserie counter at Sofia — changes daily.",
            contents_hint="May include: tarts, éclairs, macarons, or choux pastry",
            original_price=70000, discounted_price=30000, quantity=5,
            pickup_start="17:30", pickup_end="20:30", image_url=B5, is_available=True),
        FoodItem(shop_id=ss2.id, name="Sofia Traditional Sweets Surprise Bag",
            description="A surprise selection of Uzbek traditional sweets from Sofia's confectionery counter.",
            contents_hint="May include: halva, parvarda, nougat, or dried fruit sweets",
            original_price=65000, discounted_price=28000, quantity=7,
            pickup_start="16:00", pickup_end="19:00", image_url=B5, is_available=True),
        FoodItem(shop_id=ss2.id, name="Sofia Specialty Bread Surprise Bag",
            description="Today's specialty breads from Sofia's afternoon bake — exact contents depend on the day's production.",
            contents_hint="May include: focaccia, olive bread, herb flatbreads, or cheese bread",
            original_price=42000, discounted_price=17000, quantity=8,
            pickup_start="17:00", pickup_end="20:00", image_url=B2, is_available=True),
        FoodItem(shop_id=ss2.id, name="Sofia Chilled Dessert Surprise Bag",
            description="Today's chilled surplus desserts from Sofia's display fridge — exact items vary daily.",
            contents_hint="May include: cheesecake, panna cotta, tiramisu, or cream desserts",
            original_price=72000, discounted_price=30000, quantity=4,
            pickup_start="17:30", pickup_end="20:30", image_url=B7, is_available=True),

        # ── Tarnov Restaurant Branch 1 (st1) — 7 bags ─────────────────────
        FoodItem(shop_id=st1.id, name="Tarnov Rice Dish Surprise Bag",
            description="Surplus rice dishes from Tarnov's kitchen — today's exact dish depends on what was cooked. Always a generous portion.",
            contents_hint="May include: plov, rice pilaf, or rice with stew — minimum 2 portions",
            original_price=95000, discounted_price=42000, quantity=5,
            pickup_start="19:00", pickup_end="22:00", image_url=R2, is_available=True),
        FoodItem(shop_id=st1.id, name="Tarnov Dumpling Surprise Bag",
            description="End-of-evening surplus dumplings from Tarnov's kitchen. Type varies — always freshly made.",
            contents_hint="May include: manti, chuchvara, or dumpling soup — minimum 10 pieces",
            original_price=75000, discounted_price=33000, quantity=4,
            pickup_start="18:30", pickup_end="21:30", image_url=R3, is_available=True),
        FoodItem(shop_id=st1.id, name="Tarnov Tandoor Surprise Bag",
            description="Last items from Tarnov's tandoor oven today — exact contents vary daily.",
            contents_hint="May include: samsa, non bread, or tandoor-baked pastries",
            original_price=56000, discounted_price=24000, quantity=7,
            pickup_start="17:30", pickup_end="20:30", image_url=B3, is_available=True),
        FoodItem(shop_id=st1.id, name="Tarnov Noodle Dish Surprise Bag",
            description="Surplus noodle dishes from Tarnov's evening service — type depends on today's kitchen.",
            contents_hint="May include: lagman, fried noodles, or noodle soup — minimum 2 portions",
            original_price=70000, discounted_price=31000, quantity=4,
            pickup_start="19:00", pickup_end="22:00", image_url=R4, is_available=True),
        FoodItem(shop_id=st1.id, name="Tarnov Grill Surprise Bag",
            description="Today's surplus grilled meats from Tarnov — exact selection depends on tonight's service.",
            contents_hint="May include: lamb kebab, chicken shashlik, beef ribs, or mixed grill",
            original_price=120000, discounted_price=52000, quantity=3,
            pickup_start="20:00", pickup_end="22:30", image_url=R5, is_available=True),
        FoodItem(shop_id=st1.id, name="Tarnov Soup Surprise Bag",
            description="Surplus soups from Tarnov's kitchen — hearty and warming, exact type varies by day.",
            contents_hint="May include: shurpa, mastava, or lamb broth — minimum 2 bowls",
            original_price=60000, discounted_price=26000, quantity=5,
            pickup_start="18:00", pickup_end="21:00", image_url=R4, is_available=True),
        FoodItem(shop_id=st1.id, name="Tarnov Stew Surprise Bag",
            description="Slow-cooked stew dishes from today's Tarnov kitchen surplus — hearty and flavourful.",
            contents_hint="May include: dimlama, basma, or meat and vegetable stew — minimum 2 portions",
            original_price=80000, discounted_price=35000, quantity=4,
            pickup_start="19:00", pickup_end="22:00", image_url=R6, is_available=True),

        # ── Tarnov Restaurant Branch 2 (st2) — 7 bags ─────────────────────
        FoodItem(shop_id=st2.id, name="Tarnov Full Meal Surprise Bag",
            description="A complete Uzbek meal from Tarnov Chorsu — surprise combination of dishes from today's service.",
            contents_hint="May include: plov, salad, bread, and a side — minimum 2 persons",
            original_price=100000, discounted_price=44000, quantity=4,
            pickup_start="19:00", pickup_end="22:00", image_url=R2, is_available=True),
        FoodItem(shop_id=st2.id, name="Tarnov Small Dumpling Surprise Bag",
            description="Today's surplus small dumplings from Tarnov Chorsu — exact type depends on kitchen.",
            contents_hint="May include: chuchvara, manti, or dumpling broth — minimum 15 pieces",
            original_price=65000, discounted_price=28000, quantity=5,
            pickup_start="18:30", pickup_end="21:30", image_url=R3, is_available=True),
        FoodItem(shop_id=st2.id, name="Tarnov Mixed Grill Surprise Bag",
            description="An assortment of today's grilled meats from Tarnov Chorsu — type and cut varies by day.",
            contents_hint="May include: lamb kebab, shashlik, beef, or chicken — minimum 4 skewers",
            original_price=110000, discounted_price=48000, quantity=3,
            pickup_start="20:00", pickup_end="22:30", image_url=R5, is_available=True),
        FoodItem(shop_id=st2.id, name="Tarnov Traditional Dish Surprise Bag",
            description="A surprise traditional Uzbek dish from Tarnov Chorsu — rare dishes that change daily.",
            contents_hint="May include: naryn, oshi, mastava, or other traditional specialties",
            original_price=72000, discounted_price=31000, quantity=4,
            pickup_start="18:00", pickup_end="21:00", image_url=R2, is_available=True),
        FoodItem(shop_id=st2.id, name="Tarnov Baked Goods Surprise Bag",
            description="Surplus baked items from Tarnov's tandoor — changes every day.",
            contents_hint="May include: samsa, non bread, or other tandoor-baked items",
            original_price=60000, discounted_price=26000, quantity=6,
            pickup_start="17:30", pickup_end="20:30", image_url=B3, is_available=True),
        FoodItem(shop_id=st2.id, name="Tarnov Hot Meal Surprise Bag",
            description="Warm surplus dishes from today's lunch service at Tarnov Chorsu. Rich and filling.",
            contents_hint="May include: stewed meat, rice dishes, or hot mains — minimum 2 portions",
            original_price=85000, discounted_price=37000, quantity=4,
            pickup_start="19:30", pickup_end="22:00", image_url=R6, is_available=True),
        FoodItem(shop_id=st2.id, name="Tarnov Veggie Surprise Bag",
            description="Surplus vegetable dishes from Tarnov's kitchen — healthy and flavourful.",
            contents_hint="May include: roasted vegetables, vegetable stew, salads, or grilled veggies",
            original_price=45000, discounted_price=19000, quantity=6,
            pickup_start="18:00", pickup_end="21:00", image_url=R4, is_available=True),

        # ── Diet Bistro Branch 1 (sd1) — 7 bags ───────────────────────────
        FoodItem(shop_id=sd1.id, name="Diet Bistro Meal Surprise Bag",
            description="Today's surplus calorie-counted meals from Diet Bistro Labzak. Exact dishes vary — always balanced and nutritious.",
            contents_hint="May include: grilled proteins, grain bowls, or balanced lunch boxes — minimum 2 servings",
            original_price=75000, discounted_price=33000, quantity=6,
            pickup_start="14:00", pickup_end="18:00", image_url=R1, is_available=True),
        FoodItem(shop_id=sd1.id, name="Diet Bistro Salad Surprise Bag",
            description="Surplus fresh salads from Diet Bistro's today's menu. Exact types change daily.",
            contents_hint="May include: Caesar, Greek, tuna, or seasonal salads — minimum 3 portions",
            original_price=65000, discounted_price=28000, quantity=7,
            pickup_start="13:00", pickup_end="18:00", image_url=R1, is_available=True),
        FoodItem(shop_id=sd1.id, name="Diet Bistro Grain Bowl Surprise Bag",
            description="Surplus grain bowls from Diet Bistro — protein-packed and nutritious. Toppings and base vary daily.",
            contents_hint="May include: quinoa bowls, brown rice bowls, or lentil bowls with various toppings",
            original_price=70000, discounted_price=30000, quantity=5,
            pickup_start="14:00", pickup_end="18:00", image_url=R2, is_available=True),
        FoodItem(shop_id=sd1.id, name="Diet Bistro Juice Surprise Bag",
            description="Today's surplus cold-pressed juices from Diet Bistro. No added sugar, exact flavours vary.",
            contents_hint="May include: green detox, carrot-ginger, beetroot, or fruit blends",
            original_price=60000, discounted_price=25000, quantity=8,
            pickup_start="12:00", pickup_end="18:00", image_url=G7, is_available=True),
        FoodItem(shop_id=sd1.id, name="Diet Bistro Soup & Bread Surprise Bag",
            description="Today's surplus soup plus fresh bread from Diet Bistro. Exact soup type depends on today's kitchen.",
            contents_hint="May include: lentil, mushroom, tomato, or vegetable soup with bread",
            original_price=50000, discounted_price=21000, quantity=7,
            pickup_start="13:30", pickup_end="17:30", image_url=R4, is_available=True),
        FoodItem(shop_id=sd1.id, name="Diet Bistro Breakfast Surprise Bag",
            description="Surplus breakfast items from Diet Bistro — healthy and ready to eat.",
            contents_hint="May include: overnight oats, yogurt parfaits, or smoothie jars",
            original_price=45000, discounted_price=19000, quantity=9,
            pickup_start="12:00", pickup_end="17:00", image_url=R1, is_available=True),
        FoodItem(shop_id=sd1.id, name="Diet Bistro Wrap Surprise Bag",
            description="Today's surplus wraps from Diet Bistro — macro-balanced, exact filling varies.",
            contents_hint="May include: chicken wraps, veggie wraps, or tuna wraps",
            original_price=68000, discounted_price=29000, quantity=6,
            pickup_start="13:00", pickup_end="18:00", image_url=R7, is_available=True),

        # ── Diet Bistro Branch 2 (sd2) — 7 bags ───────────────────────────
        FoodItem(shop_id=sd2.id, name="Diet Bistro Full Meal Surprise Bag",
            description="Today's remaining diet meals from Diet Bistro Yunusobod — balanced and calorie-counted.",
            contents_hint="May include: protein mains, sides, and a healthy drink — minimum 2 servings",
            original_price=80000, discounted_price=35000, quantity=5,
            pickup_start="14:00", pickup_end="18:00", image_url=R1, is_available=True),
        FoodItem(shop_id=sd2.id, name="Diet Bistro Plant-Based Surprise Bag",
            description="100% plant-based surplus from Diet Bistro — vegan and gluten-free options. Exact dishes vary.",
            contents_hint="May include: stuffed vegetables, lentil dishes, roasted cauliflower, or vegan bowls",
            original_price=65000, discounted_price=27000, quantity=6,
            pickup_start="14:00", pickup_end="18:00", image_url=R1, is_available=True),
        FoodItem(shop_id=sd2.id, name="Diet Bistro Smoothie Surprise Bag",
            description="Today's surplus smoothie bowls and drinks from Diet Bistro Yunusobod.",
            contents_hint="May include: smoothie bowls, protein shakes, or blended fruit drinks",
            original_price=55000, discounted_price=23000, quantity=7,
            pickup_start="12:00", pickup_end="17:00", image_url=G7, is_available=True),
        FoodItem(shop_id=sd2.id, name="Diet Bistro Light Dessert Surprise Bag",
            description="Guilt-free surplus desserts from Diet Bistro — sugar-free and low calorie. Exact items change daily.",
            contents_hint="May include: protein brownies, fruit jellies, coconut bites, or chia puddings",
            original_price=48000, discounted_price=20000, quantity=8,
            pickup_start="13:00", pickup_end="18:00", image_url=B6, is_available=True),
        FoodItem(shop_id=sd2.id, name="Diet Bistro Meal Prep Surprise Bag",
            description="Surplus portioned meal prep containers from Diet Bistro — great for busy weekdays.",
            contents_hint="May include: 2-3 different portioned dishes with calorie info",
            original_price=90000, discounted_price=39000, quantity=4,
            pickup_start="14:30", pickup_end="18:30", image_url=R2, is_available=True),
        FoodItem(shop_id=sd2.id, name="Diet Bistro Veggie Wrap Surprise Bag",
            description="Surplus veggie wraps from Diet Bistro Yunusobod — fresh and light.",
            contents_hint="May include: hummus wraps, roasted pepper wraps, or leafy green wraps",
            original_price=52000, discounted_price=22000, quantity=7,
            pickup_start="13:00", pickup_end="17:30", image_url=R7, is_available=True),
        FoodItem(shop_id=sd2.id, name="Diet Bistro Detox Surprise Bag",
            description="Today's surplus detox-focused dishes from Diet Bistro — fresh, vibrant, and nutritious.",
            contents_hint="May include: detox salads, green juices, or light grain dishes",
            original_price=58000, discounted_price=24000, quantity=6,
            pickup_start="12:30", pickup_end="17:30", image_url=R1, is_available=True),

        # ── Feed UP Fast Food Branch 1 (sf1) — 7 bags ─────────────────────
        FoodItem(shop_id=sf1.id, name="Feed UP Burger Surprise Bag",
            description="End-of-shift surplus burgers from Feed UP — exact type is a surprise. Always freshly assembled.",
            contents_hint="May include: beef burgers, chicken burgers, or cheeseburgers with sides",
            original_price=90000, discounted_price=39000, quantity=5,
            pickup_start="20:00", pickup_end="22:30", image_url=F3, is_available=True),
        FoodItem(shop_id=sf1.id, name="Feed UP Wrap Surprise Bag",
            description="Today's surplus wraps from Feed UP kitchen — freshly made, discounted before closing.",
            contents_hint="May include: chicken wraps, shawarma, or veggie wraps",
            original_price=65000, discounted_price=28000, quantity=7,
            pickup_start="19:30", pickup_end="22:00", image_url=F4, is_available=True),
        FoodItem(shop_id=sf1.id, name="Feed UP Hot Snack Surprise Bag",
            description="Surplus hot snacks from Feed UP's end-of-day kitchen — exact items vary.",
            contents_hint="May include: hot dogs, corn dogs, mini burgers, or fried snacks",
            original_price=44000, discounted_price=18000, quantity=8,
            pickup_start="19:30", pickup_end="22:00", image_url=F2, is_available=True),
        FoodItem(shop_id=sf1.id, name="Feed UP Sides Surprise Bag",
            description="Large portion of surplus sides from Feed UP — exact items depend on today's kitchen.",
            contents_hint="May include: fries, onion rings, coleslaw, or loaded potato wedges",
            original_price=38000, discounted_price=15000, quantity=10,
            pickup_start="20:00", pickup_end="22:30", image_url=F5, is_available=True),
        FoodItem(shop_id=sf1.id, name="Feed UP Chicken Surprise Bag",
            description="Surplus chicken items from Feed UP — exact pieces and preparation vary by day.",
            contents_hint="May include: nuggets, chicken strips, fried chicken, or wings",
            original_price=55000, discounted_price=23000, quantity=6,
            pickup_start="20:00", pickup_end="22:30", image_url=F1, is_available=True),
        FoodItem(shop_id=sf1.id, name="Feed UP Pizza Surprise Bag",
            description="Today's surplus pizza from Feed UP — slice types depend on what was made today.",
            contents_hint="May include: pepperoni, margherita, veggie, or mixed topping slices",
            original_price=60000, discounted_price=25000, quantity=5,
            pickup_start="20:30", pickup_end="23:00", image_url=F6, is_available=True),
        FoodItem(shop_id=sf1.id, name="Feed UP Late Night Surprise Bag",
            description="Feed UP's closing mystery bag — whatever is left from the kitchen tonight. Always worth double what you pay.",
            contents_hint="May include: burgers, wraps, sides, drinks, or desserts — no two bags are the same",
            original_price=80000, discounted_price=33000, quantity=7,
            pickup_start="21:00", pickup_end="23:00", image_url=F7, is_available=True),

        # ── Feed UP Fast Food Branch 2 (sf2) — 7 bags ─────────────────────
        FoodItem(shop_id=sf2.id, name="Feed UP Double Meal Surprise Bag",
            description="Closing surplus meals for two from Feed UP Chilonzor — exact items are a surprise.",
            contents_hint="May include: double burgers, chicken meals, or combo boxes for 2",
            original_price=95000, discounted_price=41000, quantity=4,
            pickup_start="20:00", pickup_end="22:30", image_url=F3, is_available=True),
        FoodItem(shop_id=sf2.id, name="Feed UP Snack Surprise Bag",
            description="Assorted end-of-shift snacks from Feed UP Chilonzor — mix changes every night.",
            contents_hint="May include: nuggets, fries, onion rings, mini burgers, or fried sides",
            original_price=70000, discounted_price=30000, quantity=6,
            pickup_start="20:00", pickup_end="22:30", image_url=F1, is_available=True),
        FoodItem(shop_id=sf2.id, name="Feed UP Shawarma Surprise Bag",
            description="Today's surplus shawarmas from Feed UP Chilonzor — exact filling varies daily.",
            contents_hint="May include: chicken shawarma, beef shawarma, or mixed shawarma",
            original_price=72000, discounted_price=31000, quantity=7,
            pickup_start="19:30", pickup_end="22:00", image_url=F4, is_available=True),
        FoodItem(shop_id=sf2.id, name="Feed UP Family Sides Surprise Bag",
            description="Large surplus sides from Feed UP Chilonzor — enough for a group.",
            contents_hint="May include: XL fries, potato wedges, coleslaw, or other sides",
            original_price=40000, discounted_price=16000, quantity=9,
            pickup_start="20:00", pickup_end="22:30", image_url=F5, is_available=True),
        FoodItem(shop_id=sf2.id, name="Feed UP Drinks & Dessert Surprise Bag",
            description="Surplus drinks and desserts from Feed UP Chilonzor — sweet ending to a meal.",
            contents_hint="May include: large drinks, dessert pots, ice cream, or milkshakes",
            original_price=45000, discounted_price=18000, quantity=8,
            pickup_start="20:30", pickup_end="22:30", image_url=F6, is_available=True),
        FoodItem(shop_id=sf2.id, name="Feed UP Chicken Meal Surprise Bag",
            description="Chicken-focused surplus bags from Feed UP Chilonzor — closing special.",
            contents_hint="May include: chicken burgers, wraps, strips, or nuggets with a side",
            original_price=85000, discounted_price=36000, quantity=5,
            pickup_start="20:00", pickup_end="22:30", image_url=F3, is_available=True),
        FoodItem(shop_id=sf2.id, name="Feed UP Closing Surprise Bag",
            description="Feed UP Chilonzor's last call — surplus meals from today's final service, always worth double the price.",
            contents_hint="May include: chicken burgers, beef burgers, wraps, or combo meals with fries",
            original_price=85000, discounted_price=36000, quantity=5,
            pickup_start="21:00", pickup_end="23:00", image_url=F3, is_available=True),
        FoodItem(shop_id=sf2.id, name="Feed UP Late Night Surprise Bag",
            description="Feed UP's end-of-night mystery bag — whatever is left from the kitchen, always valued at double the price. No two bags are the same.",
            contents_hint="May include: burgers, shawarmas, nuggets, fries, or drinks — mix varies every night",
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
