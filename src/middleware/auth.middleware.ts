// src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt.utils';

// We don't need the AuthenticatedRequest interface here anymore
// because we've globally augmented it in src/types/express.d.ts!

// ✨ New: A utility function to gracefully handle async middleware errors! ✨
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next); // Catch any errors and pass them to Express's error handler
    };

/**
 * @description Authentication middleware to verify JWTs and attach user info to the request.
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express NextFunction to pass control to the next middleware/route handler
 */
export const authenticate = asyncHandler(async ( // ✨ Wrap our async middleware with asyncHandler! ✨
    req: Request, // Now just Request, as it's globally extended!
    res: Response,
    next: NextFunction
) => {
    // 1. Check for the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn("{AuthMiddleware} No Authorization header or malformed token. 🕵️‍♀️");
        return res.status(401).json({ message: 'Authorization token not found or malformed, my dear! Please provide a valid Bearer token.' });
    }

    // 2. Extract the token (remove "Bearer ")
    const token = authHeader.split(' ')[1];

    if (!token) {
        console.warn("{AuthMiddleware} Token is missing after Bearer split. 😥");
        return res.status(401).json({ message: 'Authorization token is missing, my dear! Please provide one.' });
    }

    // 3. Verify the token using our utility
    const decoded = verifyJwt(token);

    if (
        !decoded ||
        typeof decoded !== 'object' ||
        !('id' in decoded) ||
        !('email' in decoded) ||
        !('role' in decoded) ||
        !('isPlatformUser' in decoded) ||
        typeof (decoded as any).id !== 'string' ||
        typeof (decoded as any).email !== 'string' ||
        typeof (decoded as any).role !== 'string' ||
        typeof (decoded as any).isPlatformUser !== 'boolean'
    ) {
        console.warn("{AuthMiddleware} Invalid or expired token, or missing required user fields. 💔");
        return res.status(403).json({ message: 'Oh dear, your token is invalid, has expired, or is missing required user information! Please log in again.' });
    }

    // 4. Attach the decoded user payload to the request object
    // We can now safely attach to req.user because of the global type augmentation!
    req.user = decoded as { id: string; email: string; role: string; isPlatformUser: boolean }; // TypeScript knows 'req.user' exists!

    console.log(`{AuthMiddleware} User authenticated: ${req.user?.email} (${req.user?.role}) ✅`);
    next(); // ✨ Pass control to the next middleware or route handler! ✨
});