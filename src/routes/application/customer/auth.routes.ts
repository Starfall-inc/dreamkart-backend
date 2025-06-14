import express from 'express';
import jwt from 'jsonwebtoken';
import { signJwt, verifyJwt } from '../../../utils/jwt.utils';
import CustomerService from '../../../services/application/customer.service';
import { authenticateTenantUser } from '../../../middleware/tenantAuth.middleware'; // For admin-like actions (e.g., platform user creating customer)
import { authenticateCustomer } from "../../../middleware/customerAuth.middleware";
import Customer, { ICustomer } from '../../../model/application/customer.model'; // Import ICustomer
import router from '../product.routes';


// --- CUSTOMER AUTHENTICATION (Publicly accessible but tenant-aware) ---
// Route for customer login (no JWT needed initially, but requires X-Tenant-ID)
// @ts-ignore
router.post('/login', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName; // tenantDbName from tenantResolver
    const { email, password } = req.body;

    try {
        const customer = await CustomerService.loginCustomer(tenantDbName, email, password);

        if (!customer) {
            return res.status(401).json({ message: 'Invalid credentials or account not active, darling! 🥺' });
        }

        // Generate JWT for the customer
        // Use a different JWT secret for customers if you want to differentiate
        const customerSecret = process.env.CUSTOMER_JWT_SECRET || 'yourCustomerJwtSecret';
        const token = jwt.sign(
            {
                id: customer._id,
                email: customer.email,
                isCustomer: true, // Flag to easily identify customer tokens
                tenantDbName: tenantDbName, // Include tenantDbName in the token for convenience
            },
            customerSecret,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.status(200).json({ message: 'Customer logged in successfully! Welcome! 🎉', token });
    } catch (error: any) {
        console.error(`Error logging in customer for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to login customer', error: error.message });
    }
});

//@ts-ignore
router.post('/register', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName; // tenantDbName from tenantResolver
    console.log("Route called")
    const { 
        email,
        password,
        firstName,
        lastName,
     } = req.body;

     try{

        if (!email || !password){
            return res.status(500).json({ message: 'Failed to login customer Required fields missing'})
        }

        const customerData = {
            email,
            password,
            firstName,
            lastName,
            isActive: true
        }

        await CustomerService.createCustomer(tenantDbName, customerData);

        // provide token for the customer 

        const customer = await CustomerService.loginCustomer(tenantDbName, email, password);

        if(!customer){
            return res.status(500).json({message: 'Failed to login, customer not exists'});
        }

        const token = signJwt(
            {
                id: customer._id,
                email: customer.email,
                isCustomer: true,
                tenantDbName: tenantDbName
            },
           '1h'
        )
        res.status(200).json({ message: 'Customer logged in successfully! Welcome! 🎉', token });

    } catch (error: any) {
        console.error(`Error during customer registration for tenant ${tenantDbName}:`, error);

        // More robust error handling, similar to what we discussed earlier
        if (error.message.includes('email already exists')) {
            return res.status(409).json({ message: 'A customer with this email already exists, my dear! Please try another one. 🤔' });
        }
        if (error.message.includes('Validation Error')) {
            return res.status(400).json({ message: `Registration failed due to invalid data: ${error.message}` });
        }
        res.status(500).json({ message: 'Failed to register customer. Something went wrong! 💔', error: error.message });
    }
})

export default router;