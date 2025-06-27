# User Service (Tenant Application)

This service manages user accounts for staff/management within individual tenant applications. It provides methods for creating, finding, and authenticating these tenant-specific users.

## Helper Methods

*   **`getTenantUserModel(tenantDbName: string)`**:
    Retrieves the Mongoose `User` model specific to the given tenant's database connection. This ensures that user operations are performed on the correct tenant's database.

## Public Methods

*   **`createUser(tenantDbName: string, userData: Partial<IUser>): Promise<IUser>`**:
    Creates a new user account within a specified tenant's database. The password provided in `userData` will be hashed automatically by the model's pre-save hook.

*   **`findByEmail(tenantDbName: string, email: string): Promise<IUser | null>`**:
    Searches for a user by their email address within a specified tenant's database. Returns the user document if found, otherwise `null`.

*   **`findById(tenantDbName: string, userId: string): Promise<IUser | null>`**:
    Searches for a user by their ID within a specified tenant's database. Returns the user document if found, otherwise `null`.

## Usage

This service is instantiated and exported as a singleton. It is primarily used by authentication and user management modules that operate within the context of a specific tenant, ensuring data isolation and proper model instantiation.
