# Order Model

This model defines the structure for customer orders within a tenant's application. It captures details about the ordered items, total amount, shipping information, and order status.

## Interface: `IOrderItem`

```typescript
export interface IOrderItem extends Document {
    productId: mongoose.Types.ObjectId;
    name: string;
    sku: string;
    image: string;
    price: number;
    quantity: number;
}
```

## Interface: `IShippingAddress`

```typescript
export interface IShippingAddress {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}
```

## Interface: `IOrder`

```typescript
export interface IOrder extends Document {
    _id: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    orderItems: IOrderItem[];
    totalAmount: number;
    orderDate: Date;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
    shippingAddress: IShippingAddress;
    contactPhone: string;
    isPaid: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
```

## Schema Fields

*   **`customerId`**: (ObjectId, Required, Indexed) Reference to the `Customer` who placed the order.
*   **`orderItems`**: (Array of `IOrderItem`s, Required) An array of embedded documents detailing each product in the order, including:
    *   `productId`: (ObjectId, Required) Reference to the `Product` model.
    *   `name`: (String, Required) Name of the product at the time of order.
    *   `sku`: (String, Required) SKU of the product.
    *   `image`: (String, Required) Primary image URL of the product.
    *   `price`: (Number, Required) Price of the product at the time of order.
    *   `quantity`: (Number, Required, Min: 1) Quantity of the product ordered.
*   **`totalAmount`**: (Number, Required, Min: 0) The total monetary amount of the order.
*   **`orderDate`**: (Date, Default: `Date.now`) The date and time the order was placed.
*   **`status`**: (String, Enum: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`, `returned`, Default: `pending`) The current status of the order.
*   **`shippingAddress`**: (`IShippingAddress`, Required) An embedded document containing the shipping address details.
*   **`contactPhone`**: (String, Required) Contact phone number for the order.
*   **`isPaid`**: (Boolean, Default: `false`) Indicates if the order has been paid for.
*   **`notes`**: (String, Optional) Any additional notes for the order.

## Usage

The `Order` model is crucial for tracking customer purchases. It is designed to be used within a multi-tenant environment, where each tenant's orders are stored in their dedicated database. The schema includes timestamps for `createdAt` and `updatedAt`.
