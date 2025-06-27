# Category Routes

This module defines API routes for managing product categories within a multi-tenant application. It includes both public (read-only) and authenticated (CRUD) endpoints.

## Public Routes (Read Operations)

*   **`GET /`**:
    *   **Description**: Retrieves all categories for a specific tenant.
    *   **Access**: Public.
    *   **Responses**:
        *   `200 OK`: Returns an array of category objects.
        *   `500 Internal Server Error`: Failed to fetch categories.

*   **`GET /slug/:slug`**:
    *   **Description**: Retrieves a category by its URL-friendly slug for a specific tenant.
    *   **Access**: Public.
    *   **URL Parameters**: `slug` (string) - The slug of the category.
    *   **Responses**:
        *   `200 OK`: Returns the category object.
        *   `404 Not Found`: Category not found by slug.
        *   `500 Internal Server Error`: Failed to fetch category by slug.

*   **`GET /:id`**:
    *   **Description**: Retrieves a category by its ID for a specific tenant.
    *   **Access**: Public.
    *   **URL Parameters**: `id` (string) - The ID of the category.
    *   **Responses**:
        *   `200 OK`: Returns the category object.
        *   `404 Not Found`: Category not found by ID.
        *   `500 Internal Server Error`: Failed to fetch category by ID.

*   **`GET /:categoryId/products`**:
    *   **Description**: Retrieves all products belonging to a specific category for a given tenant.
    *   **Access**: Public.
    *   **URL Parameters**: `categoryId` (string) - The ID of the category.
    *   **Responses**:
        *   `200 OK`: Returns an array of product objects.
        *   `500 Internal Server Error`: Failed to fetch products by category.

## Authenticated Routes (CRUD Operations)

These routes require authentication via `authenticateTenantUser` middleware.

*   **`POST /`**:
    *   **Description**: Creates a new category for a specific tenant.
    *   **Access**: Private (Tenant User JWT Required).
    *   **Request Body**: 
        ```json
        {
            "name": "Electronics",
            "slug": "electronics",
            "description": "All electronic gadgets"
        }
        ```
    *   **Responses**:
        *   `201 Created`: Category created successfully.
        *   `400 Bad Request`: Validation failed.
        *   `409 Conflict`: A category with the provided slug already exists.
        *   `500 Internal Server Error`: Failed to create category.

*   **`PUT /:slug`**:
    *   **Description**: Updates an existing category by its slug for a specific tenant.
    *   **Access**: Private (Tenant User JWT Required).
    *   **URL Parameters**: `slug` (string) - The slug of the category to update.
    *   **Request Body**: (Partial `ICategory` object) 
        ```json
        {
            "name": "Updated Electronics"
        }
        ```
    *   **Responses**:
        *   `200 OK`: Category updated successfully.
        *   `404 Not Found`: Category not found to update.
        *   `400 Bad Request`: Validation failed during update.
        *   `500 Internal Server Error`: Failed to update category.

*   **`DELETE /:slug`**:
    *   **Description**: Deletes a category by its slug for a specific tenant.
    *   **Access**: Private (Tenant User JWT Required).
    *   **URL Parameters**: `slug` (string) - The slug of the category to delete.
    *   **Responses**:
        *   `204 No Content`: Category deleted successfully.
        *   `404 Not Found`: Category not found to delete.
        *   `500 Internal Server Error`: Failed to delete category.

## Middleware

*   `tenantResolver`: (Applied globally) Ensures `res.locals.tenantDbName` is available.
*   `authenticateTenantUser`: Authenticates tenant users via JWT and attaches `req.tenantDbName`.

## Dependencies

*   `CategoryService`: Provides business logic for category operations.
*   `ProductService`: Used for retrieving products by category.

## Usage

These routes are typically mounted under a tenant-specific prefix (e.g., `/api/tenant/categories`). They provide a comprehensive API for managing product categories within each tenant's store.
