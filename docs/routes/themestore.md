# Themestore Routes

This module defines API routes for interacting with the themestore, allowing retrieval, creation, and deletion of themes.

## Routes

*   **`GET /`**:
    *   **Description**: Retrieves all themes available in the themestore.
    *   **Access**: Public.
    *   **Responses**:
        *   `200 OK`: Returns an array of theme objects.
        *   `500 Internal Server Error`: Failed to fetch themes.

*   **`GET /:slug`**:
    *   **Description**: Retrieves a single theme by its URL-friendly slug.
    *   **Access**: Public.
    *   **URL Parameters**: `slug` (string) - The slug of the theme.
    *   **Responses**:
        *   `200 OK`: Returns the theme object.
        *   `404 Not Found`: Theme not found.
        *   `500 Internal Server Error`: Failed to fetch theme.

*   **`POST /`**:
    *   **Description**: Creates a new theme in the themestore.
    *   **Access**: Private (Requires authentication, not explicitly defined in this snippet but implied for write operations).
    *   **Request Body**: 
        ```json
        {
            "name": "Sakura Pink",
            "slug": "sakura-pink",
            "cdnUrl": "https://cdn.example.com/sakura-pink"
        }
        ```
    *   **Responses**:
        *   `201 Created`: Theme created successfully.
        *   `409 Conflict`: A theme with the provided slug already exists.
        *   `500 Internal Server Error`: Failed to create theme.

*   **`DELETE /:slug`**:
    *   **Description**: Deletes a theme by its slug from the themestore.
    *   **Access**: Private (Requires authentication, not explicitly defined in this snippet but implied for write operations).
    *   **URL Parameters**: `slug` (string) - The slug of the theme to delete.
    *   **Responses**:
        *   `200 OK`: Theme deleted successfully.
        *   `404 Not Found`: Theme not found to delete.
        *   `500 Internal Server Error`: Failed to delete theme.

## Dependencies

*   `themestore.controller`: Provides the handler functions for theme operations.

## Usage

These routes are typically mounted under a specific prefix (e.g., `/api/themestore`). They provide the API for managing themes available for Dreamkart stores.
