# Category Service

This service provides methods for managing product categories within a multi-tenant application. It ensures that category operations are performed on the correct tenant-specific database.

## Helper Methods

*   **`getTenantCategoryModel(tenantDbName: string)`**:
    Retrieves the Mongoose `Category` model specific to the given tenant's database connection. This is crucial for multi-tenancy.

## Public Methods

*   **`getCategories(tenantDbName: string): Promise<ICategory[]>`**:
    Retrieves all categories for a specified tenant.

*   **`getCategoryBySlug(tenantDbName: string, slug: string): Promise<ICategory | null>`**:
    Retrieves a single category by its slug for a specified tenant. Returns `null` if not found.

*   **`getCategoryById(tenantDbName: string, id: string): Promise<ICategory>`**:
    Retrieves a single category by its ID for a specified tenant. Throws an error if the category is not found.

*   **`createCategory(tenantDbName: string, categoryData: { name: string; slug: string; images?: string[]; description?: string }): Promise<ICategory>`**:
    Creates a new category for a specified tenant.

*   **`getAllCategories(tenantDbName: string): Promise<ICategory[]>`**:
    (Duplicate of `getCategories`) Retrieves all categories for a specified tenant.

*   **`updateCategory(tenantDbName: string, slug: string, updateData: Partial<ICategory>): Promise<ICategory>`**:
    Updates an existing category identified by its slug for a specified tenant. Throws an error if the category is not found.

*   **`deleteCategory(tenantDbName: string, slug: string): Promise<ICategory>`**:
    Deletes a category identified by its slug for a specified tenant. Throws an error if the category is not found.

## Usage

This service is instantiated and exported as a singleton. It should be used by controllers or other parts of the application that need to perform CRUD operations on product categories, always providing the `tenantDbName` to ensure data isolation.
