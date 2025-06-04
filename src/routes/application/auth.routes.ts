// src/routes/application/auth.routes.ts

import { Router, Request, Response } from 'express';
import UserService from '../../services/application/user.service'; // Our tenant user service
import { generateTenantToken } from '../../utils/tenantJwt.utils'; // Our specific tenant token generator

const router = Router();

/**
 * @route POST /api/tenant/:tenantSlug/auth/login
 * @description Logs in a user for a specific tenant and returns a JWT.
 * @access Public (but scoped to a specific tenant via :tenantSlug)
 */
//@ts-ignore
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        // ✨ YES, my dear, this is exactly where we use res.locals.tenantDbName! ✨
        // This value is populated by the `resolveTenant` middleware, which runs before this route.
        const tenantDbName = res.locals.tenantDbName;

        if (!tenantDbName) {
            console.error("{TenantAuthRoutes -> POST /login} No tenantDbName found in res.locals. This indicates a problem with the tenantResolver middleware setup.");
            return res.status(500).json({ message: 'Sweetie, something went wrong with the shop context. Please try again! 🥺' });
        }

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide both email and password, darling! 🔑' });
        }

        // 1. Find the user in the specific tenant's database
        const user = await UserService.findByEmail(tenantDbName, email);
        if (!user) {
            console.warn(`{TenantAuthRoutes -> POST /login} Login attempt failed for email '${email}' in tenant DB '${tenantDbName}': User not found.`);
            return res.status(401).json({ message: 'Invalid credentials. Please check your email and password. 😞' });
        }

        // 2. Compare the provided password with the hashed password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.warn(`{TenantAuthRoutes -> POST /login} Login attempt failed for email '${email}' in tenant DB '${tenantDbName}': Incorrect password.`);
            return res.status(401).json({ message: 'Invalid credentials. Please check your email and password. 😞' });
        }

        // 3. Update last login time
        user.lastLoginAt = new Date();
        await user.save();

        // 4. Generate a tenant-specific JWT
        const token = generateTenantToken(user, tenantDbName);
        console.log(`{TenantAuthRoutes -> POST /login} User '${email}' successfully logged in for tenant DB: ${tenantDbName}! 🎉`);

        res.status(200).json({
            message: 'Login successful! Welcome to your shop! 😊',
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                isActive: user.isActive
            }
        });

    } catch (error: any) {
        console.error("{TenantAuthRoutes -> POST /login} Error during tenant user login: 😭", error);
        res.status(500).json({ message: 'Something went wrong during login. Please try again later. 😥', error: error.message });
    }
});

export default router;