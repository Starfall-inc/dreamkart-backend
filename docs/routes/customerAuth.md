# Customer Auth Routes

This module defines API routes for customer authentication (login and registration) within a multi-tenant application. These routes are publicly accessible but operate within the context of a specific tenant, determined by the `tenantResolver` middleware.

## Routes

*   **`POST /login`**:
    *   **Description**: Authenticates a customer and returns a JWT token upon successful login.
    *   **Access**: Public (tenant-aware).
    *   **Request Body**: 
        ```json
        {
            "email": "customer@example.com",
            "password": "customerpassword"
        }
        ```
    *   **Responses**:
        *   `200 OK`: Customer logged in successfully, returns JWT.
        *   `401 Unauthorized`: Invalid credentials or account not active.
        *   `500 Internal Server Error`: Failed to login customer.

*   **`POST /register`**:
    *   **Description**: Registers a new customer account for a specific tenant and automatically logs them in, returning a JWT.
    *   **Access**: Public (tenant-aware).
    *   **Request Body**: 
        ```json
        {
            "email": "newcustomer@example.com",
            "password": "newpassword",
            "firstName": "John",
            "lastName": "Doe"
        }
        ```
    *   **Responses**:
        *   `200 OK`: Customer registered and logged in successfully, returns JWT.
        *   `409 Conflict`: A customer with the provided email already exists.
        *   `400 Bad Request`: Validation failed due to invalid data (e.g., missing email/password).
        *   `500 Internal Server Error`: Failed to register or login customer.

## Middleware

*   `tenantResolver`: (Applied globally) Ensures `res.locals.tenantDbName` is available, determining the correct tenant database context.

## Dependencies

*   `CustomerService`: Provides business logic for customer creation and authentication.
*   `signJwt`: Utility for generating JWTs.

## Usage

These routes are typically mounted under a tenant-specific prefix (e.g., `/api/tenant/customer/auth`). They provide the entry points for customers to access their respective tenant stores.
