import express from 'express';
import { Router, Request, Response, NextFunction } from 'express'; // ✨ Note: No need to import AuthenticatedRequest anymore! ✨
import TenantService from '../../services/platform/tenant.service'; // Import your TenantService
import { ITenant, Tenant } from '../../model/platform/tenant.model'; // Import the Tenant interface and Tenant model
import { authenticate } from '../../middleware/auth.middleware';
import { TENANT_CREATION_LIMITS } from '../../config/app.limit';
import PlatformUserService from '../../services/platform/platformUser.service'; // Import the PlatformUserService
import { IPlatformUser } from '../../model/platform/user.model'; // Import the PlatformUser interface
import { DuplicateFieldError } from '../../errors/DuplicateFieldError';
import mongoose from 'mongoose'; // Import mongoose for ObjectId conversion



const router = express.Router(); // Create a new router for tenant-related routes! ✨

/**
 * @route POST /api/platform/tenants/register
 * @description Registers a new tenant (shop) on the platform, secured by authentication.
 * Also creates the initial owner user for the new tenant's dedicated database.
 * @access Private (Platform User with 'tenant_owner' or 'platform_admin' role required)
 */
//@ts-ignore
router.post('/register', authenticate, async (req: Request, res: Response) => {
    try {
        // We can now safely access req.user because of our global type declaration!
        const ownerId = req.user!.id; // PlatformUser ID from JWT
        const ownerEmail = req.user!.email;
        // ownerRole is available from req.user!.role, but not strictly needed for this logic path.

        const {
            name,
            email, // This is the tenant's contact email
            plan,
            settings,
            // ✨ NEW: These are the details for the initial admin user within the new shop! ✨
            initialTenantUserEmail,
            initialTenantUserPassword,
            initialTenantUserName
        } = req.body;

        // --- Step 1: Basic Validation for Tenant and Initial User Details ---
        if (!name || !email) {
            return res.status(400).json({ message: 'Sweetie, please provide the shop name and a contact email to register a new tenant! 🥺' });
        }

        // ✨ We MUST have initial user details to create the shop's first admin! ✨
        if (!initialTenantUserEmail || !initialTenantUserPassword || !initialTenantUserName) {
            return res.status(400).json({ message: 'My dear, you must provide initial admin user details (email, password, name) for your new shop! 🔑' });
        }

        // --- Step 2: Verify Platform User Exists and Check Plan Limits ---
        const platformUser = await PlatformUserService.findById(ownerId);

        if (!platformUser) {
            console.error(`{TenantRoutes -> POST /register} Authenticated platform user with ID ${ownerId} not found in PlatformUser database. 🧐`);
            return res.status(404).json({ message: 'Owner platform user not found. Please log in again.' });
        }

        // Use the plan from the platformUser, or default to 'free' if not explicitly set
        // 'platform_admin' role typically implies unlimited tenant creation.
        const userPlan = platformUser.role === 'platform_admin' ? 'platform_admin' : (platformUser.plan || 'free');
        const allowedTenantLimit = TENANT_CREATION_LIMITS[userPlan];

        if (allowedTenantLimit === undefined) {
             console.warn(`{TenantRoutes -> POST /register} Unknown plan '${userPlan}' for platform user ID ${ownerId}. Assuming no creation allowed.`);
             return res.status(403).json({ message: 'Your current plan does not allow tenant creation. Please upgrade your plan. 💔' });
        }

        if (allowedTenantLimit !== 'unlimited') {
            const existingTenantsCount = await Tenant.countDocuments({ ownerId: ownerId });

            if (existingTenantsCount >= allowedTenantLimit) {
                console.warn(`{TenantRoutes -> POST /register} Platform user ${ownerEmail} (Plan: ${userPlan}) reached tenant limit (${allowedTenantLimit}).`);
                return res.status(403).json({
                    message: `Oh dear, you've reached the maximum number of shops allowed for your '${userPlan}' plan (${allowedTenantLimit} shops)! Please upgrade your plan to create more. 😔`
                });
            }
            console.log(`{TenantRoutes -> POST /register} Platform user ${ownerEmail} (Plan: ${userPlan}) has ${existingTenantsCount}/${allowedTenantLimit} tenants. Proceeding...`);
        } else {
             console.log(`{TenantRoutes -> POST /register} Platform user ${ownerEmail} (Plan: ${userPlan}) has unlimited tenant creation. Proceeding...`);
        }

        // --- Step 3: Create the Tenant and its Initial User ---
        // Convert ownerId (string) to ObjectId for Mongoose
        const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

        const newTenant: ITenant = await TenantService.createTenant(
            { // Tenant Data for the platform database
                name,
                ownerId: ownerObjectId,
                email, // Tenant's contact email
                plan: plan || 'free', // Shop's chosen plan
                settings
            },
            { // ✨ Initial Tenant User Data for the new shop's database ✨
                email: initialTenantUserEmail,
                password: initialTenantUserPassword,
                name: initialTenantUserName
            }
        );

        // --- Step 4: Send Success Response ---
        res.status(201).json({
            message: 'Yay! Your lovely new shop has been registered successfully! 🎉 And your initial admin user is set up!',
            tenant: {
                _id: newTenant._id,
                name: newTenant.name,
                slug: newTenant.slug,
                email: newTenant.email,
                status: newTenant.status,
                databaseName: newTenant.databaseName,
                plan: newTenant.plan
            },
            initialTenantAdminInfo: { // Optionally, return some info about the created admin
                email: initialTenantUserEmail,
                // NEVER return the password here!
            }
        });

    } catch (error: any) {
        console.error("{TenantRoutes -> POST /register} Error registering tenant or initial user: 😭", error);

        // --- Error Handling ---
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed for tenant registration. Please check your inputs.', errors: error.errors });
        }
        if (error.code === 11000) { // MongoDB duplicate key error
            if (error.message.includes('name')) {
                return res.status(409).json({ message: 'Oh dear, a shop with that name already exists! Please choose a unique name. 💔' });
            }
            if (error.message.includes('email')) {
                // This could be a duplicate for tenant contact email OR initial tenant user email within the *new* tenant's DB.
                return res.status(409).json({ message: 'It seems an email address is already in use (either for the shop contact or its initial admin). Please use a different one. 📧' });
            }
            return res.status(409).json({ message: 'A duplicate entry was detected. Please ensure all details are unique.', error: error.message });
        }

        if (error.message && typeof error.message === 'string' && error.message.includes('Failed to create tenant')) {
             return res.status(500).json({ message: 'There was a problem setting up your shop. Please try again. 😔' });
        }
        if (error instanceof DuplicateFieldError) {
            return res.status(409).json({
            message: `A shop with this ${error.field} already exists. Please choose a unique ${error.field}. 💔`
            });
        }
        else{
            res.status(500).json({ message: 'Something went wrong during tenant registration. Please try again later. 😥', error: error.message });
        }
    }
});

// ℹ️ Optional: Route to get all tenants (likely for platform admin use only!) ℹ️
router.get('/', authenticate, async (req, res) => {
    // Implement authentication/authorization here to ensure only platform admins can access this!
    try {
        const platformUserId = req.user!.id;
        const tenants = await TenantService.getTenantUnderPlatformUser(platformUserId);
        res.status(200).json(tenants);
    } catch (error: any) {
        console.error("{TenantRoutes -> GET /} Error fetching all tenants:", error);
        res.status(500).json({ message: 'Failed to retrieve tenants.', error: error.message });
    }
});

// 🔍 Optional: Route to get a specific tenant by ID (likely for platform admin/owner use) 🔍
//@ts-ignore
router.get('/:id', async (req, res) => {
    // Again, add authorization checks here!
    try {
        const tenant = await TenantService.getTenantById(req.params.id);
        res.status(200).json(tenant);
    } catch (error: any) {
        console.error(`{TenantRoutes -> GET /:id} Error fetching tenant with ID ${req.params.id}:`, error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: 'Tenant not found! 🥺' });
        }
        res.status(500).json({ message: 'Failed to retrieve tenant.', error: error.message });
    }
});

// ✍️ Optional: Route to update a tenant (likely for platform admin use) ✍️
//@ts-ignore
router.put('/:id', async (req, res) => {
    // Strong authorization: Only platform admins should be able to update tenant status/plan etc.
    // Or, a tenant owner might update their own shop's contact email.
    try {
        const updatedTenant = await TenantService.updateTenant(req.params.id, req.body);
        res.status(200).json({
            message: 'Tenant updated successfully! ✨',
            tenant: updatedTenant
        });
    } catch (error: any) {
        console.error(`{TenantRoutes -> PUT /:id} Error updating tenant with ID ${req.params.id}:`, error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: 'Tenant not found for update! 🥺' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed during update. Please check inputs.', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to update tenant.', error: error.message });
    }
});

// 🗑️ Optional: Route to delete a tenant (EXTREMELY DANGEROUS - ADMIN ONLY!) 🗑️
//@ts-ignore
router.delete('/:id', async (req, res) => {
    // This MUST be protected by strong platform_admin authorization!
    try {
        await TenantService.deleteTenant(req.params.id);
        res.status(204).send(); // 204 No Content for successful deletion! ✨
    } catch (error: any) {
        console.error(`{TenantRoutes -> DELETE /:id} Error deleting tenant with ID ${req.params.id}:`, error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: 'Tenant not found for deletion! 🥺' });
        }
        res.status(500).json({ message: 'Failed to delete tenant.', error: error.message });
    }
});


export default router;