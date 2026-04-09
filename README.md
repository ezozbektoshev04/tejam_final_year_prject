# Tejam — Food Surplus Marketplace

Tejam (тежам — "economical" in Uzbek) is a full-stack web app inspired by Too Good To Go. Real Tashkent brands list their leftover food as **Surprise Bags** — customers buy them at up to 70% off, reducing food waste across the city.

---

## Quick Start (run locally from GitHub)

### 1. Clone the repo

```bash
git clone https://github.com/ezozbektoshev04/tejam_second.git
cd tejam_second
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file (copy the template below and fill in your keys)
cp .env.example .env            # or create it manually — see Environment Variables section
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

### 4. Run both servers

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
python app.py
```
Runs on **http://localhost:5000**

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Runs on **http://localhost:5174**

### 5. Open in browser

```
http://localhost:5174
```

On first run the database is created and seeded automatically — no manual DB setup needed.

---

## Environment Variables

Create `backend/.env` with the following content:

```env
# Required
SECRET_KEY=any-random-secret-string
JWT_SECRET_KEY=any-random-jwt-secret-string
DATABASE_URL=sqlite:///tejam.db
FRONTEND_URL=http://localhost:5174

# Required for online payments (Stripe test mode — free at stripe.com)
STRIPE_SECRET_KEY=sk_test_...

# Required for email sending (Gmail with App Password)
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Optional — AI features (free at aistudio.google.com)
GEMINI_API_KEY=AIza...

# Optional — Yandex Maps (free at developer.tech.yandex.ru)
# Also add this to frontend/.env as VITE_YANDEX_MAPS_API_KEY
VITE_YANDEX_MAPS_API_KEY=your-key-here
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_YANDEX_MAPS_API_KEY=your-key-here
```

> **The app works without Gemini, Stripe, and Yandex Maps.** AI features show fallback responses, only cash payment works, and maps show address text with external links instead.

---

## Gmail App Password Setup (for email sending)

Email is used for account verification and password reset.

1. Go to your Google Account → **Security**
2. Enable **2-Step Verification** (required)
3. Go to **Security → App passwords**
4. Create an app password for "Mail"
5. Copy the 16-character password (with spaces, e.g. `xgul zlxp yeik gpce`) into `GMAIL_APP_PASSWORD`

---

## Stripe Setup (for online payments)

1. Create a free account at [stripe.com](https://stripe.com)
2. Go to **Developers → API keys** → copy the **Secret key** (`sk_test_...`)
3. Paste into `STRIPE_SECRET_KEY` in `backend/.env`

**Test card:**
```
Number:  4242 4242 4242 4242
Expiry:  Any future date (e.g. 12/27)
CVC:     Any 3 digits
```

---

## Demo Accounts

All seeded on first run. Password for all accounts: **`password123`**

### Admin
| Email | Password | URL |
|-------|----------|-----|
| admin@tejam.uz | password123 | /admin/login |

### Customers
| Email |
|-------|
| customer1@tejam.uz |
| customer2@tejam.uz |
| … up to customer10@tejam.uz |

### Shop partners (one login per company — manages both branches)

| Company | Category | Email |
|---------|----------|-------|
| Korzinka | Grocery | korzinka@tejam.uz |
| Sofia | Bakery | sofia@tejam.uz |
| Tarnov | Restaurant | tarnov@tejam.uz |
| Diet Bistro | Restaurant | dietbistro@tejam.uz |
| Feed UP | Fast Food | feedup@tejam.uz |

---

## Features

### For customers
- Browse **Surprise Bags** from real Tashkent brands at up to 70% off
- **What's inside?** — contents hint shows what might be in the bag (exact items vary daily)
- **AI personalized recommendations** based on order history
- **GPS "Near me" sorting** — branches sorted by distance from your location
- **Two payment options** — pay online via Stripe or reserve and pay cash in store
- **QR code pickup** — show QR at the shop, staff scans to confirm
- **Order tracking** — pending → confirmed → picked up
- **Order references** — friendly `TJ-XXXXXX` codes
- **Yandex Maps** directions on every listing page
- **Per-item reviews** after completed pickups
- **In-app notifications** — bell icon with unread badge, real-time polling
- **Full notification history** at every order stage

### For shop partners
- **One login manages all branches** — switch via branch selector
- **Surprise Bag listings** — create bags with contents hint, AI generates both description and hint in one click
- **Listing management** — create, edit, toggle availability, archive, restore
- **Archive & restore** — sold-out items auto-archive; restore with new quantity and pickup window
- **Payment status visibility** — see whether each order is paid online, awaiting payment, cash at pickup, or cash collected
- **Revenue analytics** — Recharts graphs per branch or all branches
- **Excel report download** — export by period (daily/weekly/hourly) and branch
- **Pending orders panel** on dashboard — one-click status advance
- **Shop orders page** — filters by status, payment, period, branch + search + pagination
- **AI tools** — auto-generate surprise bag descriptions and suggest discount prices
- **Photo upload** for listings

### For admins (`/admin/login`)
- Platform-wide stats: revenue, orders, listings, active shops
- Manage customer accounts and shop partners
- Toggle any shop branch active/inactive
- Platform settings: categories, discount thresholds, low stock threshold, notification templates

### AI assistant
- **Live data context** — chatbot has real-time access to listings, orders, and revenue
- **Shop mode** — ask about today's sales, pending orders, top items
- **Customer mode** — ask about current deals, cheapest listings, recent orders
- **Markdown responses** — bold, bullets, tables

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, react-markdown |
| Backend | Python Flask, SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt, Flask-CORS |
| Database | SQLite (file-based, zero setup) |
| Payments | Stripe Checkout (test mode) |
| AI | Google Gemini API (`gemini-2.0-flash`) |
| Email | Gmail SMTP via Python `smtplib` (no extra package) |
| Maps | Yandex Maps JS API 2.1 |
| Reports | openpyxl (Excel export) |

---

## Project Structure

```
tejam/
├── backend/
│   ├── app.py                  # App factory, DB migrations, seed data
│   ├── models.py               # SQLAlchemy models
│   ├── config.py               # Config class
│   ├── requirements.txt
│   ├── .env                    # Your environment variables (not committed)
│   ├── routes/
│   │   ├── auth.py             # Register, login, verify email, forgot/reset password
│   │   ├── shops.py            # Shop CRUD
│   │   ├── food_items.py       # Food item CRUD + archive/restore
│   │   ├── orders.py           # Orders, QR pickup, stats
│   │   ├── payments.py         # Stripe checkout
│   │   ├── ai.py               # Gemini AI: describe, suggest-price, recommendations, chat
│   │   ├── reports.py          # Excel export
│   │   ├── notifications.py    # In-app notifications
│   │   ├── admin.py            # Admin endpoints
│   │   └── uploads.py          # Image upload/serve
│   └── utils/
│       ├── email.py            # Gmail SMTP sender
│       └── notifications.py    # create_notification helper
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Browse.jsx
    │   │   ├── FoodDetail.jsx
    │   │   ├── Orders.jsx
    │   │   ├── ShopDashboard.jsx
    │   │   ├── ShopListings.jsx
    │   │   ├── ShopOrders.jsx
    │   │   ├── AIAssistant.jsx
    │   │   ├── PickupConfirm.jsx
    │   │   ├── AdminPanel.jsx
    │   │   ├── AdminLogin.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── VerifyEmail.jsx
    │   │   ├── ForgotPassword.jsx
    │   │   └── Profile.jsx
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── NotificationBell.jsx
    │   │   ├── FoodCard.jsx
    │   │   ├── ShopCard.jsx
    │   │   ├── ShopsMap.jsx
    │   │   ├── MapEmbed.jsx
    │   │   ├── ImageUpload.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── context/AuthContext.jsx
    │   ├── utils/
    │   │   ├── distance.js
    │   │   ├── validate.js
    │   │   └── yandexMaps.js
    │   └── api/axios.js
    ├── .env
    └── .env.example
```

---

## Order Status Flow

```
Online payment:  pending_payment → (Stripe confirmed) → pending → confirmed → picked_up
Cash payment:    pending → confirmed → picked_up
Cancelled:       pending_payment or pending → cancelled  (stock restored automatically)
```

## Food Item Lifecycle

```
Created → available
        → sold out → auto-archived
        → restored by shop (new quantity + pickup window) → available again
```

---

## Routing & Access

| Path | Access |
|------|--------|
| `/` | Public |
| `/browse` | Public |
| `/food/:id` | Public |
| `/login`, `/register` | Public |
| `/pickup/:token` | Public (QR scan for shop staff) |
| `/orders` | Customer only |
| `/dashboard` | Shop only |
| `/listings` | Shop only |
| `/shop-orders` | Shop only |
| `/ai` | Any logged-in user |
| `/profile` | Any logged-in user |
| `/admin/login` | Public |
| `/admin` | Admin only |

---

## Resetting the Database

To reseed with fresh demo data:

```bash
cd backend
rm -f instance/tejam.db
python app.py
```

The database is recreated and reseeded automatically on startup.
