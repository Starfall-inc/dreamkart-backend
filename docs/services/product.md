# Product Service

This service manages product-related operations within a multi-tenant application. It provides methods for retrieving, creating, updating, searching, and deleting products, ensuring all operations are performed on the correct tenant-specific database.

## Helper Methods

*   **`getTenantProductModel(tenantDbName: string)`**:
    Retrieves the Mongoose `Product` model specific to the given tenant's database connection. This is essential for multi-tenancy.

*   **`getTenantCategoryModel(tenantDbName: string)`**:
    Retrieves the Mongoose `Category` model specific to the given tenant's database connection, used for populating category details in product queries.

## Public Methods

*   **`getAllProducts(tenantDbName: string): Promise<IProduct[]>`**:
    Retrieves all products for a specified tenant, populating their associated category details.

*   **`getProductBySku(tenantDbName: string, sku: string): Promise<IProduct | null>`**:
    Retrieves a single product by its SKU for a specified tenant, populating category details. Returns `null` if not found.

*   **`getProductbyCategory(tenantDbName: string, categoryId: string): Promise<IProduct[]>`**:
    Retrieves all products belonging to a specific category for a specified tenant, populating category details.

*   **`searchProducts(tenantDbName: string, query: string): Promise<IProduct[]>`**:
    Searches for products by name or description (case-insensitive regex) for a specified tenant, populating category details. Can also search specific attributes like color or size.

*   **`createProduct(tenantDbName: string, productData: Partial<IProduct>): Promise<IProduct>`**:
    Creates a new product for a specified tenant. Handles potential Mongoose validation or duplicate key errors.

*   **`updateProduct(tenantDbName: string, sku: string, productData: Partial<IProduct>): Promise<IProduct | null>`**:
    Updates an existing product identified by its SKU for a specified tenant. Throws an error if the product is not found.

*   **`deleteProduct(tenantDbName: string, sku: string): Promise<IProduct | null>`**:
    Deletes a product identified by its SKU for a specified tenant. Throws an error if the product is not found.

## Usage

This service is instantiated and exported as a singleton. It is used by controllers to perform various product management tasks, always ensuring that operations are isolated to the correct tenant database.
