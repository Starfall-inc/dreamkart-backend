import mongoose from 'mongoose';
import { getTenantDb } from '../../connection/tenantDb'; // Our correct tenant DB getter

// Import the actual Mongoose Models and their Schemas
import Customer, { ICustomer } from '../../model/application/customer.model';
import Product, { IProduct } from '../../model/application/product.model';
import { IOrder, IOrderItem, IShippingAddress, OrderSchema } from '../../model/application/order.model'; // Import OrderSchema
import { ICartItem } from '../../model/application/customer.model'; // Assuming cart items are within customer model
// Import Customer and Product directly for their schemas for model registration
import CustomerModelBase from '../../model/application/customer.model'; // Base for Customer.schema
import ProductModelBase from '../../model/application/product.model';   // Base for Product.schema

// Re-using the PopulatedCartItem type from CartService for consistency in `createOrder`
type PopulatedCartItem = Omit<ICartItem, 'productId'> & {
    productId: IProduct;
    productDetails?: {
        _id: mongoose.Types.ObjectId;
        sku: string;
        name: string;
        price: number;
        image: string[];
        description: string;
    };
};

class OrderService {

    /**
     * Helper method to get the correct Customer Model for a given tenant.
     * Aligns with CustomerService's pattern.
     * @param tenantDbName The name of the tenant's database.
     * @returns The Mongoose Model for Customer specific to this tenant's database.
     */
    private getTenantCustomerModel(tenantDbName: string): mongoose.Model<ICustomer> {
        const tenantDb: mongoose.Connection = getTenantDb(tenantDbName);
        if (tenantDb.models.Customer) {
            return tenantDb.models.Customer as mongoose.Model<ICustomer>;
        }
        return tenantDb.model<ICustomer>('Customer', CustomerModelBase.schema);
    }

    /**
     * Helper method to get the correct Product Model for a given tenant.
     * @param tenantDbName The name of the tenant's database.
     * @returns The Mongoose Model for Product specific to this tenant's database.
     */
    private getTenantProductModel(tenantDbName: string): mongoose.Model<IProduct> {
        const tenantDb: mongoose.Connection = getTenantDb(tenantDbName);
        if (tenantDb.models.Product) {
            return tenantDb.models.Product as mongoose.Model<IProduct>;
        }
        return tenantDb.model<IProduct>('Product', ProductModelBase.schema);
    }

    /**
     * Helper method to get the correct Order Model for a given tenant.
     * @param tenantDbName The name of the tenant's database.
     * @returns The Mongoose Model for Order specific to this tenant's database.
     */
    private getTenantOrderModel(tenantDbName: string): mongoose.Model<IOrder> {
        const tenantDb: mongoose.Connection = getTenantDb(tenantDbName);
        if (tenantDb.models.Order) {
            return tenantDb.models.Order as mongoose.Model<IOrder>;
        }
        return tenantDb.model<IOrder>('Order', OrderSchema); // ✨ Pass OrderSchema here! ✨
    }

    /**
     * Creates a new order from the customer's current cart.
     * Clears the customer's cart after successful order creation.
     * @param tenantDbName The name of the tenant's database.
     * @param customerId The ID of the customer placing the order.
     * @param shippingAddress The shipping address for the order.
     * @param contactPhone The contact phone number for the order.
     * @returns The newly created Order document.
     */
     // --- Core logic for creating an order within a transaction ---
    // This private method contains all the operations that need to be part of the retryable transaction.
    private async _createOrderTransaction(
        session: mongoose.ClientSession, // Important: accept the session as an argument
        tenantDbName: string,
        customerId: string,
        shippingAddress: IShippingAddress,
        contactPhone: string
    ): Promise<IOrder> {
        const Customer = this.getTenantCustomerModel(tenantDbName);
        const Product = this.getTenantProductModel(tenantDbName);
        const Order = this.getTenantOrderModel(tenantDbName);

        // 1. Fetch the customer
        const customer = await Customer.findById(new mongoose.Types.ObjectId(customerId)).session(session);
        if (!customer) {
            throw new Error('Customer not found! 🥺');
        }

        // 2. Fetch the customer's cart (from the customer document itself)
        const customerCartItems: (ICartItem & { productId: mongoose.Types.ObjectId })[] = customer.cart as (ICartItem & { productId: mongoose.Types.ObjectId })[];

        if (!customerCartItems || customerCartItems.length === 0) {
            throw new Error('Your cart is empty, darling! Please add items before placing an order! 💖');
        }

        // 3. Prepare order items with current product details (price, name, etc.)
        const orderItems: IOrderItem[] = [];
        let totalAmount: number = 0;

        for (const cartItem of customerCartItems) {
            const product = await Product.findById(new mongoose.Types.ObjectId(cartItem.productId)).session(session);

            if (!product) {
                throw new Error(`Product with ID ${cartItem.productId} not found! It might have been removed or is unavailable. 😔`);
            }

            if (product.stock < cartItem.quantity) {
                throw new Error(`Not enough stock for ${product.name}! Only ${product.stock} available. 😞`);
            }

            const orderItem: IOrderItem = {
                productId: product._id,
                name: product.name,
                sku: product.sku,
                image: product.image[0] || 'default-image-url.jpg',
                price: product.price,
                quantity: cartItem.quantity
            } as IOrderItem;

            orderItems.push(orderItem);
            totalAmount += product.price * cartItem.quantity;

            product.stock -= cartItem.quantity;
            await product.save({ session });
        }

        // 4. Validate shipping information
        if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode || !contactPhone) {
            throw new Error('Shipping address and contact phone are required! Please fill in all details, honey! 🧐');
        }

        // 5. Create the new order
        const newOrder = new Order({
            customerId: new mongoose.Types.ObjectId(customerId),
            orderItems: orderItems,
            totalAmount: totalAmount,
            shippingAddress: shippingAddress,
            contactPhone: contactPhone,
            isPaid: false,
            status: 'pending'
        });

        const createdOrder = await newOrder.save({ session });

        // 6. Add order to customer's order history
        customer.orderHistory.push(createdOrder._id);
        // 7. Clear the customer's cart
        customer.cart = [];
        await customer.save({ session });

        return createdOrder; // Return the order from this internal transaction function
    }

    // --- Public method to create an order with retry logic ---
    public async createOrder(
        tenantDbName: string,
        customerId: string,
        shippingAddress: IShippingAddress,
        contactPhone: string
    ): Promise<IOrder | null> {
        const maxRetries = 5;       // Maximum number of times to retry the transaction
        const initialDelayMs = 50;  // Initial delay before first retry (will increase exponentially)

        for (let i = 0; i < maxRetries; i++) {
            const session = await mongoose.startSession();
            session.startTransaction(); // Start a new transaction for each retry attempt

            try {
                // Execute the core transaction logic (all operations)
                const createdOrder = await this._createOrderTransaction(
                    session, tenantDbName, customerId, shippingAddress, contactPhone
                );

                await session.commitTransaction(); // Attempt to commit the transaction
                console.log(`Order ${createdOrder._id} created and cart cleared for customer ${customerId} in tenant ${tenantDbName}. 🎉`);
                return createdOrder; // Success! Return the created order

            } catch (error: any) {
                // If the session is still active (not committed/aborted by the previous line), abort it
                if (session.inTransaction()) {
                    await session.abortTransaction();
                    console.log(`Transaction aborted for customer ${customerId} in tenant ${tenantDbName}. ↩️`);
                }

                // Check if it's a TransientTransactionError and if we have retries left
                if (error.errorLabels && error.errorLabels.includes('TransientTransactionError') && i < maxRetries - 1) {
                    console.warn(`TransientTransactionError detected, retrying order creation... (${i + 1}/${maxRetries}) 🔄`);
                    // Implement exponential backoff for retries
                    await new Promise(resolve => setTimeout(resolve, initialDelayMs * Math.pow(2, i))); // Delay before next retry
                    continue; // Continue to the next loop iteration (retry)
                } else {
                    // If it's not a transient error or max retries reached, re-throw the error
                    console.error(`Failed to create order for customer ${customerId} in tenant ${tenantDbName}: 😭`, error);
                    // Propagate specific, user-friendly errors to the API route
                    if (error.message.includes('Customer not found') ||
                        error.message.includes('cart is empty') ||
                        error.message.includes('Product with ID') ||
                        error.message.includes('Not enough stock') ||
                        error.message.includes('Shipping address and contact phone are required')) {
                        throw error;
                    }
                    // For any other unexpected errors, provide a generic message
                    throw new Error(`Failed to place order: ${error.message}`);
                }
            } finally {
                // Always end the session, regardless of success or failure or retry
                session.endSession();
                console.log(`Mongoose session ended for customer ${customerId} in tenant ${tenantDbName}. 👋`);
            }
        }
        // If the loop finishes without returning (meaning all retries failed)
        console.error(`Order creation failed after ${maxRetries} retries for customer ${customerId} in tenant ${tenantDbName}. 😔`);
        throw new Error('Order creation failed after multiple retries due to concurrent modifications. Please try again later.');
    }


    /**
     * Retrieves a specific order by its ID for a given customer.
     * @param tenantDbName The name of the tenant's database.
     * @param customerId The ID of the customer.
     * @param orderId The ID of the order to retrieve.
     * @returns The requested Order document, or null if not found/doesn't belong to customer.
     */
    public async getOrderById(
        tenantDbName: string,
        customerId: string,
        orderId: string
    ): Promise<IOrder | null> {
        try {
            const Order = this.getTenantOrderModel(tenantDbName); // Use tenant-specific model
            const Product = this.getTenantProductModel(tenantDbName); // For populate model reference

            const order = await Order.findOne({ _id: orderId, customerId: customerId })
                .populate({
                    path: 'orderItems.productId',
                    model: Product, // Use tenant-specific Product model for population
                    select: 'name price image sku description' // Select specific fields from the Product
                })
                .exec();

            if (!order) {
                console.log(`Order ${orderId} not found or does not belong to customer ${customerId}. 🧐`);
                return null;
            }
            return order;
        } catch (error: any) {
            console.error(`Error fetching order ${orderId} for customer ${customerId}:`, error);
            throw new Error(`Failed to retrieve order: ${error.message}`);
        }
    }

    /**
     * Retrieves all orders for a specific customer.
     * @param tenantDbName The name of the tenant's database.
     * @param customerId The ID of the customer.
     * @returns An array of Order documents.
     */
    public async getCustomerOrders(
        tenantDbName: string,
        customerId: string
    ): Promise<IOrder[]> {
        try {
            const Order = this.getTenantOrderModel(tenantDbName); // Use tenant-specific model
            const Product = this.getTenantProductModel(tenantDbName); // For populate model reference

            const orders = await Order.find({ customerId: customerId })
                .populate({
                    path: 'orderItems.productId',
                    model: Product, // Use tenant-specific Product model for population
                    select: 'name price image sku description'
                })
                .sort({ createdAt: -1 })
                .exec();

            return orders;
        } catch (error: any) {
            console.error(`Error fetching orders for customer ${customerId}:`, error);
            throw new Error(`Failed to retrieve customer orders: ${error.message}`);
        }
    }

    /**
     * Updates the status of an order (Admin use).
     * @param tenantDbName The name of the tenant's database.
     * @param orderId The ID of the order to update.
     * @param newStatus The new status for the order.
     * @returns The updated Order document, or null if not found.
     */
    public async updateOrderStatus(
        tenantDbName: string,
        orderId: string,
        newStatus: string
    ): Promise<IOrder | null> {
        try {
            const Order = this.getTenantOrderModel(tenantDbName); // Use tenant-specific model
            const Product = this.getTenantProductModel(tenantDbName); // For populate model reference

            const allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
            if (!allowedStatuses.includes(newStatus)) {
                throw new Error(`Invalid order status: ${newStatus}. Allowed statuses are: ${allowedStatuses.join(', ')}.`);
            }

            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                { status: newStatus },
                { new: true, runValidators: true }
            ).populate({
                path: 'orderItems.productId',
                model: Product,
                select: 'name price image sku description'
            });

            if (!updatedOrder) {
                console.log(`Order ${orderId} not found for status update.`);
                return null;
            }
            return updatedOrder;
        } catch (error: any) {
            console.error(`Error updating status for order ${orderId}:`, error);
            throw new Error(`Failed to update order status: ${error.message}`);
        }
    }

    /**
     * Cancels an order (Customer or Admin).  Can add authorization checks in the route layer.
     * @param tenantDbName The name of the tenant's database.
     * @param orderId The ID of the order to cancel.
     * @returns The cancelled Order document, or null if not found.
     */
    public async cancelOrder(
        tenantDbName: string,
        orderId: string
    ): Promise<IOrder | null> {
        try {
            const Order = this.getTenantOrderModel(tenantDbName); // Use tenant-specific model
            const Product = this.getTenantProductModel(tenantDbName); // For stock refund and populate

            const cancelledOrder = await Order.findByIdAndUpdate(
                orderId,
                { status: 'cancelled' },
                { new: true, runValidators: true }
            ).populate({
                path: 'orderItems.productId',
                model: Product,
                select: 'name price image sku description'
            });

            if (cancelledOrder) {
                // Refund stock for cancelled items
                for (const item of cancelledOrder.orderItems) {
                    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
                }
            }
            return cancelledOrder;
        } catch (error: any) {
            console.error(`Error cancelling order ${orderId}:`, error);
            throw new Error(`Failed to cancel order: ${error.message}`);
        }
    }

    /**
     * Retrieves the order history for a specific customer.  This is similar to getCustomerOrders.
     * @param tenantDbName The name of the tenant's database.
     * @param customerId The ID of the customer.
     * @returns An array of Order documents, sorted by most recent first.
     */
    public async getOrderHistory(
        tenantDbName: string,
        customerId: string
    ): Promise<IOrder[]> {
        return this.getCustomerOrders(tenantDbName, customerId); // Re-use getCustomerOrders
    }
}

export default new OrderService();