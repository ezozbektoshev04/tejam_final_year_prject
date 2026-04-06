# Tejam — Food Surplus Marketplace for Uzbekistan

Tejam (тежам — "economical" in Uzbek) is a full-stack web application inspired by Too Good To Go. It connects real Tashkent brands that have surplus food with customers who can buy it at up to 70% off — reducing food waste across the city.

## Features

### For customers
- Browse discounted food from real Tashkent brands: Korzinka, Havas, Sofia, Tarnov, Diet Bistro, Feed UP
- **AI-powered personalized recommendations** — "Recommended for you" strip based on order history
- **GPS-based "Near me" sorting** — branches sorted by distance from your location
- **Two payment options** on every order: pay online via Stripe or reserve and pay cash in store
- **QR code pickup** — show the QR code at the store, staff scans to confirm
- **Order tracking** — real-time status: pending → confirmed → picked up
- **Yandex Maps directions** built into every food item page
- **Reviews** after completed pickups

### For shop partners
- **One company login manages all branches** — Korzinka logs in once and sees both branches
- **Branch selector** in dashboard and listings — switch between branches or view all at once
- **Revenue analytics** — Recharts graphs per branch or aggregated across all locations
- **Excel report download** — export orders by period (daily / weekly / hourly) and branch
- **Food listing management** — create, edit, toggle availability per branch
- **Shop Orders page** — dedicated orders view with filters, search, pagination
- **In-app notifications** — bell icon with unread badge, auto-polls every 30 seconds
- **AI-powered tools** — auto-generate descriptions and suggest optimal discount prices (Google Gemini)
- **Photo upload** for listings — drag and drop or click

### AI assistant
- **Live data context** — AI chatbot has real-time access to listings, prices, orders, and revenue
- **Persistent chat history** — session survives page navigation, cleared only on logout
- **Shop mode** — ask about today's sales, revenue, pending orders, top items
- **Customer mode** — ask about cheapest deals, current listings, recent orders
- **Markdown rendering** — formatted responses with bold, bullets, and tables

### For admins
- **Admin panel** at `/admin` — separate login portal
- Manage all customer accounts and shop partners
- Platform-wide stats: revenue, orders, listings, active shops
- Toggle any shop branch active/inactive

### Payments
- **Stripe integration** (test mode) — full card checkout flow with Stripe hosted page
- Unpaid orders shown as "Awaiting payment" with retry and cancel options
- Cash orders and online-paid orders tracked separately with clear badges
- Test card: `4242 4242 4242 4242` · any future expiry · any CVC

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18 + Vite + Tailwind CSS + React Router v6 + Axios + Recharts + react-markdown |
| Backend   | Python Flask + SQLAlchemy + Flask-JWT-Extended + Flask-Bcrypt + Flask-CORS |
| Database  | SQLite (via SQLAlchemy) |
| Payments  | Stripe Checkout (test mode) via `stripe` Python SDK |
| AI        | Google Gemini API (`gemini-2.0-flash`) via `google-genai` |
| Maps      | Yandex Maps JS API 2.1 |
| Reports   | openpyxl (Excel export) |

## Project Structure

```
tejam/
├── backend/
│   ├── app.py              # Flask app factory, DB migration, seed data
│   ├── models.py           # SQLAlchemy models (User, Shop, FoodItem, Order, Review, Notification)
│   ├── config.py           # Config class (keys, CORS, upload settings)
│   ├── routes/
│   │   ├── auth.py         # Register / login / me
│   │   ├── shops.py        # Shop CRUD, /my returns all branches
│   │   ├── food_items.py   # Food item CRUD with shop_id support
│   │   ├── orders.py       # Orders, QR pickup, stats (branch filter)
│   │   ├── payments.py     # Stripe checkout session, verify, retry
│   │   ├── ai.py           # Gemini AI: describe, suggest-price, recommendations, chat
│   │   ├── reports.py      # Excel export with period/granularity filter
│   │   ├── notifications.py # In-app notifications (list, read, read-all)
│   │   ├── admin.py        # Admin-only: stats, user/shop management
│   │   └── uploads.py      # Image upload / serve
│   ├── utils/
│   │   └── notifications.py # create_notification helper
│   ├── uploads/            # Uploaded food images (gitignored)
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── public/
    │   ├── logo-color.png  # Brand logo (light backgrounds)
    │   └── logo-white.png  # Brand logo (dark backgrounds)
    ├── src/
    │   ├── pages/
    │   │   ├── Home.jsx            # Landing page with hero + stats
    │   │   ├── Browse.jsx          # Browse listings + AI recommendations strip
    │   │   ├── FoodDetail.jsx      # Item detail + order form + Yandex Maps
    │   │   ├── Orders.jsx          # Customer orders with QR, retry payment
    │   │   ├── PaymentSuccess.jsx  # Post-Stripe redirect confirmation
    │   │   ├── ShopDashboard.jsx   # Branch stats + report download
    │   │   ├── ShopListings.jsx    # Manage listings per branch
    │   │   ├── ShopOrders.jsx      # Shop orders with filters and pagination
    │   │   ├── AIAssistant.jsx     # Persistent AI chat (shop + customer modes)
    │   │   ├── PickupConfirm.jsx   # QR scan page for shop staff
    │   │   ├── AdminPanel.jsx      # Admin dashboard (Overview/Customers/Shops)
    │   │   ├── AdminLogin.jsx      # Separate admin login portal
    │   │   ├── Login.jsx
    │   │   └── Register.jsx
    │   ├── components/
    │   │   ├── Navbar.jsx          # White navbar, role-aware links, notification bell
    │   │   ├── NotificationBell.jsx # Bell icon, unread badge, 30s polling
    │   │   ├── ProtectedRoute.jsx  # Role-based route guard with custom loginPath
    │   │   ├── FoodCard.jsx
    │   │   ├── ShopCard.jsx        # Distance badge when near-me is active
    │   │   ├── MapEmbed.jsx        # Yandex Maps JS API 2.1 embed
    │   │   └── ImageUpload.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx     # JWT auth state, login/logout (clears chat history)
    │   ├── utils/
    │   │   └── distance.js         # Haversine formula for GPS sorting
    │   └── api/
    │       └── axios.js            # Axios instance with JWT + 401 interceptors
    ├── .env                        # VITE_YANDEX_MAPS_API_KEY
    ├── .env.example
    ├── package.json
    └── vite.config.js
```

## Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Stripe account (free) for payment testing
- A Google Gemini API key (optional — free at https://aistudio.google.com)
- A Yandex Maps API key (optional — free at https://developer.tech.yandex.ru)

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here
DATABASE_URL=sqlite:///tejam.db
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key_here
FRONTEND_URL=http://localhost:5173
EOF

# Run the Flask server
python app.py
```

The backend starts on **http://localhost:5000**

On first run, the database is automatically created and seeded with full demo data:
- **6 shop partner accounts**, each owning 2 branches (12 branches total)
- **84 food listings** (7 bags per branch), with category-matched images
- **10 customer accounts**, each with 15+ orders spread over 45 days
- **67 reviews** on completed orders
- **1 admin account** (guaranteed on every startup)

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (copy from example and fill in your key)
cp .env.example .env
# Edit .env and set VITE_YANDEX_MAPS_API_KEY=your-key

# Start development server
npm run dev
```

The frontend starts on **http://localhost:5173**.

## Demo Accounts

### Admin
| Email | Password | Portal |
|-------|----------|--------|
| admin@tejam.uz | admin123 | /admin/login |

### Customers
| Email | Password |
|-------|----------|
| customer1@tejam.uz | password123 |
| customer2@tejam.uz | password123 |
| customer3@tejam.uz | password123 |
| … | … |
| customer10@tejam.uz | password123 |

### Shop partners — one login per company
Each company account manages both its branches from a single login. Use the branch selector in the dashboard to switch between locations.

| Company | Category | Branches | Email | Password |
|---------|----------|----------|-------|----------|
| Korzinka | Grocery | 2 | korzinka@tejam.uz | password123 |
| Havas | Grocery | 2 | havas@tejam.uz | password123 |
| Sofia | Bakery | 2 | sofia@tejam.uz | password123 |
| Tarnov | Restaurant | 2 | tarnov@tejam.uz | password123 |
| Diet Bistro | Restaurant | 2 | dietbistro@tejam.uz | password123 |
| Feed UP | Fast Food | 2 | feedup@tejam.uz | password123 |

## Environment Variables

`backend/.env`:

```env
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
GEMINI_API_KEY=AIza...                        # Optional — AI features (gemini-2.0-flash)
DATABASE_URL=sqlite:///tejam.db
STRIPE_SECRET_KEY=sk_test_...                 # Required for online payments
FRONTEND_URL=http://localhost:5173            # Used for Stripe redirect URLs
```

`frontend/.env`:

```env
VITE_YANDEX_MAPS_API_KEY=your-key-here       # Optional — interactive map on food detail page
```

> The app works without Gemini, Stripe, and Yandex Maps keys — AI features show fallback responses, only cash payment works, and the map shows address text with external links instead.

## Stripe Setup (Test Mode)

1. Create a free account at [stripe.com](https://stripe.com)
2. Go to **Developers → API keys** → copy the **Secret key** (`sk_test_...`)
3. Add it to `backend/.env` as `STRIPE_SECRET_KEY`
4. Restart the backend

**Test card for checkout:**
```
Card number:  4242 4242 4242 4242
Expiry:       Any future date (e.g. 12/26)
CVC:          Any 3 digits
```

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register customer or shop |
| POST | `/login` | Login → JWT token |
| GET | `/me` | Current user + shops array |

### Shops (`/api/shops`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List active shops (filter: city, category, search) |
| GET | `/my` | All branches for logged-in company (array) |
| GET | `/:id` | Shop detail with food items and reviews |
| PUT | `/:id` | Update shop info (JWT, owner) |

### Food Items (`/api/food-items`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List available items (filter: shop_id, search, category) |
| GET | `/:id` | Item detail with reviews |
| POST | `/` | Create item — requires `shop_id` (JWT, shop) |
| PUT | `/:id` | Update item (JWT, owner of that branch) |
| DELETE | `/:id` | Delete item (JWT, owner of that branch) |

### Orders (`/api/orders`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | My orders (customer) or filtered branch orders (shop) |
| POST | `/` | Place cash order (JWT, customer) |
| PUT | `/:id/status` | Update status (JWT, shop) |
| DELETE | `/:id` | Cancel pending or pending_payment order |
| POST | `/:id/review` | Submit review (picked_up only) |
| GET | `/stats?shop_id=` | Dashboard stats, optional branch filter (JWT, shop) |
| GET | `/pickup/:token` | Order info by QR token (public) |
| PUT | `/pickup/:token/confirm` | Confirm pickup (JWT, shop) |

### Payments (`/api/payments`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/create-checkout-session` | Create Stripe session + pending_payment order |
| POST | `/verify` | Verify Stripe session → confirm order |
| POST | `/retry/:order_id` | New Stripe session for unpaid order |

### AI (`/api/ai`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/describe` | Generate food description (JWT, shop) |
| POST | `/suggest-price` | Suggest discount price (JWT, shop) |
| GET | `/recommendations` | Personalized deal recommendations (JWT, customer) |
| POST | `/chat` | AI chat assistant with live data context (JWT) |

### Reports (`/api/reports`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/export` | Download Excel report (JWT, shop) — params: shop_id, start, end, granularity |

### Notifications (`/api/notifications`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List notifications + unread count (JWT) |
| PUT | `/read-all` | Mark all notifications as read (JWT) |
| PUT | `/:id/read` | Mark one notification as read (JWT) |

### Admin (`/api/admin`) — JWT required, admin role only
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Platform-wide overview stats |
| GET | `/users?role=customer` | List users, filterable by role |
| DELETE | `/users/:id` | Delete a user account |
| GET | `/shops` | All shops with owner and order counts |
| PUT | `/shops/:id/toggle` | Toggle shop active/inactive |

### Uploads (`/uploads`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/image` | Upload food image (JWT, shop) |
| GET | `/:filename` | Serve uploaded image |

## Routing & Access Control

| Path | Access |
|------|--------|
| `/` | Public — landing page |
| `/browse` | Public — browse all listings |
| `/food/:id` | Public — food item detail + order |
| `/login` | Public — customer / shop login |
| `/register` | Public — customer / shop registration |
| `/pickup/:token` | Public — QR pickup confirmation for shop staff |
| `/orders` | Customer only |
| `/dashboard` | Shop only — branch analytics + report download |
| `/listings` | Shop only — branch listings management |
| `/shop-orders` | Shop only — orders with filters and pagination |
| `/ai` | Any logged-in user |
| `/payment/success` | Post-Stripe redirect (customer) |
| `/admin/login` | Public — admin portal login |
| `/admin` | Admin only |

## Order Status Flow

```
Online payment:   pending_payment → (Stripe paid) → pending → confirmed → picked_up
Cash payment:     pending → confirmed → picked_up
Cancelled:        pending_payment or pending → cancelled
```

## Running Both Servers

**Terminal 1 — Backend:**
```bash
cd backend && source venv/bin/activate && python app.py
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

## Color Theme

- **Primary:** Dark forest green (`#1a7548`) — sustainability and freshness
- **Accent:** Warm amber (`#f59e0b`) — energy and appetite
