// src/middleware/tenantAuth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { verifyTenantToken } from '../utils/tenantJwt.utils'; // Our specific tenant JWT utility
import UserService from '../services/application/user.service'; // Our tenant-specific user service

// We'll rely on res.locals.tenantDbName being set by a preceding middleware (like resolveTenant)

export const authenticateTenantUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const tenantDbNameFromLocals = res.locals.tenantDbName; // Get tenant DB name from resolveTenant middleware

        // 1. Ensure tenant context is available from preceding middleware
        if (!tenantDbNameFromLocals) {
            console.error("{authenticateTenantUser} Missing tenantDbName in res.locals. Ensure resolveTenant middleware runs before this.");
            return res.status(500).json({ message: 'Sweetie, something went wrong with the shop context. Please try again! 🥺' });
        }

        // 2. Check for Authorization header
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn("{authenticateTenantUser} Missing or malformed Authorization header.");
            return res.status(401).json({ message: 'Oh dear, no authentication token found! Please log in. 😔' });
        }

        // 3. Extract the token
        const token = authHeader.split(' ')[1];

        // 4. Verify the token using our tenant-specific utility
        let decodedPayload: any; // Use 'any' temporarily if precise type conversion is an issue, otherwise TenantTokenPayload
        try {
            decodedPayload = verifyTenantToken(token);
        } catch (jwtError: any) {
            console.warn(`{authenticateTenantUser} Invalid tenant token: ${jwtError.message}`);
            return res.status(401).json({ message: 'Oh dear, your authentication token is invalid or expired! Please log in again. 💔' });
        }

        // 5. CRUCIAL: Verify tenant context from token matches current request context
        if (decodedPayload.tenantDbName !== tenantDbNameFromLocals) {
            console.warn(`{authenticateTenantUser} Tenant mismatch! Token tenant: ${decodedPayload.tenantDbName}, Request tenant: ${tenantDbNameFromLocals}`);
            return res.status(403).json({ message: 'Forbidden: You do not have permission to access this shop. 🚫' });
        }

        // 6. Fetch the actual tenant user from their specific database
        const tenantUser = await UserService.findById(decodedPayload.tenantDbName, decodedPayload.id);

        if (!tenantUser || !tenantUser.isActive) {
            console.warn(`{authenticateTenantUser} Authenticated tenant user ID ${decodedPayload.id} not found or inactive in tenant DB ${decodedPayload.tenantDbName}.`);
            return res.status(401).json({ message: 'User not found or account is inactive. Please log in again. 😔' });
        }

        // 7. Attach tenant user and tenantDbName to the request object for downstream use
        req.tenantUser = {
            id: (tenantUser._id as string | { toString(): string })?.toString?.() ?? '',
            email: tenantUser.email,
            name: tenantUser.name,
            role: tenantUser.role,
            isActive: tenantUser.isActive,
        };
        req.tenantDbName = tenantDbNameFromLocals; // Or you could use decodedPayload.tenantDbName; just be consistent!

        console.log(`{authenticateTenantUser} Tenant user '${tenantUser.email}' authenticated successfully for tenant DB: ${tenantDbNameFromLocals}.`);
        next(); // Proceed to the next middleware or route handler

    } catch (error: any) {
        console.error("{authenticateTenantUser} Unexpected error during authentication:", error);
        res.status(500).json({ message: 'Something went wrong during authentication. Please try again later. 😥', error: error.message });
    }
};