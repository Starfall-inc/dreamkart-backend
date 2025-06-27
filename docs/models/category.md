# Category Model

This model defines the structure for product categories within the application.

## Interface: `ICategory`

```typescript
export interface ICategory extends Document {
    name: string;
    slug: string;
    images: string[];
    description: string;
}
```

## Schema Fields

*   **`name`**: (String, Required) The name of the category.
*   **`slug`**: (String, Required, Unique) A URL-friendly, unique identifier for the category.
*   **`images`**: (Array of Strings) An array of image URLs associated with the category.
*   **`description`**: (String) A detailed description of the category.

## Usage

The `Category` model is used to manage and retrieve product categories. It includes timestamps for `createdAt` and `updatedAt` to track creation and modification times.
