# Customer Routes

This module defines API routes for customer profile management within a multi-tenant application. These routes are primarily for authenticated customers to manage their own profiles.

## Routes

*   **`GET /profile`**:
    *   **Description**: Retrieves the authenticated customer's profile information.
    *   **Access**: Private (Customer JWT Required).
    *   **Responses**:
        *   `200 OK`: Returns the customer's profile data (sensitive fields like `password` are removed).
        *   `404 Not Found`: Customer profile not found.
        *   `500 Internal Server Error`: Failed to fetch customer profile.

*   **`PUT /profile`**:
    *   **Description**: Updates the authenticated customer's profile information.
    *   **Access**: Private (Customer JWT Required).
    *   **Request Body**: (Partial `ICustomer` object, `password` field is ignored) 
        ```json
        {
            "firstName": "Jane",
            "lastName": "Doe"
        }
        ```
    *   **Responses**:
        *   `200 OK`: Customer profile updated successfully.
        *   `400 Bad Request`: Validation failed.
        *   `404 Not Found`: Customer profile not found for update.
        *   `500 Internal Server Error`: Failed to update customer profile.

## Middleware

*   `authenticateCustomer`: Authenticates the customer using their JWT and attaches `req.tenantDbName` and `req.customer`.

## Dependencies

*   `CustomerService`: Provides business logic for customer operations.

## Usage

These routes are typically mounted under a tenant-specific prefix (e.g., `/api/tenant/customers`). They allow customers to view and update their personal details securely.
