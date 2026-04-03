# Tejam — Food Surplus Marketplace for Uzbekistan

Tejam (тежам — "economical" in Uzbek) is a full-stack web application inspired by Too Good To Go. It connects real Tashkent brands that have surplus food with customers who can buy it at up to 70% off — reducing food waste across the city.

## Features

### For customers
- Browse discounted food from real Tashkent brands: Korzinka, Havas, Safia, Navat, Caravan
- **GPS-based "Near me" sorting** — branches sorted by distance from your location
- **Two payment options** on every order: pay online via Stripe or reserve and pay cash in store
- **QR code pickup** — show the QR code at the store, staff scans to confirm
- **Order tracking** — real-time status: pending → confirmed → picked up
- **Google Maps directions** built into every order
- **Reviews** after completed pickups

### For shop partners
- **One company login manages all branches** — Korzinka logs in once and sees all 3 branches
- **Branch selector** in dashboard and listings — switch between branches or view all at once
- **Revenue analytics** — Recharts graphs per branch or aggregated across all locations
- **Food listing management** — create, edit, toggle availability per branch
- **AI-powered tools** — auto-generate descriptions and suggest optimal discount prices (Google Gemini)
- **Photo upload** for listings — drag and drop or click

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
| Frontend  | React 18 + Vite + Tailwind CSS + React Router v6 + Axios + Recharts |
| Backend   | Python Flask + SQLAlchemy + Flask-JWT-Extended + Flask-Bcrypt + Flask-CORS |
| Database  | SQLite (via SQLAlchemy) |
| Payments  | Stripe Checkout (test mode) via `stripe` Python SDK |
| AI        | Google Gemini API (`gemini-2.5-flash`) via `google-genai` |

## Project Structure

```
tejam/
├── backend/
│   ├── app.py              # Flask app factory, DB migration, seed data
│   ├── models.py           # SQLAlchemy models (User, Shop, FoodItem, Order, Review)
│   ├── config.py           # Config class (keys, CORS, upload settings)
│   ├── routes/
│   │   ├── auth.py         # Register / login / me
│   │   ├── shops.py        # Shop CRUD, /my returns all branches
│   │   ├── food_items.py   # Food item CRUD with shop_id support
│   │   ├── orders.py       # Orders, QR pickup, stats (branch filter)
│   │   ├── payments.py     # Stripe checkout session, verify, retry
│   │   ├── ai.py           # Gemini AI: describe, suggest-price, chat
│   │   ├── admin.py        # Admin-only: stats, user/shop management
│   │   └── uploads.py      # Image upload / serve
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
    │   │   ├── Browse.jsx          # Browse all listings
    │   │   ├── FoodDetail.jsx      # Item detail + order form (Stripe / cash)
    │   │   ├── Orders.jsx          # Customer orders with QR, retry payment
    │   │   ├── PaymentSuccess.jsx  # Post-Stripe redirect confirmation
    │   │   ├── ShopDashboard.jsx   # Branch stats + orders (branch selector)
    │   │   ├── ShopListings.jsx    # Manage listings per branch
    │   │   ├── AIAssistant.jsx     # Chat + tools for shop owners
    │   │   ├── PickupConfirm.jsx   # QR scan page for shop staff
    │   │   ├── AdminPanel.jsx      # Admin dashboard (Overview/Customers/Shops)
    │   │   ├── AdminLogin.jsx      # Separate admin login portal
    │   │   ├── Login.jsx
    │   │   └── Register.jsx
    │   ├── components/
    │   │   ├── Navbar.jsx          # White navbar, role-aware links
    │   │   ├── ProtectedRoute.jsx  # Role-based route guard with custom loginPath
    │   │   ├── FoodCard.jsx
    │   │   ├── ShopCard.jsx
    │   │   ├── MapEmbed.jsx
    │   │   └── ImageUpload.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx     # JWT auth state, login/logout
    │   ├── utils/
    │   │   └── distance.js         # Haversine formula for GPS sorting
    │   └── api/
    │       └── axios.js            # Axios instance with JWT + 401 interceptors
    ├── package.json
    └── vite.config.js
```

## Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Stripe account (free) for payment testing
- A Google Gemini API key (optional — free at https://aistudio.google.com)

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
FRONTEND_URL=http://localhost:5174
EOF

# Run the Flask server
python app.py
```

The backend starts on **http://localhost:5000**

On first run, the database is automatically created and seeded:
- **5 company accounts**, each owning multiple branches (12 total)
- **14 food listings** spread across all branches
- 2 customer accounts + sample orders and reviews
- 1 admin account (guaranteed on every startup)

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend starts on **http://localhost:5173** (or 5174 if 5173 is in use).

## Demo Accounts

### Admin
| Email | Password | Portal |
|-------|----------|--------|
| admin@tejam.uz | password123 | /admin/login |

### Customers
| Email | Password |
|-------|----------|
| customer1@example.com | password123 |
| customer2@example.com | password123 |

### Shop partners — one login per company
Each company account manages all its branches from a single login. Use the branch selector in the dashboard to switch between locations.

| Company | Branches | Email | Password |
|---------|----------|-------|----------|
| Korzinka | 3 (Amir Temur, Chilonzor, Yunusobod) | korzinka@tejam.uz | password123 |
| Havas | 3 (Mustaqillik, Shayxontohur, Mirzo Ulug'bek) | havas@tejam.uz | password123 |
| Safia | 2 (Chilonzor, Yakkasaroy) | safia@tejam.uz | password123 |
| Navat | 2 (Buyuk Ipak Yo'li, Uchtepa) | navat@tejam.uz | password123 |
| Caravan | 2 (Navoiy, Sergeli) | caravan@tejam.uz | password123 |

## Environment Variables

`backend/.env`:

```env
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
GEMINI_API_KEY=AIza...                        # Optional — AI features
DATABASE_URL=sqlite:///tejam.db
STRIPE_SECRET_KEY=sk_test_...                 # Required for online payments
FRONTEND_URL=http://localhost:5174            # Used for Stripe redirect URLs
```

> The app works without Gemini and Stripe keys — AI features show fallback responses and only the cash payment option will function.

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
| GET | `/` | List available items (filter: shop_id, search) |
| GET | `/:id` | Item detail with reviews |
| POST | `/` | Create item — requires `shop_id` (JWT, shop) |
| PUT | `/:id` | Update item (JWT, owner of that branch) |
| DELETE | `/:id` | Delete item (JWT, owner of that branch) |

### Orders (`/api/orders`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | My orders (customer) or all branch orders (shop) |
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
| POST | `/chat` | AI chat assistant (JWT) |

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
| `/dashboard` | Shop only — branch analytics |
| `/listings` | Shop only — branch listings management |
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

Open **http://localhost:5173** (or 5174) in your browser.

## Color Theme

- **Primary:** Dark forest green (`#1a7548`) — sustainability and freshness
- **Accent:** Warm amber (`#f59e0b`) — energy and appetite
