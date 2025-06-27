# Tenant Service

This service is responsible for managing tenant accounts on the Dreamkart platform. It handles the creation, retrieval, updating, and deletion of tenant records, including the programmatic creation and dropping of their dedicated MongoDB databases and initial user setup.

## Public Methods

*   **`getTenants(): Promise<ITenant[]>`**:
    Retrieves all tenant records from the platform database.

*   **`getTenantById(id: string): Promise<ITenant>`**:
    Retrieves a single tenant record by its ID from the platform database. Throws an error if the tenant is not found.

*   **`createTenant(tenantData: { name: string; ownerId: mongoose.Types.ObjectId; email: string; plan?: 'free' | 'basic' | 'premium' | 'enterprise'; settings?: Record<string, any>; }, initialTenantUser: { email: string; password: string; name: string; }): Promise<ITenant>`**:
    Creates a new tenant record in the platform database, programmatically creates a dedicated MongoDB database for the tenant, initializes essential collections (e.g., `Category`, `Product`), and creates the initial owner user within the new tenant's database. Includes rollback logic if any step fails.

*   **`updateTenant(id: string, updateData: Partial<ITenant>): Promise<ITenant>`**:
    Updates an existing tenant's details in the platform database. Prevents direct updates to `databaseName` and `_id`.

*   **`deleteTenant(id: string): Promise<void>`**:
    Deletes a tenant record from the platform database and *drops their dedicated MongoDB database*. This is a destructive operation and should be used with extreme caution.

*   **`tenantExists(id: string): Promise<boolean>`**:
    Checks if a tenant exists by their ID.

*   **`tenantExistsByDatabaseName(databaseName: string): Promise<boolean>`**:
    Checks if a tenant exists by their dedicated database name.

*   **`tenantExistsBySlug(slug: string): Promise<boolean>`**:
    Checks if a tenant exists by their slug.

*   **`getTenantBySlug(slug: string): Promise<ITenant | null>`**:
    Retrieves a tenant by their slug. Returns `null` if not found.

*   **`getTenantUnderPlatformUser(param: mongoose.Types.ObjectId | string | { email: string }): Promise<ITenant[]>`**:
    Retrieves all tenants associated with a given platform user, identified by their ID (as `ObjectId` or string) or email address.

## Usage

This service is instantiated and exported as a singleton. It is critical for the multi-tenancy architecture, handling the lifecycle of tenant stores from creation to deletion, and ensuring proper database isolation and initialization.
