# eCommerce Backend API

Modern, secure backend API for the GhanaMarket eCommerce platform.

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Zod
- **Security**: Helmet, CORS

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Add `.env` and update the values:

Update `DATABASE_URL` with your PostgreSQL connection string.

### 3. Run Database Migrations
```bash
npx prisma migrate dev --name init
```

### 4. Seed Database (Optional)
```bash
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Authentication
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | No | Create account |
| `/api/auth/login` | POST | No | Login |
| `/api/auth/me` | GET | Yes | Get profile |

### Products
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/products` | GET | No | List products |
| `/api/products/:id` | GET | No | Get product |
| `/api/products` | POST | Admin | Create product |
| `/api/products/:id` | PUT | Admin | Update product |
| `/api/products/:id` | DELETE | Admin | Delete product |

### Cart
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/cart` | GET | Yes | Get cart |
| `/api/cart/items` | POST | Yes | Add item |
| `/api/cart/items/:id` | PUT | Yes | Update quantity |
| `/api/cart/items/:id` | DELETE | Yes | Remove item |
| `/api/cart` | DELETE | Yes | Clear cart |

### Orders
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/orders` | POST | Yes | Create order |
| `/api/orders` | GET | Yes | List orders |
| `/api/orders/:id` | GET | Yes | Get order |

### Categories
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/categories` | GET | No | List categories |
| `/api/categories/:id` | GET | No | Get category |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database
