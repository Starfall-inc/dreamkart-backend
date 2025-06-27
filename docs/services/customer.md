# Customer Service

This service handles customer-related operations within a multi-tenant application, including creation, authentication, retrieval, updates, and deletion of customer accounts.

## Helper Methods

*   **`getTenantCustomerModel(tenantDbName: string)`**:
    Retrieves the Mongoose `Customer` model specific to the given tenant's database connection.

## Public Methods

*   **`createCustomer(tenantDbName: string, customerData: Partial<ICustomer>): Promise<ICustomer>`**:
    Creates a new customer account for a specified tenant. Ensures email uniqueness and handles validation errors.

*   **`loginCustomer(tenantDbName: string, email: string, password: string): Promise<ICustomer | null>`**:
    Authenticates a customer for a specified tenant using their email and password. Updates `lastLoginAt` on successful login. Returns `null` if authentication fails or the customer is inactive.

*   **`getCustomerById(tenantDbName: string, customerId: string): Promise<ICustomer | null>`**:
    Retrieves a customer by their ID for a specified tenant. Returns `null` if not found.

*   **`updateCustomer(tenantDbName: string, customerId: string, updateData: Partial<ICustomer>): Promise<ICustomer | null>`**:
    Updates the data of an existing customer for a specified tenant. Returns `null` if the customer is not found.

*   **`deleteCustomer(tenantDbName: string, customerId: string): Promise<ICustomer | null>`**:
    Deletes a customer account for a specified tenant. Returns `null` if the customer is not found.

## Usage

This service is instantiated and exported as a singleton. It is used by authentication and customer management routes to interact with customer data, ensuring operations are isolated to the correct tenant database.
