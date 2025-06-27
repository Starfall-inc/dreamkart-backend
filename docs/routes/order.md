# Order Routes

This module defines API routes for managing customer orders within a multi-tenant application. All customer-facing order routes require an authenticated customer's JWT token.

## Routes

*   **`POST /`**:
    *   **Description**: Allows an authenticated customer to place a new order from their current cart.
    *   **Access**: Private (Customer JWT Required).
    *   **Request Body**: 
        ```json
        {
            "shippingAddress": {
                "street": "123 Main St",
                "city": "Anytown",
                "state": "CA",
                "zipCode": "90210",
                "country": "USA"
            },
            "contactPhone": "555-123-4567"
        }
        ```
    *   **Responses**:
        *   `201 Created`: Order placed successfully, returns the new order document.
        *   `400 Bad Request`: Missing shipping address or contact phone.
        *   `500 Internal Server Error`: Failed to place order (e.g., insufficient stock, empty cart).

*   **`GET /`**:
    *   **Description**: Retrieves the order history for the authenticated customer.
    *   **Access**: Private (Customer JWT Required).
    *   **Responses**:
        *   `200 OK`: Returns an array of order documents.
        *   `500 Internal Server Error`: Failed to retrieve order history.

*   **`GET /:orderId`**:
    *   **Description**: Retrieves a specific order by its ID for the authenticated customer.
    *   **Access**: Private (Customer JWT Required).
    *   **URL Parameters**: `orderId` (string) - The ID of the order to retrieve.
    *   **Responses**:
        *   `200 OK`: Returns the requested order document.
        *   `404 Not Found`: Order not found or does not belong to the customer.
        *   `500 Internal Server Error`: Failed to retrieve order.

*   **`PUT /:orderId/cancel`**:
    *   **Description**: Allows an authenticated customer to cancel an order. Orders can only be cancelled if their status is 'pending' or 'confirmed'.
    *   **Access**: Private (Customer JWT Required).
    *   **URL Parameters**: `orderId` (string) - The ID of the order to cancel.
    *   **Responses**:
        *   `200 OK`: Order cancelled successfully, returns the updated order document.
        *   `400 Bad Request`: Order cannot be cancelled in its current status.
        *   `404 Not Found`: Order not found or does not belong to the customer.
        *   `500 Internal Server Error`: Failed to cancel order.

## Middleware

*   `authenticateCustomer`: Authenticates the customer using their JWT and attaches `req.tenantDbName` and `req.customer`.
*   `validateObjectId`: Validates `orderId` in URL parameters as a valid MongoDB ObjectId.

## Dependencies

*   `OrderService`: Provides business logic for order operations.

## Usage

These routes are typically mounted under a customer-specific prefix (e.g., `/api/customer/orders`). They provide the interface for customers to manage their purchases.
