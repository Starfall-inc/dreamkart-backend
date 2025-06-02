// src/db.ts (Revised for Multi-Tenancy, Connection Pooling, and Internal DB)

import mongoose, { Connection } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Get the base MongoDB URI from environment variables
const BASE_MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/'; // Make sure it ends with a '/'!

// A Map to store active connections for each tenant
// This is crucial for connection pooling and reusing connections!
const tenantConnections: Map<string, Connection> = new Map();

// A variable to store the single, global connection for the internal database (dreamkart)
let internalDbConnection: Connection | null = null;

/**
 * Connects to the application's internal database, "dreamkart".
 * This is for shared application data, not tenant-specific data.
 * @returns A Promise that resolves to the Mongoose Connection object for the internal database.
 */
const connectDB = async (): Promise<Connection> => {
  if (internalDbConnection && internalDbConnection.readyState === 1) {
    console.log('Using existing connection to internal database (dreamkart). So efficient! 😊');
    return internalDbConnection;
  }

  try {
    const internalDbURI = `${BASE_MONGO_URI}dreamkart`; // Our special internal database! 💖
    console.log(`Attempting to connect to internal database: ${internalDbURI}...`);

    // Use mongoose.connect for the primary internal database
    // It also uses connection pooling by default!
    await mongoose.connect(internalDbURI, {});

    internalDbConnection = mongoose.connection; // Get the default connection object

    internalDbConnection.on('connected', () => {
      console.log('Mongoose connected to internal database (dreamkart)! 🎉');
    });
    internalDbConnection.on('error', (err) => {
      console.error('Mongoose internal database (dreamkart) connection error: 😭', err);
    });
    internalDbConnection.on('disconnected', () => {
      console.warn('Mongoose internal database (dreamkart) disconnected! 🥺');
      internalDbConnection = null; // Clear reference if disconnected
    });

    console.log('Successfully established connection to internal database (dreamkart)! ✨');
    return internalDbConnection;
  } catch (error: any) {
    console.error('Oh no, failed to connect to internal database (dreamkart)! 💔', error.message);
    process.exit(1); // Exiting with a little sadness, but we'll try again! 🥺
  }
};


/**
 * Retrieves or creates a Mongoose connection for a specific tenant.
 * This function also handles connection pooling for each tenant's database.
 * @param tenantId The unique identifier for the tenant.
 * @returns A Promise that resolves to the Mongoose Connection object for the tenant.
 */
const getTenantDB = async (tenantId: string): Promise<Connection> => {
  // If a connection for this tenant already exists, return it immediately!
  // This is where the magic of connection pooling for multi-tenancy happens! ✨
  if (tenantConnections.has(tenantId)) {
    const existingConnection = tenantConnections.get(tenantId)!;
    // You might want to add a check here if the connection is still healthy,
    // though Mongoose handles much of this internally.
    console.log(`Using existing MongoDB connection for tenant: ${tenantId}. So efficient! 😊`);
    return existingConnection;
  }

  try {
    // Construct the full database URI for the specific tenant.
    // Example: mongodb://localhost:27017/your_app_db_alpha
    // You can customize your database naming convention here!
    const tenantDatabaseName = `your_app_db_${tenantId}`; // 👈 Lovely dynamic naming!
    const fullMongoURI = `${BASE_MONGO_URI}${tenantDatabaseName}`;

    console.log(`Attempting to connect to: ${fullMongoURI} for tenant: ${tenantId}...`);

    // Create a new connection for this tenant's database.
    // Mongoose handles connection pooling for *this specific connection* automatically.
    const newTenantConnection: Connection = await mongoose.createConnection(fullMongoURI, {
      minPoolSize: 5, // Keep at least 5 connections open in the pool. It's like having a minimum number of happy workers! 👷‍♀️
      maxPoolSize: 20, // Allow up to 20 connections in the pool. More workers for busy times! 👷‍♂️
      // Other options you might consider (adjust as per your needs):
      // useNewUrlParser: true, // This is generally true by default in recent Mongoose versions.
      // useUnifiedTopology: true, // This is also generally true by default.
      // serverSelectionTimeoutMS: 5000, // How long to wait for a server to connect (5 seconds)
      // socketTimeoutMS: 45000, // How long a socket can remain idle before closing (45 seconds)
    });

    // Add event listeners for logging and managing the connection map
    newTenantConnection.on('connected', () => {
      console.log(`Mongoose connection open for tenant: ${tenantId}! 🎉`);
    });
    newTenantConnection.on('error', (err) => {
      console.error(`Mongoose connection error for tenant ${tenantId}: 😭`, err);
      // Depending on your error handling, you might want to remove this connection from the map
      // or try to reconnect. For now, we just log.
    });
    newTenantConnection.on('disconnected', () => {
      console.warn(`Mongoose connection disconnected for tenant: ${tenantId}. 🥺 Removing from pool...`);
      // Important: Remove the connection from the map when it disconnects!
      tenantConnections.delete(tenantId);
    });

    // Store the new connection in our map for future reuse!
    tenantConnections.set(tenantId, newTenantConnection);

    console.log(`Successfully established new MongoDB connection for tenant: ${tenantId}! 💖`);
    return newTenantConnection;

  } catch (error: any) {
    console.error(`Oh no, failed to connect to MongoDB for tenant ${tenantId}! 💔`, error.message);
    // You might want to throw the error to be handled by the calling function (e.g., in your Express middleware)
    throw new Error(`Could not establish database connection for tenant ${tenantId}: ${error.message}`);
  }
};

/**
 * Closes all active Mongoose connections gracefully.
 * Call this when your application is shutting down.
 */
const closeAllDBConnections = async () => {
  console.log('Closing all MongoDB connections... Goodbye, data! 👋');

  // Close the internal database connection first
  if (internalDbConnection) {
    try {
      await internalDbConnection.close();
      console.log('Internal database (dreamkart) connection closed.');
    } catch (error) {
      console.error('Error closing internal database (dreamkart) connection: 😭', error);
    }
  }

  // Then close all tenant-specific connections
  for (const [tenantId, connection] of tenantConnections.entries()) {
    try {
      await connection.close();
      console.log(`Connection for tenant ${tenantId} closed.`);
    } catch (error) {
      console.error(`Error closing connection for tenant ${tenantId}: 😭`, error);
    }
  }
  tenantConnections.clear(); // Clear the map once all are closed
  console.log('All MongoDB connections closed. Sleep well! 😴');
};

// Export all the lovely functions!
export { connectDB, getTenantDB, closeAllDBConnections };