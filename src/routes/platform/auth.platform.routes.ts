// src/routes/auth.platform.routes.ts

import { Router, Request, Response } from 'express';
import PlatformUserService from '../../services/platform/platformUser.service'; // Import our service for platform user operations
import { signJwt } from '../../utils/jwt.utils'; // Our lovely JWT utility!
import { IPlatformUserResponse } from '../../model/platform/user.model'; // For our response type

const router = Router();

/**
 * @route POST /api/platform/register
 * @description Registers a new platform user (e.g., a tenant owner).
 * @access Public
 */
//@ts-ignore
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, firstName, lastName, role } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required, my dear!' });
        }

        // Check if user already exists
        const existingUser = await PlatformUserService.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: 'Oh no, a platform user with that email already exists! Please try another one.' });
        }

        // Prepare user data for registration. Password hashing happens in the model's pre-save hook!
        const userData = { email, passwordHash: password, firstName, lastName, role: role || 'tenant_owner' };
        // We temporarily treat 'password' from req.body as 'passwordHash' because our service expects it,
        // and the model's pre-save hook will hash it into the actual passwordHash.

        const newUserResponse: IPlatformUserResponse = await PlatformUserService.registerUser(userData);

        console.log(`Platform user '${newUserResponse.email}' registered successfully via API! 🎉`);
        res.status(201).json({
            message: 'Platform user registered successfully! Welcome to Dreamkart! 😊',
            user: newUserResponse
        });

    } catch (error: any) {
        console.error("{PlatformAuthRoute -> register} Error during platform user registration: 😭", error);
        res.status(500).json({ message: `Failed to register platform user: ${error.message || 'Unknown error'}` });
    }
});

/**
 * @route POST /api/platform/login
 * @description Logs in a platform user and returns a JWT token.
 * @access Public
 */
//@ts-ignore
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required for login, my dear!' });
        }

        // Find the user by email
        const user = await PlatformUserService.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Oh dear, invalid credentials! Please check your email or password. 🥺' });
        }

        // Compare the provided password with the stored hashed password using the model's method
        const isMatch = await user.comparePassword(password); // Using the method directly from the user document!

        if (!isMatch) {
            return res.status(401).json({ message: 'Oh dear, invalid credentials! Please check your email or password. 🥺' });
        }

        // If credentials are correct, generate a JWT token!
        // The payload should contain minimal, necessary information (like user ID, email, role).
        const payload = {
            id: user._id,
            email: user.email,
            role: user.role,
            isPlatformUser: true // A flag to distinguish platform users from tenant users in tokens
        };

        // Sign the token to expire in, say, 1 hour (adjust as needed!)
        const token = signJwt(payload, '1h');

        // Update last login time (optional but good practice)
        user.lastLoginAt = new Date();
        await user.save(); // Save the updated user document

        console.log(`Platform user '${user.email}' logged in successfully! Welcome back! 🎉`);
        res.status(200).json({
            message: 'Login successful! 😊',
            token,
            user: { // Send back basic user info (without password hash)
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status
            }
        });

    } catch (error: any) {
        console.error("{PlatformAuthRoute -> login} Error during platform user login: 😭", error);
        res.status(500).json({ message: `Failed to login: ${error.message || 'Unknown error'}` });
    }
});

export default router;