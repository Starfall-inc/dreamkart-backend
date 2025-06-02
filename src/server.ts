import express from 'express';
import serverConfig from './config/server'; // Your server configuration
import { connectDB } from './config/db';  // Your database connection function
import productRoutes from './routes/application/product.routes'; // Your lovely product routes
import categoryRoutes from './routes/application/category.routes'; // Your fabulous category routes

import tenantRoutes from './routes/platform/tenant.routes'; // Your glamorous tenant routes

import cors from 'cors';
import { tenantResolver } from './middleware/tenant-resolver.middleware';

const app = express(); // Initialize your Express application

// --- Middleware ---
// This middleware is essential, darling! It allows Express to understand JSON bodies sent in POST/PUT requests.
app.use(express.json());
app.use(cors({
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed HTTP methods
    credentials: true, // Allow credentials to be sent with requests
}))

// --- Database Connection ---
// Connect to MongoDB when the server starts
connectDB();

// --- API Routes ---
// Use your beautiful routes!
// We're prefixing them with '/api' for a application API endpoint structure.
// @ts-ignore
app.use('/api/product', tenantResolver, productRoutes);
// @ts-ignore
app.use('/api/category', tenantResolver, categoryRoutes);


// We're prefixing this one for platform-related routes, which might include tenant management or other platform features.
app.use('/api/platform/tenants', tenantRoutes); // New base path for tenant operations


// --- Basic Root Route ---
// A friendly greeting for anyone visiting the base URL!
app.get('/', (req, res) => {
    res.send('Hello, darling! Our server is running beautifully! ✨');
});

// --- Start the Server ---
// Make the app listen for incoming requests on the configured port
app.listen(serverConfig.port, () => {
    console.log(`Server is happily listening on port ${serverConfig.port} in ${serverConfig.nodeEnv} mode! 💖`);
});