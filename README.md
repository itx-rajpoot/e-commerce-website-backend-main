# E-commerce Backend

This is a Node.js backend for an e-commerce platform, built with Express and MongoDB. It provides RESTful APIs for authentication, product management, categories, cart, orders, chat, and sliders. The backend supports user and admin roles, file uploads, scheduled tasks, and more.

## Features
- User authentication (JWT-based)
- Admin and buyer roles
- Product CRUD with image upload
- Category CRUD
- Cart management
- Order management and status tracking
- Scheduled cleanup of old cancelled orders
- Chat and contact form messaging
- Slider management for homepage banners
- Secure API endpoints with role-based access

## Technologies Used
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT for authentication
- Multer for file uploads
- bcryptjs for password hashing
- node-cron for scheduled tasks
- dotenv for environment variables

## Getting Started

### Prerequisites
- Node.js >= 16
- MongoDB instance (local or cloud)

### Installation
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the backend directory with the following variables:
   ```env
   MONGODB_URI=mongodb://localhost:27017/shopdb
   JWT_SECRET=your-secret-key
   PORT=5000
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` — Login with username and password
- `POST /api/auth/signup` — Register a new user
- `GET /api/auth/me` — Get current user info (requires token)
- `POST /api/auth/logout` — Logout (client-side only)

### Users (Admin only)
- `GET /api/users` — List all users
- `DELETE /api/users/:id` — Delete a user

### Products
- `GET /api/products` — List products (filter by category, featured, search)
- `GET /api/products/featured` — List featured products
- `GET /api/products/:id` — Get product details
- `POST /api/products` — Create product (admin, image upload)
- `PUT /api/products/:id` — Update product (admin, image upload)
- `DELETE /api/products/:id` — Delete product (admin)
- `GET /api/products/categories/all` — List all categories
- `POST /api/products/categories` — Create category (admin)

### Categories
- `GET /api/categories` — List categories
- `GET /api/categories/:id` — Get category details
- `POST /api/categories` — Create category (admin)
- `PUT /api/categories/:id` — Update category (admin)
- `DELETE /api/categories/:id` — Delete category (admin)

### Cart
- `GET /api/cart` — Get user's cart
- `POST /api/cart/items` — Add item to cart
- `PUT /api/cart/items/:productId` — Update cart item quantity
- `DELETE /api/cart/items/:productId` — Remove item from cart
- `DELETE /api/cart/clear` — Clear cart
- `GET /api/cart/count` — Get cart item count

### Orders
- `POST /api/orders` — Create order
- `GET /api/orders/my-orders` — Get user's orders
- `GET /api/orders` — List all orders (admin)
- `GET /api/orders/:id` — Get order details
- `PATCH /api/orders/:id/status` — Update order status (admin)
- `PATCH /api/orders/:id/cancel` — Cancel order (user)
- `PATCH /api/orders/:id/admin-cancel` — Cancel order (admin)
- `GET /api/orders/stats/overview` — Get order statistics (admin)
- `DELETE /api/orders/cleanup` — Delete old cancelled orders (admin)

### Sliders
- `GET /api/sliders` — List sliders
- `GET /api/sliders/active` — List active sliders
- `POST /api/sliders` — Create slider (admin, image upload)
- `PUT /api/sliders/:id` — Update slider (admin, image upload)
- `DELETE /api/sliders/:id` — Delete slider (admin)
- `PATCH /api/sliders/:id/order` — Update slider order (admin)

### Chat & Contact
- `GET /api/chat/conversations` — List conversations (admin)
- `GET /api/chat/conversation/:conversationId` — Get messages in a conversation
- `POST /api/chat/message` — Send message (auth required)
- `POST /api/chat/guest-message` — Send guest/contact form message
- `GET /api/chat/guest-conversation/:email` — Get guest messages
- `DELETE /api/chat/conversation/:conversationId` — Delete conversation (admin)

## File Uploads
- Product images: `/uploads/products/`
- Slider images: `/uploads/sliders/`

## Scheduled Tasks
- Daily cleanup of cancelled orders older than 7 days (runs at 2 AM)

## License
This project is for educational and demonstration purposes.
