# Tejam — Food Surplus Marketplace

Tejam (тежам — "economical" in Uzbek) is a full-stack web application for reducing food waste in Tashkent, Uzbekistan. Local food businesses (bakeries, restaurants, grocery stores) list surplus food as discounted **Surprise Bags**. Customers browse, order, and pick up — saving money and reducing waste. Inspired by Too Good To Go.

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| Flask | 3.0.3 | Web framework |
| Flask-SQLAlchemy | 3.1.1 | ORM + database |
| Flask-JWT-Extended | 4.6.0 | JWT authentication |
| Flask-Bcrypt | 1.0.1 | Password hashing |
| Flask-CORS | 4.0.1 | Cross-origin requests |
| python-dotenv | 1.0.1 | Environment variables |
| google-genai | 1.67.0 | Gemini 2.0 Flash AI |
| stripe | 11.4.1 | Online payments |
| openpyxl | 3.1.5 | Excel report export |
| SQLite | — | Database (file: `tejam.db`) |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| React Router DOM | 6.27.0 | Client-side routing |
| Axios | 1.7.7 | HTTP client |
| Recharts | 2.13.0 | Charts and analytics |
| Tailwind CSS | 3.4.14 | Styling |
| qrcode.react | 4.2.0 | QR code generation |
| react-markdown | 10.1.0 | Render AI chat responses |
| Vite | 5.4.9 | Build tool |

---

## Project Structure

```
tejam_second/
├── backend/
│   ├── app.py                 # App factory, blueprint registration, DB migrations, seeding
│   ├── config.py              # Environment config (JWT, DB, Stripe, Gemini, CORS)
│   ├── models.py              # SQLAlchemy models
│   ├── requirements.txt
│   ├── routes/
│   │   ├── auth.py            # Register, verify email, login, forgot/reset password
│   │   ├── shops.py           # Public shop listing, shop detail, shop profile update
│   │   ├── food_items.py      # Public food listings (paginated), CRUD for shop owners
│   │   ├── orders.py          # Order creation, status updates, stats, QR pickup confirm
│   │   ├── payments.py        # Stripe checkout session, payment verify, retry
│   │   ├── admin.py           # Admin panel: users, shops, approval, earnings, settings
│   │   ├── reports.py         # Excel sales report export for shop owners
│   │   ├── ai.py              # Gemini AI: recommendations, price suggest, description, chat
│   │   ├── notifications.py   # In-app notification list and mark-read
│   │   └── uploads.py         # Image upload (5 MB limit, jpg/png/webp)
│   └── utils/
│       ├── email.py           # Gmail SMTP transactional emails
│       └── notifications.py   # Helper to create Notification records
│
└── frontend/
    ├── src/
    │   ├── api/axios.js        # Axios instance with base URL + JWT header injection
    │   ├── context/
    │   │   └── AuthContext.jsx # Global auth state, login/logout/register/refreshUser
    │   ├── components/
    │   │   ├── Navbar.jsx           # Top nav (role-aware links, notification bell)
    │   │   ├── FoodCard.jsx         # Food listing card
    │   │   ├── ShopCard.jsx         # Shop listing card
    │   │   ├── Pagination.jsx       # Shared pagination component
    │   │   ├── NotificationBell.jsx # Bell icon with unread badge, dropdown
    │   │   ├── ImageUpload.jsx      # Drag-and-drop image uploader
    │   │   ├── MapEmbed.jsx         # Google Maps embed for a single shop
    │   │   ├── ShopsMap.jsx         # Map showing all shops
    │   │   └── ProtectedRoute.jsx   # Role-based route guard
    │   ├── pages/
    │   │   ├── Home.jsx             # Landing page: featured listings + shops
    │   │   ├── Browse.jsx           # Paginated food browse with filters
    │   │   ├── FoodDetail.jsx       # Food item detail + order form
    │   │   ├── Orders.jsx           # Customer orders: tabs, progress bar, QR, review
    │   │   ├── Profile.jsx          # Customer profile and account settings
    │   │   ├── Register.jsx         # Registration (customer or shop)
    │   │   ├── Login.jsx            # Login form
    │   │   ├── VerifyEmail.jsx      # Email verification code entry
    │   │   ├── ForgotPassword.jsx   # Password reset request + code entry
    │   │   ├── PendingApproval.jsx  # Shown to shops awaiting admin approval
    │   │   ├── PaymentSuccess.jsx   # Stripe redirect landing page
    │   │   ├── AIAssistant.jsx      # AI chat (role-aware live data)
    │   │   ├── ShopDashboard.jsx    # Shop analytics dashboard + pending orders
    │   │   ├── ShopOrders.jsx       # Shop full order management
    │   │   ├── ShopListings.jsx     # Shop listing CRUD
    │   │   ├── PickupConfirm.jsx    # QR scan confirmation page for shop staff
    │   │   ├── AdminPanel.jsx       # Admin: users, shops, earnings, settings
    │   │   └── AdminLogin.jsx       # Separate admin login page
    │   ├── utils/
    │   │   └── dateTime.js          # Date formatting helpers
    │   └── App.jsx                  # Route definitions
    └── package.json
```

---

## Data Models

### User
| Field | Type | Notes |
|---|---|---|
| id | Integer | Primary key |
| email | String | Unique |
| password_hash | String | bcrypt |
| role | String | `customer`, `shop`, or `admin` |
| name | String | |
| phone | String | |
| is_verified | Boolean | Email must be verified before login |
| is_approved | Boolean | Shops start `False` — admin must approve |
| created_at | DateTime | |

### Shop
| Field | Type | Notes |
|---|---|---|
| id | Integer | |
| user_id | FK → User | Owner |
| name, description, address, city, category | String | |
| image_url | String | |
| rating | Float | Avg of all reviews, auto-updated |
| is_active | Boolean | Admin can deactivate |
| lat, lng | Float | Map coordinates |

### FoodItem (Surprise Bag listing)
| Field | Type | Notes |
|---|---|---|
| id | Integer | |
| shop_id | FK → Shop | |
| name, description, contents_hint | String/Text | AI can generate these |
| original_price, discounted_price | Float | UZS |
| quantity | Integer | Decrements on order |
| pickup_start, pickup_end | String | e.g. `"17:00"` |
| image_url | String | |
| is_available | Boolean | Auto `False` when qty = 0 |
| is_archived | Boolean | Auto `True` when sold out |

### Order
| Field | Type | Notes |
|---|---|---|
| id | Integer | |
| customer_id | FK → User | |
| food_item_id | FK → FoodItem | |
| quantity | Integer | |
| total_price | Float | UZS |
| status | String | `pending_payment` → `pending` → `confirmed` → `picked_up` / `cancelled` |
| payment_method | String | `cash` or `online` |
| pickup_token | UUID | Used for QR code |
| order_ref | String | Human-readable e.g. `TJ-A3B9C1` |
| commission_rate | Float | e.g. `0.10` (10%) |
| commission_amount | Float | Platform earns this |
| shop_payout | Float | Shop receives this |
| notes | Text | Customer notes |

### Notification
| Field | Type | Notes |
|---|---|---|
| user_id | FK → User | |
| message | String | |
| link | String | Frontend route to navigate to |
| is_read | Boolean | |

### PlatformSetting
Key-value store for admin-configurable settings.

| Key | Default | Description |
|---|---|---|
| `commission_rate` | `0.10` | Platform commission per order |
| `categories` | `["Bakery", "Restaurant", ...]` | Food categories |
| `min_discount_percent` | `20` | Minimum recommended discount |
| `max_discount_percent` | `80` | Maximum allowed discount |
| `low_stock_threshold` | `2` | Notify shop when stock ≤ this |
| `notification_order_*` | Template strings | In-app notification message templates |

### ShopPayout
Records each manual commission settlement between admin and a shop.

| Field | Type | Notes |
|---|---|---|
| shop_id | FK → Shop | |
| amount | Float | Amount settled in UZS |
| note | String | e.g. "Bank transfer April 2025" |
| status | String | Always `settled` |
| settled_at | DateTime | |

### VerificationCode
6-digit codes for email verification and password reset. Expire after 15 minutes. Max 5 wrong attempts before lockout.

### Review
Star rating (1–5) + comment, linked to a completed (picked_up) order. Automatically updates the shop's average rating.

---

## User Roles & Flows

### Customer
1. Register → receive 6-digit verification code by email → verify
2. Browse food listings (filter by city, category, search, available now)
3. Place order: **cash** (pay at pickup) or **online** (Stripe)
4. Track order with progress bar: Order placed → Confirmed → Picked up
5. Show QR code at pickup — shop scans to confirm
6. Leave a star review after pickup
7. Get AI-powered food recommendations based on order history
8. Use AI chat assistant to find deals

### Shop Owner
1. Register with shop details → email verification → **wait for admin approval**
2. On approval: receive email notification, can now log in
3. Create and manage food listings with:
   - AI-generated descriptions and contents hints
   - AI-suggested discounted prices
   - Drag-and-drop image upload
4. Dashboard with:
   - Net earnings chart (after commission)
   - Order status breakdown (pie chart)
   - Top items by orders (bar chart)
   - Revenue by category (bar chart)
   - Pending orders table with one-click confirm
5. Manage all orders with filters (status, payment, date, search)
6. Download Excel sales reports (configurable date range, hourly/daily/weekly)
7. AI chat assistant with live data: today's sales, pending orders, stock levels

### Admin
1. Log in at `/admin/login`
2. **Overview** — platform stats: customers, shops, orders, revenue
3. **Pending Shops** — review and approve or reject new shop applications (sends email either way)
4. **Customers** — view all customers, delete accounts
5. **Shop Owners** — view all approved shops, activate/deactivate, view stats
6. **Earnings** — commission tracking:
   - Period filter: this month / last month / last 3 months / all time / custom range
   - Monthly trend bar chart (commission vs gross revenue)
   - Per-shop table: gross revenue, commission owed, shop payout, settled vs pending
   - "Mark settled" button per shop with amount + note
   - Search shops by name or city
   - Pagination (10 per page)
   - Export to Excel (3 sheets: Summary, Monthly Trend, Per Shop)
7. **Settings** — configure categories, discount thresholds, commission rate, notification templates

---

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create account (customer or shop) |
| POST | `/verify-email` | Submit 6-digit verification code |
| POST | `/login` | Get JWT access token |
| POST | `/forgot-password` | Send password reset code |
| POST | `/reset-password` | Set new password with code |
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update name, phone, or password |

### Shops — `/api/shops`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List public approved shops (filter: city, category, search) |
| GET | `/<id>` | Shop detail + food items + reviews |
| GET | `/my` | Authenticated shop owner's branches |
| PUT | `/<id>` | Update shop profile |

### Food Items — `/api/food-items`
| Method | Path | Description |
|---|---|---|
| GET | `/` | Paginated public listing (filter: shop_id, search, category, available_now) |
| GET | `/<id>` | Single item detail |
| POST | `/` | Create listing (shop only) |
| PUT | `/<id>` | Update listing |
| DELETE | `/<id>` | Archive / delete listing |

### Orders — `/api/orders`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List orders (customer: paginated + tab filter; shop: filtered + paginated) |
| POST | `/` | Place cash order (commission applied automatically) |
| PUT | `/<id>/status` | Update status: pending → confirmed → picked_up (shop only) |
| DELETE | `/<id>` | Cancel order, restore stock (customer only) |
| POST | `/<id>/review` | Submit review after pickup |
| GET | `/stats` | Shop analytics: revenue chart, status breakdown, top items, category chart |
| GET | `/pickup/<token>` | QR code public lookup (shows order + customer info) |
| PUT | `/pickup/<token>/confirm` | Confirm pickup via QR scan (shop only) |

### Payments — `/api/payments`
| Method | Path | Description |
|---|---|---|
| POST | `/create-checkout-session` | Create Stripe checkout, pre-create order |
| POST | `/verify` | Verify payment after Stripe redirect, confirm order |
| POST | `/retry/<order_id>` | Retry failed/abandoned payment |

### Admin — `/api/admin`
| Method | Path | Description |
|---|---|---|
| GET | `/stats` | Platform overview numbers |
| GET | `/users` | List users (filter: role) |
| DELETE | `/users/<id>` | Delete user account |
| GET | `/shops` | All shops with listing + order counts |
| PUT | `/shops/<id>/toggle` | Activate / deactivate shop |
| GET | `/pending-shops` | Unapproved shop applications |
| POST | `/approve-shop/<id>` | Approve shop, send email + notification |
| DELETE | `/reject-shop/<id>` | Reject and delete application, send email |
| GET | `/earnings` | Commission data (filter: start, end, search, page) |
| POST | `/earnings/settle` | Record manual commission settlement |
| GET | `/earnings/export` | Download earnings Excel report |
| GET | `/settings` | Get all platform settings |
| PUT | `/settings` | Update platform settings |

### AI — `/api/ai`
| Method | Path | Description |
|---|---|---|
| GET | `/recommendations` | Gemini-powered food recommendations for customer |
| POST | `/describe` | Generate listing description + contents hint for shop |
| POST | `/suggest-price` | Suggest discounted price with reasoning |
| POST | `/chat` | Multi-turn AI chat with live platform data injected |

### Other
| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications/` | List 30 most recent + unread count |
| PUT | `/api/notifications/read-all` | Mark all notifications read |
| PUT | `/api/notifications/<id>/read` | Mark one notification read |
| GET | `/api/reports/export` | Download shop Excel sales report |
| POST | `/uploads/image` | Upload image (returns URL) |

---

## Commission & Monetization

The platform charges a **10% commission** on every completed order (configurable in admin Settings).

Per order, three values are stored in the DB at creation time:

| Field | Example (10,000 UZS order) |
|---|---|
| `commission_rate` | `0.10` |
| `commission_amount` | `1,000 UZS` ← platform earns |
| `shop_payout` | `9,000 UZS` ← shop receives |

**Cash orders:** Customer pays shop directly in person. Admin manually collects commission from shop and records the settlement in the Earnings tab.

**Online orders:** Customer pays via Stripe into the platform's Stripe account. Admin manually transfers 90% to the shop and records the settlement.

> Note: There is no automatic money transfer between parties. All settlements are tracked manually. For scale, Stripe Connect would automate splits.

---

## Email Notifications

Sent via Gmail SMTP. Triggers:

| Event | Recipient |
|---|---|
| Account registered | User — 6-digit verification code |
| Password reset requested | User — reset code |
| Shop application approved | Shop owner — approval confirmation |
| Shop application rejected / account deleted | Shop owner — deletion notice |
| Shop deactivated or reactivated | Shop owner — status change |

---

## In-App Notifications

Created automatically in the `notifications` table, shown via the bell icon in the navbar.

| Event | Recipient |
|---|---|
| Order placed | Customer (pickup instructions) + Shop owner (new order alert) |
| Order confirmed by shop | Customer |
| Order picked up | Customer |
| Order cancelled by shop | Customer |
| Customer cancels order | Customer (confirmation) + Shop owner (stock restored) |
| Item sold out | Shop owner |
| Low stock (≤ threshold) | Shop owner |
| Shop application approved | Shop owner |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Gmail account with an App Password
- Stripe account (test mode works fine)
- Google Gemini API key (optional — all AI features fall back gracefully)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
GEMINI_API_KEY=your-gemini-key
STRIPE_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:5173

# Gmail SMTP (Google Account → Security → App passwords)
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Start:
```bash
flask run
# Runs on http://localhost:5000
# Creates tejam.db and seeds demo data automatically on first run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Optional `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
```

---

## Demo Accounts

Seeded automatically on first run. Password for all: **`password123`**

| Role | Email |
|---|---|
| Admin | admin@tejam.uz |
| Shop — Korzinka (Grocery, 2 branches) | korzinka@tejam.uz |
| Shop — Sofia (Bakery, 2 branches) | sofia@tejam.uz |
| Shop — Tarnov (Restaurant, 2 branches) | tarnov@tejam.uz |
| Shop — Diet Bistro (Restaurant, 2 branches) | dietbistro@tejam.uz |
| Shop — Feed UP (Fast Food, 2 branches) | feedup@tejam.uz |
| Customers | customer1@tejam.uz … customer10@tejam.uz |

---

## Key Features

- **Surprise bag marketplace** — shops list surplus food as discounted bags with pickup windows
- **Dual payment** — cash on pickup or Stripe online checkout with payment verification
- **QR code pickup** — each order has a unique QR code; shop scans to confirm collection
- **Shop approval workflow** — new shops wait for admin approval before going live; email sent on decision
- **Commission system** — 10% platform fee tracked per order, admin manages manual settlements with Excel export
- **AI assistant (Gemini 2.0 Flash)** — context-aware chat with live data, auto-generated descriptions, price suggestions, personalized recommendations
- **Excel exports** — shops export sales reports; admin exports earnings with monthly trend and per-shop breakdown
- **In-app + email notifications** — key lifecycle events trigger both channels automatically
- **Admin panel** — full platform management with analytics charts, configurable settings, and earnings dashboard
- **Interactive maps** — shop locations on embedded maps
- **Fully paginated** — food browse, customer orders, shop orders, and admin earnings all paginated
