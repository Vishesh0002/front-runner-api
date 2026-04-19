# Protein API (NestJS Backend)

Full-featured e-commerce backend for Front Runner Health Care.

## Stack

- **Framework**: NestJS 10
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (Access + Refresh tokens in httpOnly cookies)
- **Payments**: Razorpay (India-focused)
- **API Docs**: Swagger/OpenAPI
- **Validation**: class-validator + class-transformer

## Project Structure

```
src/
├── auth/           # JWT authentication, login, register, refresh
├── users/          # User profiles, addresses
├── products/       # Product catalog (CRUD)
├── orders/         # Order management
├── payments/       # Razorpay integration
├── prisma/         # Prisma service (DB connection)
└── main.ts         # App entry point
```

## Setup Instructions

### 1. Install dependencies

```bash
cd protein-api
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required env vars:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Random string for signing JWTs
- `JWT_REFRESH_SECRET` — Random string for refresh tokens
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` — From Razorpay Dashboard

### 3. Setup database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# Seed products (optional)
npm run db:seed
```

### 4. Start development server

```bash
npm run start:dev
```

API available at: http://localhost:3001  
Swagger docs: http://localhost:3001/api/docs

## Key API Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/auth/register` | POST | Create account | No |
| `/auth/login` | POST | Login, get tokens | No |
| `/auth/refresh` | POST | Refresh access token | Cookie |
| `/auth/me` | GET | Current user | Bearer |
| `/products` | GET | List products | No |
| `/products/:slug` | GET | Product details | No |
| `/orders` | POST | Create order | Bearer |
| `/orders` | GET | My orders | Bearer |
| `/payments/verify` | POST | Verify Razorpay payment | Bearer |
| `/payments/webhook` | POST | Razorpay webhook | No (signature) |

## Payment Flow

1. **Create Order** — Frontend calls `POST /orders` with cart items + address
2. **Get Razorpay Order ID** — Backend creates Razorpay order, returns `order_id`
3. **Open Checkout** — Frontend opens Razorpay modal with `order_id`
4. **Payment Success** — Razorpay returns `payment_id + signature`
5. **Verify** — Frontend calls `POST /payments/verify` with signature
6. **Confirmation** — Backend verifies HMAC, marks order PAID, sends email

## Deployment

### Railway (Recommended)

1. Create project on Railway
2. Add PostgreSQL plugin
3. Add environment variables
4. Deploy from GitHub repo

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app
DATABASE_URL=postgresql://...
JWT_SECRET=long-random-string
JWT_REFRESH_SECRET=different-long-random-string
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=live_secret
RAZORPAY_WEBHOOK_SECRET=webhook_secret
```
