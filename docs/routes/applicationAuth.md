# Application Auth Routes

This module defines authentication-related API routes for tenant-specific users (staff/management) within the application. It handles user login and token generation.

## Routes

*   **`POST /login`**:
    *   **Description**: Logs in a user for a specific tenant and returns a JSON Web Token (JWT).
    *   **Access**: Public (but requires `tenantDbName` from `res.locals`, populated by `tenantResolver` middleware).
    *   **Request Body**: 
        ```json
        {
            "email": "user@example.com",
            "password": "yourpassword"
        }
        ```
    *   **Responses**:
        *   `200 OK`: Login successful, returns JWT and user details.
        *   `400 Bad Request`: Missing email or password.
        *   `401 Unauthorized`: Invalid credentials (user not found or incorrect password).
        *   `500 Internal Server Error`: General server error.

## Middleware

*   `tenantResolver`: Ensures `res.locals.tenantDbName` is available, determining the correct tenant database context.

## Dependencies

*   `UserService`: For finding and authenticating tenant users.
*   `generateTenantToken`: Utility for creating tenant-specific JWTs.

## Usage

These routes are mounted under a tenant-specific prefix (e.g., `/api/tenant/:tenantSlug/auth`). The `tenantResolver` middleware is crucial for directing requests to the correct tenant database.
