# Product Routes

This module defines API routes for managing products within a multi-tenant application. It includes both public (read-only) and authenticated (CRUD) endpoints.

## Public Routes (Read Operations)

*   **`GET /`**:
    *   **Description**: Retrieves all products for a specific tenant.
    *   **Access**: Public.
    *   **Responses**:
        *   `200 OK`: Returns an array of product objects.
        *   `500 Internal Server Error`: Failed to fetch products.

*   **`GET /:sku`**:
    *   **Description**: Retrieves a product by its Stock Keeping Unit (SKU) for a specific tenant.
    *   **Access**: Public.
    *   **URL Parameters**: `sku` (string) - The SKU of the product.
    *   **Responses**:
        *   `200 OK`: Returns the product object.
        *   `404 Not Found`: Product not found.
        *   `500 Internal Server Error`: Failed to fetch product.

*   **`GET /search/:query`**:
    *   **Description**: Searches for products by a query string (e.g., name, description) for a specific tenant.
    *   **Access**: Public.
    *   **URL Parameters**: `query` (string) - The search query.
    *   **Responses**:
        *   `200 OK`: Returns an array of matching product objects.
        *   `500 Internal Server Error`: Failed to search products.

## Authenticated Routes (CRUD Operations)

These routes require authentication via `authenticateTenantUser` middleware.

*   **`POST /`**:
    *   **Description**: Creates a new product for a specific tenant.
    *   **Access**: Private (Tenant User JWT Required).
    *   **Request Body**: (Partial `IProduct` object) 
        ```json
        {
            "sku": "PROD001",
            "name": "Example Product",
            "price": 9.99,
            "stock": 100,
            "category": "<category_id>",
            "description": "A wonderful product."
        }
        ```
    *   **Responses**:
        *   `201 Created`: Product created successfully.
        *   `400 Bad Request`: Validation failed.
        *   `409 Conflict`: A product with the provided SKU already exists.
        *   `500 Internal Server Error`: Failed to create product.

*   **`PUT /:sku`**:
    *   **Description**: Updates an existing product by its SKU for a specific tenant.
    *   **Access**: Private (Tenant User JWT Required).
    *   **URL Parameters**: `sku` (string) - The SKU of the product to update.
    *   **Request Body**: (Partial `IProduct` object) 
        ```json
        {
            "price": 12.50,
            "stock": 120
        }
        ```
    *   **Responses**:
        *   `200 OK`: Product updated successfully.
        *   `404 Not Found`: Product not found to update.
        *   `400 Bad Request`: Validation failed during update.
        *   `500 Internal Server Error`: Failed to update product.

*   **`DELETE /:sku`**:
    *   **Description**: Deletes a product by its SKU for a specific tenant.
    *   **Access**: Private (Tenant User JWT Required).
    *   **URL Parameters**: `sku` (string) - The SKU of the product to delete.
    *   **Responses**:
        *   `204 No Content`: Product deleted successfully.
        *   `404 Not Found`: Product not found to delete.
        *   `500 Internal Server Error`: Failed to delete product.

## Middleware

*   `tenantResolver`: (Applied globally) Ensures `res.locals.tenantDbName` is available.
*   `authenticateTenantUser`: Authenticates tenant users via JWT and attaches `req.tenantDbName`.

## Dependencies

*   `ProductService`: Provides business logic for product operations.

## Usage

These routes are typically mounted under a tenant-specific prefix (e.g., `/api/tenant/products`). They provide a comprehensive API for managing products within each tenant's store.
