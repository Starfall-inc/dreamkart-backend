# Subscription Plan Model

This model defines the structure for different subscription plans available on the platform.

## Interface: `ISubscriptionPlan`

```typescript
export interface ISubscriptionPlan extends Document {
    name: string;
    price: number;
    features: string[];
    storageLimitGB?: number;
    productLimit?: number;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
```

## Schema Fields

*   **`name`**: (String, Required, Unique) The name of the subscription plan (e.g., "Free", "Basic", "Premium").
*   **`price`**: (Number, Required, Min: 0) The monthly or annual price of the plan.
*   **`features`**: (Array of Strings) A list of features included in the plan.
*   **`storageLimitGB`**: (Number, Optional, Min: 0) The maximum storage limit in GB for tenants on this plan.
*   **`productLimit`**: (Number, Optional, Min: 0) The maximum number of products a tenant can have on this plan.
*   **`description`**: (String, Optional) A brief description of the plan.
*   **`isActive`**: (Boolean, Required, Default: `true`) Indicates whether this plan is currently active and available for subscription.

## Usage

The `SubscriptionPlan` model is used to define and manage the various tiers of service offered by the platform. It includes timestamps for `createdAt` and `updatedAt`.
