import express from 'express';
import serverConfig from './config/server'; // Your server configuration
import connectDB  from './config/db';     // Your database connection function
import productRoutes from './routes/product.routes'; // Your lovely product routes
import categoryRoutes from './routes/category.routes'; // Your fabulous category routes

const app = express(); // Initialize your Express application

// --- Middleware ---
// This middleware is essential, darling! It allows Express to understand JSON bodies sent in POST/PUT requests.
app.use(express.json());

// --- Database Connection ---
// Connect to MongoDB when the server starts
connectDB();

// --- API Routes ---
// Use your beautiful routes!
// We're prefixing them with '/api' for a clean API endpoint structure.
app.use('/api', productRoutes);
app.use('/api', categoryRoutes);

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