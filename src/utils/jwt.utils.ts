// src/utils/jwt.utils.ts

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { SignOptions } from 'jsonwebtoken'; // We import SignOptions

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("CRITICAL ERROR: JWT_SECRET is not defined in .env file! JWT functions will not work. 💔");
    process.exit(1);
}

/**
 * Signs (generates) a JSON Web Token.
 * @param payload The data to encode into the JWT (e.g., user ID, email, role).
 * @param expiresIn How long the token should be valid (e.g., '1h', '7d', or a number in seconds).
 * @returns The signed JWT string.
 */
export function signJwt(payload: object, expiresIn: string | number): string {
    const options: SignOptions = {
        // ✨ Here's the magic! We cast expiresIn to the exact type SignOptions expects! ✨
        expiresIn: expiresIn as SignOptions['expiresIn']
    };
    return jwt.sign(payload, JWT_SECRET!, options);
}

/**
 * Verifies a JSON Web Token.
 * Checks if the token is valid, hasn't expired, and was signed with our secret.
 * @param token The JWT string to verify.
 * @returns The decoded payload if the token is valid, otherwise null.
 */
export function verifyJwt<T>(token: string): T | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET!) as T;
        return decoded;
    } catch (error) {
        console.error("{JWTUtils -> verifyJwt} Token verification failed: 🥺", error);
        return null;
    }
}