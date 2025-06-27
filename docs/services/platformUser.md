# Platform User Service

This service manages user accounts for the Dreamkart platform itself (e.g., platform administrators, tenant owners). It handles user registration, finding users by email or ID, and password comparison.

## Public Methods

*   **`registerUser(userData: Partial<IPlatformUser>): Promise<IPlatformUserResponse>`**:
    Registers a new platform user. The `passwordHash` provided in `userData` will be automatically hashed by the `PlatformUser` model's pre-save hook. Returns the newly created user document, excluding the `passwordHash` for security.

*   **`findByEmail(email: string): Promise<IPlatformUser | null>`**:
    Finds a platform user by their email address. Returns the full Mongoose document (including `passwordHash`) if found, otherwise `null`. This method is intended for internal service logic where the password hash might be needed for authentication.

*   **`findById(userId: string): Promise<IPlatformUser | null>`**:
    Finds a platform user by their ID. Returns the full Mongoose document if found, otherwise `null`. This is also for internal service logic.

*   **`comparePassword(candidatePassword: string, storedHash: string): Promise<boolean>`**:
    Compares a plain-text `candidatePassword` with a stored hashed password (`storedHash`) using `bcryptjs`. Returns `true` if they match, `false` otherwise.

## Usage

This service is instantiated and exported as a singleton. It is used by platform-level authentication and user management modules to interact with platform user data, distinct from tenant-specific user data.
