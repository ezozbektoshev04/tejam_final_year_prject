# Tejam — Food Surplus Marketplace for Uzbekistan

Tejam (тежам — "economical" in Uzbek) is a full-stack web application inspired by Too Good To Go. It connects real Tashkent brands that have surplus food with customers who can buy it at up to 70% off — reducing food waste across the city.

## Features

- **Customers** browse discounted food from real Tashkent brands: Korzinka, Havas, Safia, Navat, Caravan, and more
- **Multiple branch locations** per brand with GPS-based "Near me" sorting — find the closest branch instantly
- **Shop owners** list surplus food items, manage orders, and view revenue analytics
- **QR code payment** — customer shows a QR code at pickup, shop scans and confirms cash payment on the spot
- **Google Maps integration** — directions to the pickup location built into every order
- **Photo upload** for food listings — drag and drop or click to upload
- **AI assistant** powered by Google Gemini 2.5 Flash: auto-generate food descriptions, suggest optimal discount prices, chat assistant
- **Real-time order management** with status tracking (pending → confirmed → picked up)
- **Reviews system** for completed orders
- **Recharts** dashboards with revenue graphs and top-item analytics

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18 + Vite + Tailwind CSS + React Router + Axios + Recharts |
| Backend   | Python Flask + SQLAlchemy + Flask-JWT-Extended + Flask-Bcrypt + Flask-CORS |
| Database  | SQLite (via SQLAlchemy) |
| AI        | Google Gemini API (`gemini-2.5-flash`) via `google-genai` |

## Project Structure

```
tejam/
├── backend/
│   ├── app.py              # Flask app factory + seed data
│   ├── models.py           # SQLAlchemy models
│   ├── config.py           # Config class
│   ├── routes/
│   │   ├── auth.py         # Register / login
│   │   ├── shops.py        # Shop CRUD
│   │   ├── food_items.py   # Food item CRUD
│   │   ├── orders.py       # Orders + QR pickup endpoints
│   │   ├── ai.py           # Gemini AI features
│   │   └── uploads.py      # Image upload / serve
│   ├── uploads/            # Uploaded food images
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── pages/          # All page components
    │   ├── components/     # Reusable components (FoodCard, ShopCard, MapEmbed, ImageUpload…)
    │   ├── context/        # AuthContext
    │   ├── utils/          # distance.js (Haversine formula)
    │   └── api/            # Axios instance
    ├── package.json
    └── vite.config.js
```

## Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Google Gemini API key (get one free at https://aistudio.google.com)

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "SECRET_KEY=your-secret-key-here" > .env
echo "JWT_SECRET_KEY=your-jwt-secret-key-here" >> .env
echo "GEMINI_API_KEY=your-gemini-api-key-here" >> .env
echo "DATABASE_URL=sqlite:///tejam.db" >> .env

# Run the Flask server
python app.py
```

The backend will start on **http://localhost:5000**

On first run, the database is automatically created and seeded with real Tashkent brands:
- **12 branch locations** across Tashkent (Korzinka ×3, Havas ×3, Safia ×2, Navat ×2, Caravan ×2)
- **14 food items** spread across all branches
- 2 customer accounts + sample orders and reviews

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on **http://localhost:5173**

## Demo Accounts

### Customers
| Email | Password |
|-------|----------|
| customer1@example.com | password123 |
| customer2@example.com | password123 |

### Shop branches (password: `password123` for all)
| Brand | Branch | Email |
|-------|--------|-------|
| Korzinka | Amir Temur | korzinka.amir@tejam.uz |
| Korzinka | Chilonzor | korzinka.chilonzor@tejam.uz |
| Korzinka | Yunusobod | korzinka.yunusobod@tejam.uz |
| Havas | Mustaqillik | havas.mustaqillik@tejam.uz |
| Havas | Shayxontohur | havas.shayxontohur@tejam.uz |
| Havas | Mirzo Ulug'bek | havas.mirzo@tejam.uz |
| Safia | Chilonzor | safia.chilonzor@tejam.uz |
| Safia | Yakkasaroy | safia.yakkasaroy@tejam.uz |
| Navat | Buyuk Ipak Yo'li | navat.ipak@tejam.uz |
| Navat | Uchtepa | navat.uchtepa@tejam.uz |
| Caravan | Navoiy | caravan.navoiy@tejam.uz |
| Caravan | Sergeli | caravan.sergeli@tejam.uz |

## Environment Variables

`backend/.env`:

```env
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
GEMINI_API_KEY=AIza...          # Required for AI features
DATABASE_URL=sqlite:///tejam.db
```

> **Note:** The app works without a Gemini API key — AI features return sensible fallback responses.

Optional frontend variable (`frontend/.env`):
```env
VITE_GOOGLE_MAPS_API_KEY=...    # For embedded Maps in order detail
```

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register customer or shop |
| POST | `/login` | Login → JWT token |
| GET | `/me` | Current user info |

### Shops (`/api/shops`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List shops (filter by city, category, search) |
| GET | `/my` | Current shop (JWT, shop role) |
| GET | `/:id` | Shop detail with food items |
| PUT | `/:id` | Update shop (JWT, owner) |

### Food Items (`/api/food-items`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List available items |
| GET | `/:id` | Item detail with reviews |
| POST | `/` | Create item (JWT, shop) |
| PUT | `/:id` | Update item (JWT, owner) |
| DELETE | `/:id` | Delete item (JWT, owner) |

### Orders (`/api/orders`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | My orders (customer) or shop orders |
| POST | `/` | Place order (JWT, customer) |
| PUT | `/:id/status` | Update status (JWT, shop) |
| DELETE | `/:id` | Cancel pending order |
| POST | `/:id/review` | Submit review (picked_up only) |
| GET | `/stats` | Dashboard stats (JWT, shop) |
| GET | `/pickup/:token` | Get order by QR token (public) |
| PUT | `/pickup/:token/confirm` | Confirm pickup (JWT, shop) |

### AI (`/api/ai`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/describe` | Generate food description (JWT, shop) |
| POST | `/suggest-price` | Suggest discount price (JWT, shop) |
| POST | `/chat` | General AI assistant (JWT) |

### Uploads (`/uploads`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/image` | Upload food image (JWT, shop) |
| GET | `/:filename` | Serve uploaded image |

## Running Both Servers

Open two terminal tabs:

**Terminal 1 (Backend):**
```bash
cd backend && source venv/bin/activate && python app.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend && npm run dev
```

Then open http://localhost:5173 in your browser.

## Color Theme

- Primary: `#16a34a` (green-600) — sustainability
- Accent: `#ea580c` (orange-600) — energy and appetite
