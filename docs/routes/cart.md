# Cart Routes

This module defines API routes for managing a customer's shopping cart within a multi-tenant application. All routes are protected by the `authenticateCustomer` middleware, ensuring operations are performed on behalf of an authenticated customer.

## Routes

*   **`GET /`**:
    *   **Description**: Retrieves the authenticated customer's cart with populated product details.
    *   **Access**: Private (Customer JWT Required).
    *   **Responses**:
        *   `200 OK`: Cart retrieved successfully (may return an empty array if the cart is empty).
        *   `500 Internal Server Error`: Failed to retrieve cart.

*   **`POST /items`**:
    *   **Description**: Adds a product to the authenticated customer's cart. If the product already exists, its quantity is incremented.
    *   **Access**: Private (Customer JWT Required).
    *   **Request Body**: 
        ```json
        {
            "productId": "<product_id>",
            "quantity": 1 
        }
        ```
    *   **Responses**:
        *   `200 OK`: Cart updated successfully.
        *   `400 Bad Request`: Product ID is missing.
        *   `404 Not Found`: Customer not found or product could not be added.
        *   `500 Internal Server Error`: Failed to add item to cart.

*   **`PUT /items/:productId`**:
    *   **Description**: Updates the quantity of a specific product in the authenticated customer's cart. If `quantity` is 0 or less, the item will be removed.
    *   **Access**: Private (Customer JWT Required).
    *   **URL Parameters**: `productId` (string) - The ID of the product to update.
    *   **Request Body**: 
        ```json
        {
            "quantity": 5 
        }
        ```
    *   **Responses**:
        *   `200 OK`: Cart item quantity updated.
        *   `400 Bad Request`: Invalid quantity provided.
        *   `404 Not Found`: Customer or cart item not found.
        *   `500 Internal Server Error`: Failed to update cart item quantity.

*   **`DELETE /items/:productId`**:
    *   **Description**: Removes a specific product from the authenticated customer's cart.
    *   **Access**: Private (Customer JWT Required).
    *   **URL Parameters**: `productId` (string) - The ID of the product to remove.
    *   **Responses**:
        *   `200 OK`: Product removed from cart.
        *   `404 Not Found`: Customer not found.
        *   `500 Internal Server Error`: Failed to remove item from cart.

*   **`DELETE /`**:
    *   **Description**: Clears all items from the authenticated customer's cart.
    *   **Access**: Private (Customer JWT Required).
    *   **Responses**:
        *   `200 OK`: Cart cleared successfully.
        *   `404 Not Found`: Customer not found.
        *   `500 Internal Server Error`: Failed to clear cart.

## Middleware

*   `authenticateCustomer`: Authenticates the customer using their JWT and attaches `req.tenantDbName` and `req.customer`.
*   `validateObjectId`: Validates `productId` in URL parameters as a valid MongoDB ObjectId.

## Dependencies

*   `CartService`: Provides business logic for cart operations.

## Usage

These routes are typically mounted under a tenant-specific prefix (e.g., `/api/tenant/cart`). They provide a comprehensive API for managing a customer's shopping cart.
