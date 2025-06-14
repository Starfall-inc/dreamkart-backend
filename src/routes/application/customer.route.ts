// src/routes/application/customer.routes.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import { signJwt, verifyJwt } from '../../utils/jwt.utils';
import CustomerService from '../../services/application/customer.service';
import { authenticateTenantUser } from '../../middleware/tenantAuth.middleware'; // For admin-like actions (e.g., platform user creating customer)
import { authenticateCustomer } from "../../middleware/customerAuth.middleware";
import Customer, { ICustomer } from '../../model/application/customer.model'; // Import ICustomer

const router = express.Router();

// 🔑 Multi-tenancy middleware for all customer routes is already in app.ts 🔑
// However, specific authentication middleware for customer vs. tenant admin needs to be applied.


// --- CUSTOMER MANAGEMENT BY TENANT ADMIN (Requires Tenant User JWT) ---
// Route to create a new customer by a tenant admin
// @ts-ignore
// router.post('/', authenticateTenantUser, async (req, res) => {
//     const tenantDbName: string = req.tenantDbName!; // tenantDbName from authenticateTenantUser
//     try {
//         const newCustomerData = req.body; // Expects email, password, etc.
//         const newCustomer = await CustomerService.createCustomer(tenantDbName, newCustomerData);
//         res.status(201).json({ message: 'Customer created successfully by admin! 🎉', customer: newCustomer });
//     } catch (error: any) {
//         console.error(`Error creating customer by admin for tenant ${tenantDbName}:`, error);
//         if (error.message.includes('Validation Error') || error.message.includes('email already exists')) {
//             return res.status(400).json({ message: error.message });
//         }
//         res.status(500).json({ message: 'Failed to create customer', error: error.message });
//     }
// });

// --- CUSTOMER PROFILE MANAGEMENT (Requires Customer JWT) ---
// Route to get current customer's profile (requires customer's own JWT)
// @ts-ignore
router.get('/profile', authenticateCustomer, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    // req.customer is added by authenticateCustomer middleware
    const customerId: string = req.customer!.id;

    try {
        const customer = await CustomerService.getCustomerById(tenantDbName, customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer profile not found, sweetie! 🥺' });
        }
        // Remove sensitive data before sending
        const customerResponse: Partial<ICustomer> = customer.toObject();
        delete customerResponse.password;
        delete customerResponse.orderHistory; // Can expose later if needed
        delete customerResponse.wishlist;     // Can expose later if needed

        res.status(200).json(customerResponse);
    } catch (error: any) {
        console.error(`Error fetching customer profile for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch customer profile', error: error.message });
    }
});

// Route to update current customer's profile (requires customer's own JWT)
// @ts-ignore
router.put('/profile', authenticateCustomer, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    const customerId: string = req.customer!.id;
    const updateData = req.body; // Don't allow password update here, use a separate route for that!
    delete updateData.password; // Important: prevent password update via this route

    try {
        const updatedCustomer = await CustomerService.updateCustomer(tenantDbName, customerId, updateData);
        if (!updatedCustomer) {
            return res.status(404).json({ message: 'Customer profile not found for update! 🥺' });
        }
        const customerResponse: Partial<ICustomer> = updatedCustomer.toObject();
        delete customerResponse.password;
        res.status(200).json({ message: 'Customer profile updated successfully! 😊', customer: customerResponse });
    } catch (error: any) {
        console.error(`Error updating customer profile for tenant ${tenantDbName}:`, error);
        if (error.message.includes('Validation Error')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Failed to update customer profile', error: error.message });
    }
});

// --- CUSTOMER MANAGEMENT BY ID (FOR ADMINS ONLY - requires Tenant User JWT) ---
// Example: Get customer by ID (admin view)
// @ts-ignore
// router.get('/:customerId', authenticateTenantUser, async (req, res) => {
//     const tenantDbName: string = req.tenantDbName!;
//     const customerId: string = req.params.customerId;

//     try {
//         const customer = await CustomerService.getCustomerById(tenantDbName, customerId);
//         if (!customer) {
//             return res.status(404).json({ message: 'Customer not found by ID, sweetie! 🥺' });
//         }
//         const customerResponse: Partial<ICustomer> = customer.toObject();
//         delete customerResponse.password; // Hide password for admin view
//         res.status(200).json(customerResponse);
//     } catch (error: any) {
//         console.error(`Error fetching customer by ID (${customerId}) for tenant ${tenantDbName}:`, error);
//         res.status(500).json({ message: 'Failed to fetch customer by ID', error: error.message });
//     }
// });

// Example: Delete customer by ID (admin action)
// @ts-ignore
// router.delete('/:customerId', authenticateTenantUser, async (req, res) => {
//     const tenantDbName: string = req.tenantDbName!;
//     const customerId: string = req.params.customerId;

//     try {
//         const deletedCustomer = await CustomerService.deleteCustomer(tenantDbName, customerId);
//         if (!deletedCustomer) {
//             return res.status(404).json({ message: 'Customer not found to delete! 🥺' });
//         }
//         res.status(204).send(); // No content for successful delete
//     } catch (error: any) {
//         console.error(`Error deleting customer by ID (${customerId}) for tenant ${tenantDbName}:`, error);
//         res.status(500).json({ message: 'Failed to delete customer', error: error.message });
//     }
// });


export default router;