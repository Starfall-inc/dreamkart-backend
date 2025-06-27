# Audit Log Model

This model defines the structure for audit logs on the platform, tracking significant actions performed by platform users.

## Interface: `IAuditLog`

```typescript
export interface IAuditLog extends Document {
    userId: Schema.Types.ObjectId;
    action: string;
    targetId?: Schema.Types.ObjectId | string;
    targetCollection?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
```

## Schema Fields

*   **`userId`**: (ObjectId, Required, Ref: `User`) The ID of the platform user who performed the action.
*   **`action`**: (String, Required) A description of the action performed (e.g., "user_login", "tenant_created").
*   **`targetId`**: (ObjectId or String, Optional) The ID of the resource affected by the action (e.g., a tenant ID).
*   **`targetCollection`**: (String, Optional) The name of the collection to which the `targetId` belongs (e.g., 'Tenants', 'Users').
*   **`details`**: (Object, Optional) A flexible object to store additional context about the action (e.g., IP address, changes made).
*   **`ipAddress`**: (String, Optional) The IP address from which the action originated.
*   **`userAgent`**: (String, Optional) The User-Agent string from the request.

## Usage

The `AuditLog` model is used to maintain a record of important events and user activities on the platform for security, compliance, and debugging purposes. It automatically records the `createdAt` timestamp.
