// src/routes/application/order.routes.ts

import express from 'express';
import OrderService from '../../services/application/order.service'; // Our brilliant OrderService
import { authenticateCustomer } from '../../middleware/customerAuth.middleware'; // For customer-specific access
import { validateObjectId } from '../../middleware/validateObjectId.middleware'; // For validating IDs in params

const router = express.Router();

// --- CUSTOMER ORDER MANAGEMENT ROUTES ---
// These routes require an authenticated customer's JWT token.

/**
 * @route POST /api/customer/orders
 * @description Allows an authenticated customer to place a new order from their current cart.
 * @access Private (Customer JWT Required)
 * @body {object} shippingAddress - The shipping address details.
 * @body {string} contactPhone - The contact phone number for the order.
 * @returns {IOrder} The newly created order document.
 */
// @ts-ignore
router.post('/', authenticateCustomer, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    const customerId: string = req.customer!.id; // Customer ID from JWT
    const { shippingAddress, contactPhone } = req.body;

    if (!shippingAddress || !contactPhone) {
        return res.status(400).json({ message: 'Shipping address and contact phone are required to place an order, darling! 🥺' });
    }

    try {
        const newOrder = await OrderService.createOrder(tenantDbName, customerId, shippingAddress, contactPhone);
        if (!newOrder) {
            return res.status(500).json({ message: 'Failed to place order. Please try again! 💔' });
        }
        res.status(201).json({ message: 'Order placed successfully! Thank you for your purchase! 🎉', order: newOrder });
    } catch (error: any) {
        console.error(`Error placing order for customer ${customerId} in tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: `Failed to place order: ${error.message}` });
    }
});

/**
 * @route GET /api/customer/orders
 * @description Retrieves the order history for the authenticated customer.
 * @access Private (Customer JWT Required)
 * @returns {IOrder[]} An array of order documents.
 */
// @ts-ignore
router.get('/', authenticateCustomer, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    const customerId: string = req.customer!.id;

    try {
        const orders = await OrderService.getCustomerOrders(tenantDbName, customerId);
        res.status(200).json({ message: 'Order history retrieved successfully! 📜', orders });
    } catch (error: any) {
        console.error(`Error retrieving order history for customer ${customerId} in tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: `Failed to retrieve order history: ${error.message}` });
    }
});

/**
 * @route GET /api/customer/orders/:orderId
 * @description Retrieves a specific order by its ID for the authenticated customer.
 * @access Private (Customer JWT Required)
 * @params {string} orderId - The ID of the order to retrieve.
 * @returns {IOrder} The requested order document.
 */
// @ts-ignore
router.get('/:orderId', authenticateCustomer, validateObjectId, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    const customerId: string = req.customer!.id;
    const orderId: string = req.params.orderId;

    try {
        const order = await OrderService.getOrderById(tenantDbName, customerId, orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found or does not belong to you, sweetie! 🥺' });
        }
        res.status(200).json({ message: 'Order retrieved successfully! ✨', order });
    } catch (error: any) {
        console.error(`Error retrieving order ${orderId} for customer ${customerId} in tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: `Failed to retrieve order: ${error.message}` });
    }
});

/**
 * @route PUT /api/customer/orders/:orderId/cancel
 * @description Allows an authenticated customer (or admin) to cancel an order.
 * @access Private (Customer JWT Required, Admin might use a different route or specific auth)
 * @params {string} orderId - The ID of the order to cancel.
 * @returns {IOrder} The updated order document with status 'cancelled'.
 */
// @ts-ignore
router.put('/:orderId/cancel', authenticateCustomer, validateObjectId, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    const customerId: string = req.customer!.id; // For customer-specific cancellation logic
    const orderId: string = req.params.orderId;

    try {
        const order = await OrderService.getOrderById(tenantDbName, customerId, orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found or does not belong to you! 🥺' });
        }

        // Basic check: only allow cancellation if order is pending or confirmed (not already shipped/delivered)
        if (order.status !== 'pending' && order.status !== 'confirmed') {
            return res.status(400).json({ message: `Order cannot be cancelled in '${order.status}' status. 🚫` });
        }

        const cancelledOrder = await OrderService.cancelOrder(tenantDbName, orderId);
        if (!cancelledOrder) {
            return res.status(500).json({ message: 'Failed to cancel order. 💔' });
        }
        res.status(200).json({ message: 'Order cancelled successfully! 😔', order: cancelledOrder });
    } catch (error: any) {
        console.error(`Error cancelling order ${orderId} for customer ${customerId} in tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: `Failed to cancel order: ${error.message}` });
    }
});

// --- ADMIN ORDER MANAGEMENT ROUTES (Example - requires Tenant Admin JWT) ---
// These routes would require `authenticateTenantUser` and possibly role checks.
// For now, I'm providing an example of how one such route might look, but leaving it
// uncommented until you decide to fully implement admin panels.

/**
 * @route PUT /api/tenant/orders/:orderId/status (Admin route)
 * @description Allows a tenant admin to update the status of any order in their shop.
 * @access Private (Tenant Admin JWT Required)
 * @params {string} orderId - The ID of the order to update.
 * @body {string} newStatus - The new status for the order.
 * @returns {IOrder} The updated order document.
 */
// router.put('/:orderId/status', authenticateTenantUser, validateObjectId, async (req, res) => {
//     const tenantDbName: string = req.tenantDbName!; // From authenticateTenantUser
//     const orderId: string = req.params.orderId;
//     const { newStatus } = req.body;

//     if (!newStatus) {
//         return res.status(400).json({ message: 'New status is required, my dear admin! 🤔' });
//     }

//     try {
//         const updatedOrder = await OrderService.updateOrderStatus(tenantDbName, orderId, newStatus);
//         if (!updatedOrder) {
//             return res.status(404).json({ message: 'Order not found for status update! 🥺' });
//         }
//         res.status(200).json({ message: 'Order status updated successfully! ✅', order: updatedOrder });
//     } catch (error: any) {
//         console.error(`Error updating status for order ${orderId} by admin in tenant ${tenantDbName}:`, error);
//         res.status(500).json({ message: `Failed to update order status: ${error.message}` });
//     }
// });


export default router;