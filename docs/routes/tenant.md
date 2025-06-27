# Tenant Routes

This module defines API routes for managing tenant accounts on the Dreamkart platform. These routes are primarily for platform administrators or authenticated tenant owners to interact with tenant records and their associated resources.

## Routes

*   **`POST /register`**:
    *   **Description**: Registers a new tenant (shop) on the platform and creates the initial owner user for the new tenant's dedicated database. This route is secured by platform user authentication.
    *   **Access**: Private (Platform User with `tenant_owner` or `platform_admin` role required).
    *   **Request Body**: 
        ```json
        {
            "name": "My New Shop",
            "email": "shopcontact@example.com",
            "plan": "basic",
            "initialTenantUserEmail": "shopadmin@example.com",
            "initialTenantUserPassword": "adminpass",
            "initialTenantUserName": "Shop Admin"
        }
        ```
    *   **Responses**:
        *   `201 Created`: Tenant and initial admin user registered successfully.
        *   `400 Bad Request`: Missing required fields for tenant or initial user.
        *   `403 Forbidden`: User has reached their tenant creation limit based on their plan.
        *   `404 Not Found`: Authenticated platform user not found.
        *   `409 Conflict`: Duplicate tenant name or email (for tenant contact or initial admin).
        *   `500 Internal Server Error`: General server error during registration or setup.

*   **`GET /`**:
    *   **Description**: Retrieves all tenants associated with the authenticated platform user.
    *   **Access**: Private (Platform User JWT Required).
    *   **Responses**:
        *   `200 OK`: Returns an array of tenant objects.
        *   `500 Internal Server Error`: Failed to retrieve tenants.

*   **`GET /:id`**:
    *   **Description**: Retrieves a specific tenant by its ID.
    *   **Access**: Private (Requires authorization checks, likely for platform admin/owner).
    *   **URL Parameters**: `id` (string) - The ID of the tenant.
    *   **Responses**:
        *   `200 OK`: Returns the tenant object.
        *   `404 Not Found`: Tenant not found.
        *   `500 Internal Server Error`: Failed to retrieve tenant.

*   **`PUT /:id`**:
    *   **Description**: Updates an existing tenant's details.
    *   **Access**: Private (Requires authorization checks, likely for platform admin).
    *   **URL Parameters**: `id` (string) - The ID of the tenant to update.
    *   **Request Body**: (Partial `ITenant` object) 
        ```json
        {
            "status": "active"
        }
        ```
    *   **Responses**:
        *   `200 OK`: Tenant updated successfully.
        *   `400 Bad Request`: Validation failed.
        *   `404 Not Found`: Tenant not found for update.
        *   `500 Internal Server Error`: Failed to update tenant.

*   **`DELETE /:id`**:
    *   **Description**: Deletes a tenant record and *drops their dedicated database*. This is a highly destructive operation.
    *   **Access**: Private (Requires strong `platform_admin` authorization).
    *   **URL Parameters**: `id` (string) - The ID of the tenant to delete.
    *   **Responses**:
        *   `204 No Content`: Tenant and its database deleted successfully.
        *   `404 Not Found`: Tenant not found for deletion.
        *   `500 Internal Server Error`: Failed to delete tenant.

## Middleware

*   `authenticate`: Authenticates platform users via JWT and attaches `req.user`.

## Dependencies

*   `TenantService`: Provides business logic for tenant management.
*   `PlatformUserService`: Used for verifying platform user details and plan limits.

## Usage

These routes are typically mounted under a platform-specific prefix (e.g., `/api/platform/tenants`). They are central to the multi-tenancy management of the Dreamkart platform.
