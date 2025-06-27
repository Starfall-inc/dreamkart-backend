# Tenant Model

This model defines the structure for individual tenant accounts on the platform. Each tenant represents a separate e-commerce store with its own dedicated database.

## Interface: `ITenant`

```typescript
export interface ITenant extends Document {
    name: string;
    slug: string;
    ownerId: Schema.Types.ObjectId;
    email: string;
    status: 'active' | 'pending' | 'suspended' | 'inactive';
    databaseName: string;
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    settings: Record<string, any>;
    theme: string;
    themeSettings: Record<string, string>;
}
```

## Schema Fields

*   **`name`**: (String, Required, Unique) The name of the tenant's store.
*   **`slug`**: (String, Unique) A URL-friendly identifier for the tenant, automatically generated from the name.
*   **`ownerId`**: (ObjectId, Required, Ref: `User`) Reference to the platform user who owns this tenant account.
*   **`email`**: (String, Required, Unique) The contact email for the tenant.
*   **`status`**: (String, Enum: `active`, `pending`, `suspended`, `inactive`, Default: `pending`) The current operational status of the tenant's store.
*   **`databaseName`**: (String, Unique) The unique name of this tenant's dedicated MongoDB database, automatically generated.
*   **`plan`**: (String, Enum: `free`, `basic`, `premium`, `enterprise`, Default: `free`) The subscription plan the tenant is currently on.
*   **`settings`**: (Object, Default: `{}`) A flexible object to store various tenant-specific settings.
*   **`theme`**: (String, Default: `sakurapink`) The name of the theme currently applied to the tenant's store.
*   **`themeSettings`**: (Map of Strings, Default: `{}`) A map to store specific settings for the chosen theme.

## Hooks

*   **`pre('save')`**:
    *   Generates a `slug` from the `name` if the name is new or has been modified.
    *   Generates a unique `databaseName` for new tenants if not already set, combining the slug with a partial `ObjectId` for uniqueness.

## Usage

The `Tenant` model is fundamental to the multi-tenancy architecture, enabling the platform to manage multiple independent e-commerce stores. It handles the creation of unique identifiers for each tenant and their respective databases. It includes timestamps for `createdAt` and `updatedAt`.
