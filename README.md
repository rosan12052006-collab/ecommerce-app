# E-Commerce Web Application (MERN-style, no React build needed)

A basic online store: product catalog, cart, checkout, JWT auth with role-based
access (Admin/User), and REST APIs backed by MongoDB.

## Stack
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcrypt
- **Frontend:** Plain HTML/CSS/JavaScript (no build tools — just open in browser)

## Project Structure
```
ecommerce-app/
  backend/
    config/db.js          MongoDB connection
    models/                User, Product, Order schemas
    middleware/auth.js     JWT verification + admin-only guard
    routes/
      authRoutes.js        register, login, profile
      productRoutes.js     CRUD for products (admin write, public read)
      orderRoutes.js       checkout, my orders, admin order management
    server.js               Express app entry point
    .env.example
    package.json
  frontend/
    index.html
    style.css
    app.js                 All UI logic + fetch() calls to backend API
```

## How to Run

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env        # then edit MONGO_URI / JWT_SECRET if needed
npm run dev                 # or: npm start
```
Requires a running MongoDB instance (local install, or a free MongoDB Atlas
cluster — just paste its connection string into MONGO_URI).

Server runs at `http://localhost:5000`.

### 2. Frontend
No build step needed. Just open `frontend/index.html` in a browser
(or serve it, e.g. `npx serve frontend`). It talks to the API at
`http://localhost:5000/api` (see API_BASE in app.js — change it if you deploy
the backend elsewhere).

## Core Features Implemented
- **Product catalog** — browse/search products (public)
- **Cart** — add/remove/update quantities, persisted in localStorage
- **Checkout** — creates an Order, validates stock server-side, decrements stock
- **Auth** — register/login with bcrypt-hashed passwords + JWT tokens
- **Role-based access** — `user` vs `admin`; only admins can create/edit/delete
  products and view/update all orders; users can only see their own orders
- **REST APIs**:
  - `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`
  - `GET/POST/PUT/DELETE /api/products` (write ops admin-only)
  - `POST /api/orders` (checkout), `GET /api/orders/my`, `GET /api/orders` (admin),
    `PUT /api/orders/:id/status` (admin)

## Things You Could Extend (good for showing initiative in your internship)
- Pagination/sorting on the product list
- Product image uploads (e.g. via multer + cloud storage) instead of URLs
- Payment gateway integration (Stripe/Razorpay test mode)
- Order email confirmations
- Unit/integration tests (Jest + supertest)
- Move frontend to React for component reuse and better state management
- Dockerize backend + MongoDB with docker-compose for easy setup

## Notes on Security
- Passwords are hashed with bcrypt before storage, never stored in plaintext
- JWT secret and DB URI are kept out of source control via `.env`
  (`.env.example` documents required vars — your real `.env` should never be
  committed to git)
- Order totals/prices are recalculated server-side from the DB, not trusted
  from the client, to prevent price tampering
