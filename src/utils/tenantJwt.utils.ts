// src/utils/tenantJwt.utils.ts

// Let's stick with this import style, as it's often more robust for 'jsonwebtoken'
import jwt from 'jsonwebtoken';
// ✨ Make sure SignOptions is imported, as we will use it explicitly! ✨
import { SignOptions } from 'jsonwebtoken';

import { IUser } from '../model/application/user.model'; // Your tenant user model

// Secret key for Tenant User JWTs (can be different from platform's JWT_SECRET)
const TENANT_JWT_SECRET = process.env.TENANT_JWT_SECRET || 'your_super_secret_tenant_jwt_key'; // ⚠️ New secret! Change this in production!
const TENANT_JWT_EXPIRATION = process.env.TENANT_JWT_EXPIRATION || '1h'; // Expiration for tenant tokens

// Interface for the payload of a Tenant User JWT
interface TenantTokenPayload {
    id: string; // The tenant user's _id
    email: string;
    role: IUser['role']; // Role within the tenant (owner, admin, manager, employee)
    tenantDbName: string; // ✨ CRITICAL: This links the user to their specific shop's database! ✨
    isTenantUser: boolean; // Flag to differentiate from platform users
}

/**
 * Generates a JWT for a tenant-specific user.
 * This token includes the tenant's database name in its payload.
 * @param user The tenant user object.
 * @param tenantDbName The database name of the tenant the user belongs to.
 * @returns A signed JWT string.
 */
export const generateTenantToken = (user: IUser, tenantDbName: string): string => {
    const payload: TenantTokenPayload = {
        // Let's simplify this back. Mongoose ObjectId's have .toString() method.
        // If `user._id` can be other complex types, you might need the `String()` cast,
        // but typically `user._id.toString()` is sufficient for Mongoose IDs.
        id: (user._id as { toString(): string }).toString(),
        email: user.email,
        role: user.role,
        tenantDbName: tenantDbName,
        isTenantUser: true,
    };

    // ✨ THIS IS THE KEY CHANGE! Explicitly define the options object with its type ✨
    const options: SignOptions = {
        expiresIn: TENANT_JWT_EXPIRATION as jwt.SignOptions['expiresIn'], // Cast to the correct type
    };

    // Now, pass the explicitly typed options object to jwt.sign
    return jwt.sign(payload, TENANT_JWT_SECRET, options);
};

/**
 * Verifies a tenant-specific JWT.
 * @param token The JWT string to verify.
 * @returns The decoded payload if valid, otherwise throws an error.
 */
export const verifyTenantToken = (token: string): TenantTokenPayload => {
    // This will throw an error if the token is invalid or expired
    return jwt.verify(token, TENANT_JWT_SECRET) as TenantTokenPayload;
};

// You might export other tenant-specific JWT utilities here if needed in the future