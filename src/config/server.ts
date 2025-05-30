// config/server.ts

import dotenv from 'dotenv'; // First, we bring in our lovely dotenv library!

dotenv.config();

interface ServerConfig {
    port: number;
    mongoUri: string;
    jwtSecret: string; // If you have authentication secrets!
    nodeEnv: string;
}

// ✨ Create our configuration object ✨
const serverConfig: ServerConfig = {
    // Port for our server to listen on!
    // We try to get it from process.env.PORT, otherwise, we default to 5000.
    port: parseInt(process.env.PORT || '5000', 10), // parseInt ensures it's a number!

    // Our MongoDB connection string!
    // It's super important to have a fallback for development.
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase',

    // A secret key for JSON Web Tokens (JWT) if you're doing authentication!
    // NEVER hardcode this in production! Always use environment variables.
    jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey_please_change_me',

    // Helps us know if we're in development, production, etc.
    nodeEnv: process.env.NODE_ENV || 'development',
};

// 📦 Export our configuration so other parts of our application can use it! 📦
export default serverConfig;