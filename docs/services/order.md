# Order Service

This service manages order-related operations within a multi-tenant application, including creating orders from a customer's cart, retrieving orders, and updating order statuses. It incorporates transaction and retry logic for robust order creation.

## Helper Methods

*   **`getTenantCustomerModel(tenantDbName: string): mongoose.Model<ICustomer>`**:
    Retrieves the Mongoose `Customer` model specific to the given tenant's database connection.

*   **`getTenantProductModel(tenantDbName: string): mongoose.Model<IProduct>`**:
    Retrieves the Mongoose `Product` model specific to the given tenant's database connection.

*   **`getTenantOrderModel(tenantDbName: string): mongoose.Model<IOrder>`**:
    Retrieves the Mongoose `Order` model specific to the given tenant's database connection.

*   **`_createOrderTransaction(session: mongoose.ClientSession, tenantDbName: string, customerId: string, shippingAddress: IShippingAddress, contactPhone: string): Promise<IOrder>`**:
    (Private) Contains the core logic for creating an order within a MongoDB transaction. It fetches customer and product data, checks stock, creates the order, updates product stock, adds the order to customer history, and clears the cart. Throws errors for insufficient stock, missing products, or invalid shipping information.

## Public Methods

*   **`createOrder(tenantDbName: string, customerId: string, shippingAddress: IShippingAddress, contactPhone: string): Promise<IOrder | null>`**:
    Initiates the order creation process, wrapping the `_createOrderTransaction` in retry logic with exponential backoff to handle `TransientTransactionError`s. Returns the created order or `null` if creation fails after retries.

*   **`getOrderById(tenantDbName: string, customerId: string, orderId: string): Promise<IOrder | null>`**:
    Retrieves a specific order by its ID for a given customer, populating product details within the order items. Returns `null` if the order is not found or does not belong to the customer.

*   **`getCustomerOrders(tenantDbName: string, customerId: string): Promise<IOrder[]>`**:
    Retrieves all orders for a specific customer, populating product details and sorting by creation date (newest first).

*   **`updateOrderStatus(tenantDbName: string, orderId: string, newStatus: string): Promise<IOrder | null>`**:
    Updates the status of an order. Validates the `newStatus` against a predefined list of allowed statuses. Returns `null` if the order is not found.

*   **`cancelOrder(tenantDbName: string, orderId: string): Promise<IOrder | null>`**:
    Cancels an order and refunds the stock for the items in the order. Returns `null` if the order is not found.

*   **`getOrderHistory(tenantDbName: string, customerId: string): Promise<IOrder[]>`**:
    Retrieves the order history for a specific customer (re-uses `getCustomerOrders`).

## Usage

This service is instantiated and exported as a singleton. It is used by controllers to handle complex order workflows, ensuring data consistency through transactions and providing robust error handling for multi-tenant environments.
