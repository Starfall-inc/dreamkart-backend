// src/connections/tenantDb.ts

import mongoose from 'mongoose';

/**
 * Retrieves a Mongoose Db instance for a specific tenant's database.
 * This function encapsulates the logic for switching databases on the main connection.
 *
 * @param tenantDbName The name of the tenant's database (e.g., 'db_keqings-cutest-shop_...').
 * @returns A Mongoose Db instance connected to the specified tenant's database.
 */
export function getTenantDb(tenantDbName: string): mongoose.Connection {
    // We use the already established main Mongoose connection to switch to the tenant's DB.
    // The `useCache: true` option ensures Mongoose efficiently reuses the Db instance
    // if we request the same tenant DB multiple times.
    console.log(`{getTenantDb} Attempting to get DB instance for: ${tenantDbName}`);
    try {
        const tenantDb = mongoose.connection.useDb(tenantDbName, { useCache: true });
        // You could add more logging or specific connection pooling logic here in the future!
        console.log(`{getTenantDb} Successfully got DB instance for: ${tenantDbName}`);
        return tenantDb;
    } catch (error) {
        console.error(`{getTenantDb} Error getting DB instance for ${tenantDbName}:`, error);
        throw new Error(`Failed to connect to tenant database: ${tenantDbName}`);
    }
}