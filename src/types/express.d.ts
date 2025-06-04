// src/types/express.d.ts

// This is a declaration file, it extends the 'express' module's Request interface
declare namespace Express {
    export interface Request {
        // ✨ Our user property, now globally available on Request objects! ✨
        user?: {
            id: string;
            email: string;
            role: string;
            isPlatformUser: boolean;
            // Add any other properties you included in your JWT payload
        };
        // ✨ NEW: For Authenticated Tenant Users! ✨
        tenantUser?: {
            id: string;
            email: string;
            name: string;
            role: 'owner' | 'admin' | 'manager' | 'employee';
            isActive: boolean;
        };
        tenantDbName?: string; // We'll set this here, or rely on res.locals
    }
}