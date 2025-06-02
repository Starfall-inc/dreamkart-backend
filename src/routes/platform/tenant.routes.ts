import express from 'express';
import TenantService from '../../services/platform/tenant.service'; // Import your TenantService
import { ITenant } from '../../model/platform/tenant.model'; // Import the Tenant interface

const router = express.Router(); // Create a new router for tenant-related routes! ✨

// 🚀 Route to register a new tenant (shop) on the platform 🚀
// This route typically takes details about the new shop and its owner.
//@ts-ignore
router.post('/register', async (req, res) => {
    try {
        // We expect the request body to contain:
        // name: The name of the new shop (e.g., "Keqing's Goods")
        // ownerId: The ObjectId of the user who is registering this shop (from your platform's User model)
        //          This would typically come from an authenticated user's session/token.
        // email: The contact email for the shop.
        // plan: Optional, the subscription plan the tenant wants (e.g., 'free', 'basic')

        const { name, ownerId, email, plan, settings } = req.body;

        // Basic validation (you might want a more robust validation library like Joi or Zod)
        if (!name || !ownerId || !email) {
            return res.status(400).json({ message: 'Sweetie, please provide the shop name, owner ID, and email to register a new tenant! 🥺' });
        }

        // Ensure ownerId is a valid Mongoose ObjectId (if not already handled by Mongoose schema)
        // If ownerId comes as a string, you might need to convert it: new mongoose.Types.ObjectId(ownerId)
        // For simplicity, assuming req.body.ownerId is already appropriate or will be handled by Mongoose.

        // Call the TenantService to create the tenant and their dedicated database!
        const newTenant: ITenant = await TenantService.createTenant({
            name,
            ownerId,
            email,
            plan,
            settings
        });

        // Respond with the newly created tenant's information
        res.status(201).json({
            message: 'Yay! Your lovely new shop has been registered successfully! 🎉',
            tenant: {
                _id: newTenant._id,
                name: newTenant.name,
                slug: newTenant.slug,
                email: newTenant.email,
                status: newTenant.status,
                databaseName: newTenant.databaseName, // Important info for client or admin
                plan: newTenant.plan
            }
        });

    } catch (error: any) {
        console.error("{TenantRoutes -> POST /register} Error registering tenant:", error);

        // Handle specific errors for a better user experience
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed for tenant registration. Please check your inputs.', errors: error.errors });
        }
        if (error.code === 11000) { // MongoDB duplicate key error
            // This could be for duplicate 'name' or 'email' or 'slug'
            if (error.message.includes('name')) {
                return res.status(409).json({ message: 'Oh dear, a shop with that name already exists! Please choose a unique name. 💔' });
            }
            if (error.message.includes('email')) {
                return res.status(409).json({ message: 'It seems an account with this email already exists. Please use a different one. 📧' });
            }
            return res.status(409).json({ message: 'A duplicate entry was detected. Please ensure all details are unique.', error: error.message });
        }

        // Catch the custom error message thrown by the service
        if (error.message.includes('Failed to create tenant')) {
             return res.status(500).json({ message: 'There was a problem setting up your shop. Please try again. 😔' });
        }

        res.status(500).json({ message: 'Something went wrong during tenant registration. Please try again later. 😥', error: error.message });
    }
});

// ℹ️ Optional: Route to get all tenants (likely for platform admin use only!) ℹ️
router.get('/', async (req, res) => {
    // Implement authentication/authorization here to ensure only platform admins can access this!
    try {
        const tenants = await TenantService.getTenants();
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