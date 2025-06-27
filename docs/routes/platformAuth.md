# Platform Auth Routes

This module defines API routes for authentication of platform-level users (e.g., platform administrators, tenant owners). It handles user registration and login for access to the Dreamkart platform itself.

## Routes

*   **`POST /register`**:
    *   **Description**: Registers a new platform user (e.g., a new tenant owner).
    *   **Access**: Public.
    *   **Request Body**: 
        ```json
        {
            "email": "platformuser@example.com",
            "password": "securepassword",
            "firstName": "Alice",
            "lastName": "Smith",
            "role": "tenant_owner" 
        }
        ```
    *   **Responses**:
        *   `201 Created`: Platform user registered successfully, returns user details (without password hash).
        *   `400 Bad Request`: Email or password missing.
        *   `409 Conflict`: A platform user with the provided email already exists.
        *   `500 Internal Server Error`: Failed to register platform user.

*   **`POST /login`**:
    *   **Description**: Logs in a platform user and returns a JWT token.
    *   **Access**: Public.
    *   **Request Body**: 
        ```json
        {
            "email": "platformuser@example.com",
            "password": "securepassword"
        }
        ```
    *   **Responses**:
        *   `200 OK`: Login successful, returns JWT and basic user info.
        *   `400 Bad Request`: Email or password missing.
        *   `401 Unauthorized`: Invalid credentials.
        *   `500 Internal Server Error`: Failed to login.

## Dependencies

*   `PlatformUserService`: Provides business logic for platform user registration and lookup.
*   `signJwt`: Utility for generating JWTs.

## Usage

These routes are typically mounted under a platform-specific prefix (e.g., `/api/platform/auth`). They provide the entry points for platform users to authenticate and gain access to platform-level functionalities.
