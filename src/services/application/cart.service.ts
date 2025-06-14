// src/services/application/cart.service.ts

import mongoose from 'mongoose';
import { getTenantDb } from '../../connection/tenantDb'; // Our correct tenant DB getter

// Import the actual Mongoose Models and Interfaces
import Customer, { ICustomer, ICartItem } from '../../model/application/customer.model';
import Product, { IProduct } from '../../model/application/product.model';

// Type definition for cart items after population
// This allows us to correctly type the 'productId' after it's been replaced by the actual Product document
type PopulatedCartItem = Omit<ICartItem, 'productId'> & {
    productId: IProduct; // When populated, productId will be an IProduct document
    productDetails?: { // Adding productDetails for a cleaner response structure, matching previous output
        _id: mongoose.Types.ObjectId;
        sku: string;
        name: string;
        price: number;
        image: string[];
        description: string;
    };
};

class CartService {

    /**
     * Helper method to get the correct Customer Model for a given tenant.
     * @param tenantDbName The name of the tenant's database.
     * @returns The Mongoose Model for Customer specific to this tenant's database.
     */
    private getTenantCustomerModel(tenantDbName: string): mongoose.Model<ICustomer> {
        const tenantDb: mongoose.Connection = getTenantDb(tenantDbName);
        // Ensure the model is compiled for this specific connection
        if (tenantDb.models.Customer) {
            return tenantDb.models.Customer as mongoose.Model<ICustomer>;
        }
        return tenantDb.model<ICustomer>('Customer', Customer.schema);
    }

    /**
     * Helper method to get the correct Product Model for a given tenant.
     * @param tenantDbName The name of the tenant's database.
     * @returns The Mongoose Model for Product specific to this tenant's database.
     */
    private getTenantProductModel(tenantDbName: string): mongoose.Model<IProduct> {
        const tenantDb: mongoose.Connection = getTenantDb(tenantDbName);
        // Ensure the model is compiled for this specific connection
        if (tenantDb.models.Product) {
            return tenantDb.models.Product as mongoose.Model<IProduct>;
        }
        return tenantDb.model<IProduct>('Product', Product.schema);
    }


    /**
     * Adds a product to the customer's cart or updates its quantity if already present.
     * @param tenantDbName The name of the tenant's database.
     * @param customerId The ID of the customer.
     * @param productId The ID of the product to add.
     * @param quantity The quantity to add (defaults to 1).
     * @returns The updated customer document (with cart), or null if customer/product not found.
     */
    public async addItemToCart(
        tenantDbName: string,
        customerId: string,
        productId: string,
        quantity: number = 1
    ): Promise<ICustomer | null> {
        try {
            const TenantCustomer = this.getTenantCustomerModel(tenantDbName);
            const TenantProduct = this.getTenantProductModel(tenantDbName);

            // First, verify the product exists in this tenant's store
            const productExists = await TenantProduct.findById(productId);
            if (!productExists) {
                throw new Error('Product not found in this shop! 🕵️‍♀️');
            }

            const customer = await TenantCustomer.findById(customerId);
            if (!customer) {
                throw new Error('Customer not found, my dear! 😥');
            }

            const productObjectId = new mongoose.Types.ObjectId(productId);

            // Find if the product is already in the cart
            const cartItemIndex = customer.cart.findIndex(
                item => item.productId.equals(productObjectId)
            );

            if (cartItemIndex > -1) {
                // If product exists, update its quantity
                customer.cart[cartItemIndex].quantity += quantity;
                if (customer.cart[cartItemIndex].quantity <= 0) {
                    // If quantity becomes 0 or less, remove the item
                    customer.cart.splice(cartItemIndex, 1);
                }
            } else {
                // If product is not in cart, add it as a new item
                if (quantity > 0) {
                    customer.cart.push({
                        productId: productObjectId,
                        quantity: quantity
                    });
                }
            }

            await customer.save(); // Save the updated customer document with the new cart state
            return customer;

        } catch (error: any) {
            console.error(`{CartService -> addItemToCart} Error adding/updating item to cart for tenant ${tenantDbName}:`, error);
            throw new Error(`Failed to add item to cart: ${error.message}`);
        }
    }

    /**
     * Retrieves the customer's cart with populated product details.
     * @param tenantDbName The name of the tenant's database.
     * @param customerId The ID of the customer.
     * @returns An array of cart items with populated product details, or null if customer not found.
     */
    public async getCart(
        tenantDbName: string,
        customerId: string
    ): Promise<PopulatedCartItem[] | null> {
        try {
            const TenantCustomer = this.getTenantCustomerModel(tenantDbName);
            const TenantProduct = this.getTenantProductModel(tenantDbName); // Needed for populate's 'model' option

            // Find the customer and populate the 'productId' field within the 'cart' array
            const customer = await TenantCustomer.findById(customerId)
                .select('cart') // Only select the 'cart' field to keep the payload small
                .populate({
                    path: 'cart.productId', // Path to the field we want to populate
                    model: TenantProduct, // Use the tenant-specific Product Model here
                    select: 'name price image sku description' // Select specific fields from the Product
                })
                .lean<ICustomer>(); // Use .lean() for faster reads if you don't need Mongoose Document methods

            if (!customer) {
                return null; // Customer not found
            }

            // Map the populated cart items to a cleaner structure
            // Ensure proper typing for populated 'productId'
            const populatedCart = customer.cart.map((item: any) => ({ // Using 'any' here due to the nature of populate before manual type assertion
                productId: item.productId._id, // The ID of the product
                quantity: item.quantity,
                productDetails: { // The actual product details
                    _id: item.productId._id,
                    sku: item.productId.sku,
                    name: item.productId.name,
                    price: item.productId.price,
                    image: item.productId.image,
                    description: item.productId.description
                    // Add other fields you selected from the Product model
                }
            })) as PopulatedCartItem[]; // Assert the type here

            return populatedCart;

        } catch (error: any) {
            console.error(`{CartService -> getCart} Error fetching cart for tenant ${tenantDbName}:`, error);
            throw new Error(`Failed to fetch cart: ${error.message}`);
        }
    }

    /**
     * Updates the quantity of a specific product in the customer's cart.
     * If newQuantity is 0 or less, the item will be removed.
     * @param tenantDbName The name of the tenant's database.
     * @param customerId The ID of the customer.
     * @param productId The ID of the product whose quantity to update.
     * @param newQuantity The new quantity for the product.
     * @returns The updated customer document, or null if customer not found.
     */
    public async updateCartItemQuantity(
        tenantDbName: string,
        customerId: string,
        productId: string,
        newQuantity: number
    ): Promise<ICustomer | null> {
        try {
            const TenantCustomer = this.getTenantCustomerModel(tenantDbName);
            const productObjectId = new mongoose.Types.ObjectId(productId);

            if (newQuantity <= 0) {
                // If quantity is 0 or less, remove the item
                return this.removeItemFromCart(tenantDbName, customerId, productId);
            }

            const customer = await TenantCustomer.findOneAndUpdate(
                {
                    _id: customerId,
                    'cart.productId': productObjectId
                },
                {
                    $set: { 'cart.$.quantity': newQuantity } // Update the quantity of the matched item
                },
                { new: true, runValidators: true } // Return the updated document, runValidators: true applies schema validators
            );

            // If customer or item not found, try adding it if it didn't exist before
            if (!customer) {
                 // Check if the customer exists first
                const existingCustomer = await TenantCustomer.findById(customerId);
                if (existingCustomer) {
                    // Customer exists but product not in cart, so add it
                    return this.addItemToCart(tenantDbName, customerId, productId, newQuantity);
                } else {
                    // Customer itself not found
                    return null;
                }
            }

            return customer;

        } catch (error: any) {
            console.error(`{CartService -> updateCartItemQuantity} Error updating cart item quantity for tenant ${tenantDbName}:`, error);
            throw new Error(`Failed to update cart item quantity: ${error.message}`);
        }
    }

    /**
     * Removes a specific product from the customer's cart.
     * @param tenantDbName The name of the tenant's database.
     * @param customerId The ID of the customer.
     * @param productId The ID of the product to remove.
     * @returns The updated customer document, or null if customer not found.
     */
    public async removeItemFromCart(
        tenantDbName: string,
        customerId: string,
        productId: string
    ): Promise<ICustomer | null> {
        try {
            const TenantCustomer = this.getTenantCustomerModel(tenantDbName);
            const productObjectId = new mongoose.Types.ObjectId(productId);

            const customer = await TenantCustomer.findByIdAndUpdate(
                customerId,
                {
                    $pull: { // $pull operator removes all instances of a value from an existing array
                        cart: { productId: productObjectId }
                    }
                },
                { new: true } // Return the updated document
            );

            return customer;

        } catch (error: any) {
            console.error(`{CartService -> removeItemFromCart} Error removing item from cart for tenant ${tenantDbName}:`, error);
            throw new Error(`Failed to remove item from cart: ${error.message}`);
        }
    }

    /**
     * Clears all items from the customer's cart.
     * @param tenantDbName The name of the tenant's database.
     * @param customerId The ID of the customer.
     * @returns The updated customer document, or null if customer not found.
     */
    public async clearCart(
        tenantDbName: string,
        customerId: string
    ): Promise<ICustomer | null> {
        try {
            const TenantCustomer = this.getTenantCustomerModel(tenantDbName);

            const customer = await TenantCustomer.findByIdAndUpdate(
                customerId,
                { $set: { cart: [] } }, // Set the cart array to empty
                { new: true }
            );

            return customer;

        } catch (error: any) {
            console.error(`{CartService -> clearCart} Error clearing cart for tenant ${tenantDbName}:`, error);
            throw new Error(`Failed to clear cart: ${error.message}`);
        }
    }

}

export default new CartService(); // Export an instance of the CartService