import { Request, Response, NextFunction } from 'express';
import tenantService from '../services/platform/tenant.service'; // Import your TenantService

// Extend the Express Request type to include our custom property
declare global {
    namespace Express {
        interface Request {
            tenantDbName?: string; // We'll add this to the request object for convenience
        }
    }
}

/**
 * Middleware to resolve the tenant's database name from X-Tenant-ID header
 * and verify the tenant's existence.
 * If successful, it attaches tenantDbName to req.tenantDbName and calls next().
 * Otherwise, it sends an appropriate error response.
 */
export const tenantResolver = async (req: Request, res: Response, next: NextFunction) => {
    // 💖 Getting the tenant ID from the header! 💖
    const rawTenantId = req.headers['x-tenant-id'];

    if (!rawTenantId || typeof rawTenantId !== 'string') {
        return res.status(400).json({ message: 'Sweetie, the X-Tenant-ID header is missing or invalid! I need it to know which shop we\'re talking about. 🥺' });
    }

    // Remember our clever little prefix: "db_" + tenantId
    const tenantDbName = `db_${rawTenantId}`; 

    // A quick preliminary check if the tenant ID somehow becomes 'undefined' string or null
    // This catches cases where rawTenantId might literally be 'undefined' as a string or a very odd value.
    if (tenantDbName === 'db_undefined' || tenantDbName === null) {
        return res.status(400).json({ message: 'Tenant database name could not be determined from the header. Please check your X-Tenant-ID. 😞' });
    }

    try {
        // ✨ Verify tenant existence using your TenantService! ✨
        // We remove 'db_' prefix because tenantService.tenantExistsByDatabaseName expects the raw slug/name
        const tenantExists = await tenantService.tenantExistsByDatabaseName("db_" + rawTenantId); 
        console.log(`Tenant existence check for '${rawTenantId}': ${tenantExists ? 'Found! 🎉' : 'Not found. 😔'}`);

        if (!tenantExists) {
            return res.status(404).json({ message: 'Tenant not found. Please check your tenant ID. 🥺' });
        }

        // If everything is perfect, attach the resolved tenantDbName to the request object!
        // This is usually preferred over `res.locals` for data that middleware adds for subsequent handlers.
        res.locals.tenantDbName = tenantDbName; 
        console.log(`Using tenant database: ${res.locals.tenantDbName}`);
        next(); // Proceed to the next lovely middleware or route handler!
    } catch (error: any) {
        console.error(`{TenantResolver Middleware} Error checking tenant existence for '${rawTenantId}':`, error);
        return res.status(500).json({ message: 'There was a problem verifying the tenant. Please try again later. 😥', error: error.message });
    }
};

