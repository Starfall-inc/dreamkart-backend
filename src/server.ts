// server.ts

import express from 'express';
import serverConfig from './config/server'; // Your server configuration
import { connectDB } from './config/db';  // Your database connection function
import productRoutes from './routes/application/product.routes'; // Your lovely product routes
import categoryRoutes from './routes/application/category.routes'; // Your fabulous category routes
import platformAuthRoutes from './routes/platform/auth.platform.routes'; // Our platform auth routes
import tenantRoutes from './routes/platform/tenant.routes'; // Your glamorous platform tenant routes

// ✨ NEW: Import your tenant-specific authentication routes! ✨
import tenantAuthRoutes from './routes/application/auth.routes';

import cors from 'cors';
import { tenantResolver } from './middleware/tenant-resolver.middleware'; // Your tenant resolver middleware

const app = express(); // Initialize your Express application

// --- Middleware ---
app.use(express.json()); // Essential for handling JSON bodies
app.use(cors({
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
    credentials: true, // Allow credentials to be sent with requests
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

// --- Basic Root Route ---
app.get('/', (req, res) => {
    res.send('Hello, darling! Our server is running beautifully! ✨');
});

// --- Start the Server ---
app.listen(serverConfig.port, () => {
    console.log(`Server is happily listening on port ${serverConfig.port} in ${serverConfig.nodeEnv} mode! 💖`);
});