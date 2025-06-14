// src/routes/application/cart.routes.ts

import express from 'express';
import CartService from '../../services/application/cart.service';
import { authenticateCustomer } from '../../middleware/customerAuth.middleware';
import { validateObjectId } from '../../middleware/validateObjectId.middleware';

const router = express.Router();

// All these routes will be protected by `authenticateCustomer` middleware.
// This middleware will attach `req.tenantDbName` and `req.customer` to the request object.

/**
 * @route GET /api/tenant/cart
 * @description Retrieves the authenticated customer's cart with populated product details.
 * @access Private (Customer JWT Required)
 */
// @ts-ignore
router.get('/', authenticateCustomer, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    const customerId: string = req.customer!.id;

    try {
        const cart = await CartService.getCart(tenantDbName, customerId);
        if (!cart) {
            // If customer not found, or cart is simply empty (which getCart returns null for),
            // we can return an empty array or specific message.
            return res.status(200).json({ message: 'Your cart is empty, darling! Time to fill it with treasures! 🌟', cart: [] });
        }
        res.status(200).json({ message: 'Cart retrieved successfully! 😊', cart });
    } catch (error: any) {
        console.error(`Error retrieving cart for tenant ${tenantDbName}, customer ${customerId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve cart', error: error.message });
    }
});

/**
 * @route POST /api/tenant/cart/items
 * @description Adds a product to the authenticated customer's cart. If the product already exists,
 * it increments the quantity.
 * @access Private (Customer JWT Required)
 * @body {string} productId - The ID of the product to add.
 * @body {number} [quantity=1] - The quantity to add.
 *
 * RESTful Note: POST to a collection endpoint (`/items`) usually creates a new resource.
 * Here, we're treating 'adding to cart' as potentially creating a new cart item (if not exists)
 * or modifying an existing one, making POST suitable.
 */
// @ts-ignore

router.post('/items', authenticateCustomer, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    const customerId: string = req.customer!.id;
    const { productId, quantity } = req.body; // quantity will default to 1 in service if not provided

    if (!productId) {
        return res.status(400).json({ message: 'Product ID is required to add to cart, sweetie! 💖' });
    }

    try {
        // addItemToCart service method already handles adding new or updating existing quantity
        const updatedCustomer = await CartService.addItemToCart(tenantDbName, customerId, productId, quantity);
        if (!updatedCustomer) {
            // This case might mean customer not found, or an issue adding the item
            return res.status(404).json({ message: 'Customer not found or product could not be added to cart! 🥺' });
        }
        res.status(200).json({ message: 'Cart updated successfully! 🎉', cart: updatedCustomer.cart });
    } catch (error: any) {
        console.error(`Error adding/updating item to cart for tenant ${tenantDbName}, customer ${customerId}:`, error);
        res.status(500).json({ message: 'Failed to add item to cart', error: error.message });
    }
});

/**
 * @route PUT /api/tenant/cart/items/:productId
 * @description Updates the quantity of a specific product in the authenticated customer's cart.
 * This is a PUT for updating a specific 'item' resource within the cart.
 * @access Private (Customer JWT Required)
 * @params {string} productId - The ID of the product (item) to update.
 * @body {number} quantity - The new, explicit quantity for the product. If <= 0, the item will be removed.
 */
// @ts-ignore
router.put('/items/:productId', authenticateCustomer, validateObjectId, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    const customerId: string = req.customer!.id;
    const { productId } = req.params; // Get productId from URL parameter
    const { quantity } = req.body; // Get newQuantity from body as 'quantity'

    if (typeof quantity !== 'number' || quantity < 0) { // Quantity can be 0 to remove
        return res.status(400).json({ message: 'A valid positive quantity (or 0 to remove) is required, honey! 🧐' });
    }

    try {
        const updatedCustomer = await CartService.updateCartItemQuantity(tenantDbName, customerId, productId, quantity);
        if (!updatedCustomer) {
            // If the item wasn't found and quantity was > 0, service tried to add, but maybe customer not found.
            return res.status(404).json({ message: 'Customer or cart item not found to update! 🥺' });
        }
        res.status(200).json({ message: 'Cart item quantity updated! ✨', cart: updatedCustomer.cart });
    } catch (error: any) {
        console.error(`Error updating cart item quantity for tenant ${tenantDbName}, customer ${customerId}:`, error);
        res.status(500).json({ message: 'Failed to update cart item quantity', error: error.message });
    }
});

/**
 * @route DELETE /api/tenant/cart/items/:productId
 * @description Removes a specific product from the authenticated customer's cart.
 * @access Private (Customer JWT Required)
 * @params {string} productId - The ID of the product (item) to remove.
 */
// @ts-ignore
router.delete('/items/:productId', authenticateCustomer, validateObjectId, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    const customerId: string = req.customer!.id;
    const { productId } = req.params; // productId comes from URL params

    try {
        const updatedCustomer = await CartService.removeItemFromCart(tenantDbName, customerId, productId);
        if (!updatedCustomer) {
            // This might mean the item wasn't in the cart, or the customer wasn't found.
            // If the item wasn't in the cart but the customer exists, `removeItemFromCart`
            // would still return the customer with an unchanged cart, which is fine.
            // We only return 404 if the customer itself is not found by the service.
            return res.status(404).json({ message: 'Customer not found to remove item from cart! 🥺' });
        }
        res.status(200).json({ message: 'Product removed from cart! 🗑️', cart: updatedCustomer.cart });
    } catch (error: any) {
        console.error(`Error removing item from cart for tenant ${tenantDbName}, customer ${customerId}:`, error);
        res.status(500).json({ message: 'Failed to remove item from cart', error: error.message });
    }
});

/**
 * @route DELETE /api/tenant/cart
 * @description Clears all items from the authenticated customer's cart.
 * DELETE on the collection implies clearing all items.
 * @access Private (Customer JWT Required)
 */
// @ts-ignore
router.delete('/', authenticateCustomer, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    const customerId: string = req.customer!.id;

    try {
        const updatedCustomer = await CartService.clearCart(tenantDbName, customerId);
        if (!updatedCustomer) {
            return res.status(404).json({ message: 'Customer not found! 🥺' });
        }
        res.status(200).json({ message: 'Cart cleared successfully! ✨', cart: updatedCustomer.cart });
    } catch (error: any) {
        console.error(`Error clearing cart for tenant ${tenantDbName}, customer ${customerId}:`, error);
        res.status(500).json({ message: 'Failed to clear cart', error: error.message });
    }
});

export default router;