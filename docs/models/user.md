# User Model (Tenant Application)

This model defines the structure for staff/management user accounts within a specific tenant's application. These users manage the tenant's store.

## Interface: `IUser`

```typescript
interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    role: 'owner' | 'admin' | 'manager' | 'employee';
    isActive: boolean;
    lastLoginAt?: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
```

## Schema Fields

*   **`email`**: (String, Required, Unique) The user's email address, unique within the tenant's database.
*   **`password`**: (String, Required) The hashed password for the user's account.
*   **`name`**: (String, Required) The full name of the user.
*   **`role`**: (String, Enum: `owner`, `admin`, `manager`, `employee`, Default: `employee`) The role of the user within the tenant's shop, determining their permissions.
*   **`isActive`**: (Boolean, Default: `true`) Indicates if the user account is active.
*   **`lastLoginAt`**: (Date, Optional) Timestamp of the user's last login.

## Methods

*   **`comparePassword(candidatePassword: string): Promise<boolean>`**: Compares a given password with the stored hashed password.

## Hooks

*   **`pre('save')`**: Hashes the `password` field using `bcryptjs` before saving the document if the password has been modified.

## Usage

The `User` model is used for authentication and authorization of staff members within each tenant's dedicated application. It ensures secure password storage and role-based access control.
