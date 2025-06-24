// server.ts

import express from 'express';
import serverConfig from './config/server'; // Your server configuration
import { connectDB } from './config/db';  // Your database connection function
import productRoutes from './routes/application/product.routes'; // Your lovely product routes
import categoryRoutes from './routes/application/category.routes'; // Your fabulous category routes
import platformAuthRoutes from './routes/platform/auth.platform.routes'; // Our platform auth routes
import tenantRoutes from './routes/platform/tenant.routes'; // Your glamorous platform tenant routes
import customerAuthRoute from './routes/application/customer/auth.routes'
import tenantAuthRoutes from './routes/application/auth.routes';
import cartRoutes from './routes/application/cart.routes';
import orderRoutes from './routes/application/order.routes'; // ✨ NEW: Import your order routes! ✨


import cors from 'cors';
import { tenantResolver } from './middleware/tenant-resolver.middleware'; // Your tenant resolver middleware

const app = express(); // Initialize your Express application

// --- Middleware ---
app.use(express.json()); // Essential for handling JSON bodies
app.use(cors({
  origin: 'http://192.168.1.72:5173', // your frontend's address
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// --- Database Connection ---
connectDB(); // Connect to MongoDB when the server starts

// --- API Routes ---

// 1. Platform-level routes:
// These are for managing tenants, platform user authentication, etc.
app.use('/api/platform/tenants', tenantRoutes);
app.use('/api/platform/auth', platformAuthRoutes);

// 2. ✨ Tenant-specific API Routes (These need the X-Tenant-ID header!) ✨
// We're creating a common base path for all tenant-specific operations.
// The `tenantResolver` middleware will run ONCE for any request starting with '/api/tenant'.
// @ts-ignore
app.use('/api/tenant', tenantResolver);

// Now, mount your application-level (tenant-specific) routes under this common base path.
// They will automatically have `res.locals.tenantDbName` (and `req.tenantDbName`) set!
app.use('/api/tenant/products', productRoutes); // Access via /api/tenant/products
app.use('/api/tenant/categories', categoryRoutes); // Access via /api/tenant/categories
app.use('/api/tenant/auth', tenantAuthRoutes);   // Access via /api/tenant/auth/login

// customer based routes
// @ts-ignore
app.use('/api/customer/auth', tenantResolver, customerAuthRoute)
// @ts-ignore
app.use('/api/customer/cart', tenantResolver, cartRoutes);

// @ts-ignore
app.use('/api/customer/orders', tenantResolver, orderRoutes); // ✨ NEW: Mount your order routes! ✨


// --- Basic Root Route ---
app.get('/', (req, res) => {
    res.send('Hello, darling! Our server is running beautifully! ✨');
});

// --- Start the Server ---
app.listen(serverConfig.port, () => {
    console.log(`Server is happily listening on port ${serverConfig.port} in ${serverConfig.nodeEnv} mode! 💖`);
});