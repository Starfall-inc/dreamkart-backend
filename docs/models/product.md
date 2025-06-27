# Product Model

This model defines the structure for products available within a tenant's application.

## Interface: `IProduct`

```typescript
interface IProduct extends Document {
    sku: string;
    name: string;
    price: number;
    stock: number;
    image: string[];
    category: Schema.Types.ObjectId | ICategory;
    description: string;
    attributes?: Record<string, any>;
}
```

## Schema Fields

*   **`sku`**: (String, Required, Unique) The Stock Keeping Unit, a unique identifier for the product.
*   **`name`**: (String, Required) The name of the product.
*   **`price`**: (Number, Required, Min: 0) The price of the product.
*   **`stock`**: (Number, Required, Min: 0, Default: 0) The quantity of this product currently in stock.
*   **`image`**: (Array of Strings, Default: `[]`) An array of image URLs for the product.
*   **`category`**: (ObjectId, Required, Ref: `Category`) A reference to the category the product belongs to.
*   **`description`**: (String, Required) A detailed description of the product.
*   **`attributes`**: (Mixed, Optional, Default: `{}`) A flexible object to store additional product attributes (e.g., color, size).

## Usage

The `Product` model is used to manage and retrieve product information. It includes timestamps for `createdAt` and `updatedAt` to track creation and modification times.
