# Platform User Model

This model defines the structure for users who interact with the Dreamkart platform itself (e.g., administrators, tenant owners, API users, support staff), distinct from the users within individual tenant applications.

## Interface: `IPlatformUser`

```typescript
export interface IPlatformUser extends Document {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    role: 'platform_admin' | 'tenant_owner' | 'api_user' | 'support';
    status: 'active' | 'pending_email_verification' | 'disabled';
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    comparePassword(candidatePassword: string): Promise<boolean>;
}
```

## Interface: `IPlatformUserResponse`

```typescript
export interface IPlatformUserResponse {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'platform_admin' | 'tenant_owner' | 'api_user' | 'support';
    status: 'active' | 'pending_email_verification' | 'disabled';
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
```

## Schema Fields

*   **`email`**: (String, Required, Unique) The platform user's email address.
*   **`passwordHash`**: (String, Required) The hashed password for the platform user's account.
*   **`firstName`**: (String, Optional) The platform user's first name.
*   **`lastName`**: (String, Optional) The platform user's last name.
*   **`role`**: (String, Enum: `platform_admin`, `tenant_owner`, `api_user`, `support`, Required, Default: `tenant_owner`) The role of the user on the platform, determining their access level.
*   **`status`**: (String, Enum: `active`, `pending_email_verification`, `disabled`, Default: `pending_email_verification`) The current status of the platform user's account.
*   **`lastLoginAt`**: (Date, Optional) Timestamp of the platform user's last login.
*   **`plan`**: (String, Enum: `free`, `basic`, `premium`, `enterprise`, Required, Default: `free`) The subscription plan associated with this platform user.

## Methods

*   **`comparePassword(candidatePassword: string): Promise<boolean>`**: Compares a given password with the stored hashed password.

## Hooks

*   **`pre('save')`**: Hashes the `passwordHash` field using `bcryptjs` before saving the document if the password has been modified.

## Usage

The `PlatformUser` model is used for managing user accounts at the platform level, including authentication, authorization, and tracking subscription plans. It includes timestamps for `createdAt` and `updatedAt`.
