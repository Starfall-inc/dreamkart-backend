# Cart Service

This service manages shopping cart operations for customers within a multi-tenant application. It interacts with `Customer` and `Product` models to add, retrieve, update, and remove items from a customer's cart.

## Helper Methods

*   **`getTenantCustomerModel(tenantDbName: string): mongoose.Model<ICustomer>`**:
    Retrieves the Mongoose `Customer` model specific to the given tenant's database connection.

*   **`getTenantProductModel(tenantDbName: string): mongoose.Model<IProduct>`**:
    Retrieves the Mongoose `Product` model specific to the given tenant's database connection.

## Public Methods

*   **`addItemToCart(tenantDbName: string, customerId: string, productId: string, quantity: number = 1): Promise<ICustomer | null>`**:
    Adds a product to the customer's cart or updates its quantity if already present. Throws an error if the product or customer is not found.

*   **`getCart(tenantDbName: string, customerId: string): Promise<PopulatedCartItem[] | null>`**:
    Retrieves the customer's cart with populated product details. Returns `null` if the customer is not found.

*   **`updateCartItemQuantity(tenantDbName: string, customerId: string, productId: string, newQuantity: number): Promise<ICustomer | null>`**:
    Updates the quantity of a specific product in the customer's cart. If `newQuantity` is 0 or less, the item is removed. Returns `null` if the customer is not found.

*   **`removeItemFromCart(tenantDbName: string, customerId: string, productId: string): Promise<ICustomer | null>`**:
    Removes a specific product from the customer's cart. Returns `null` if the customer is not found.

*   **`clearCart(tenantDbName: string, customerId: string): Promise<ICustomer | null>`**:
    Clears all items from the customer's cart. Returns `null` if the customer is not found.

## Usage

This service is instantiated and exported as a singleton. It should be used by controllers or other services that need to interact with customer shopping carts, ensuring that operations are performed on the correct tenant database.
