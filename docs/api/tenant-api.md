# Tenant API Documentation (`/api/platform/tenants`)

This documentation covers the API endpoints for managing tenants (shops) on the Dreamkart platform. These endpoints are typically used by platform administrators or tenant owners with appropriate permissions.

All endpoints are prefixed with `/api/platform/tenants`.

---

## 1. Register New Tenant

-   **HTTP Method:** `POST`
-   **Path:** `/register`
-   **Description:** Registers a new tenant (shop) on the platform. This process also creates an initial admin user for the newly created tenant's dedicated database.
-   **Authentication:** Required. Authenticated platform user (e.g., with `tenant_owner` or `platform_admin` role). The JWT token of the platform user must be sent in the `Authorization` header (e.g., `Bearer <your_token>`).

-   **Request Body:** `application/json`

    ```json
    {
        "name": "My Awesome Shop",
        "email": "contact@myawesomeshop.com",
        "plan": "premium", // Optional, defaults to 'free' or as per platform user's plan
        "settings": { // Optional
            "logoUrl": "https://example.com/logo.png",
            "theme": "modern"
        },
        "initialTenantUserEmail": "admin@myawesomeshop.com",
        "initialTenantUserPassword": "securePassword123",
        "initialTenantUserName": "Shop Admin"
    }
    ```

-   **Request Body Parameters:**
    -   `name` (string, required): The name of the new tenant/shop.
    -   `email` (string, required): The contact email for the tenant/shop.
    -   `plan` (string, optional): The subscription plan for the tenant. Defaults based on platform user or system settings.
    -   `settings` (object, optional): Tenant-specific settings.
        -   `logoUrl` (string, optional): URL for the tenant's logo.
        -   `theme` (string, optional): Preferred theme for the tenant's shop.
    -   `initialTenantUserEmail` (string, required): Email for the initial admin user of the new shop.
    -   `initialTenantUserPassword` (string, required): Password for the initial admin user.
    -   `initialTenantUserName` (string, required): Name for the initial admin user.

-   **Success Response:**
    -   **Status Code:** `201 Created`
    -   **Content:**
        ```json
        {
            "message": "Yay! Your lovely new shop has been registered successfully! 🎉 And your initial admin user is set up!",
            "tenant": {
                "_id": "60d5f1b3e773f2a3c4b8f8b1",
                "name": "My Awesome Shop",
                "slug": "my-awesome-shop",
                "email": "contact@myawesomeshop.com",
                "status": "active", // or "pending" etc.
                "databaseName": "tenant_my_awesome_shop_abcdef",
                "plan": "premium"
            },
            "initialTenantAdminInfo": {
                "email": "admin@myawesomeshop.com"
            }
        }
        ```

-   **Error Responses:**
    -   `400 Bad Request`: Validation errors (e.g., missing required fields, invalid email format).
        ```json
        {
            "message": "Sweetie, please provide the shop name and a contact email to register a new tenant! 🥺"
        }
        ```
        ```json
        {
            "message": "My dear, you must provide initial admin user details (email, password, name) for your new shop! 🔑"
        }
        ```
    -   `401 Unauthorized`: If the platform user is not authenticated.
    -   `403 Forbidden`: If the platform user's plan limit for creating tenants is reached or the plan doesn't allow creation.
        ```json
        {
            "message": "Oh dear, you've reached the maximum number of shops allowed for your 'free' plan (1 shops)! Please upgrade your plan to create more. 😔"
        }
        ```
    -   `404 Not Found`: If the authenticated platform user (ownerId from JWT) is not found in the database.
        ```json
        {
            "message": "Owner platform user not found. Please log in again."
        }
        ```
    -   `409 Conflict`: If a tenant with the same name or email already exists, or if the initial tenant user email is a duplicate within its new database.
        ```json
        {
            "message": "Oh dear, a shop with that name already exists! Please choose a unique name. 💔"
        }
        ```
    -   `500 Internal Server Error`: General server error during tenant creation.
        ```json
        {
            "message": "Something went wrong during tenant registration. Please try again later. 😥",
            "error": "Detailed error message if available in dev mode"
        }
        ```

---

## 2. Get All Tenants

-   **HTTP Method:** `GET`
-   **Path:** `/`
-   **Description:** Retrieves a list of all tenants on the platform.
-   **Authentication:** Recommended. Typically restricted to platform administrators. (The provided code snippet does not show explicit auth for this endpoint, but it's a common practice).

-   **Request Parameters:** None

-   **Success Response:**
    -   **Status Code:** `200 OK`
    -   **Content:**
        ```json
        [
            {
                "_id": "60d5f1b3e773f2a3c4b8f8b1",
                "name": "My Awesome Shop",
                "slug": "my-awesome-shop",
                "ownerId": "5f9d5f1b3e773f2a3c4b8f8a0",
                "email": "contact@myawesomeshop.com",
                "status": "active",
                "databaseName": "tenant_my_awesome_shop_abcdef",
                "plan": "premium",
                "createdAt": "2023-01-15T10:00:00.000Z",
                "updatedAt": "2023-01-15T10:00:00.000Z"
            },
            {
                "_id": "60d5f1b3e773f2a3c4b8f8b2",
                "name": "Another Cool Store",
                // ... other tenant properties
            }
        ]
        ```

-   **Error Responses:**
    -   `500 Internal Server Error`: If there's an error fetching tenants.
        ```json
        {
            "message": "Failed to retrieve tenants.",
            "error": "Detailed error message"
        }
        ```

---

## 3. Get Tenant by ID

-   **HTTP Method:** `GET`
-   **Path:** `/:id`
-   **Description:** Retrieves details for a specific tenant using its unique ID.
-   **Authentication:** Recommended. Platform administrators or the owner of the tenant. (Code snippet does not show explicit auth).

-   **Path Parameters:**
    -   `id` (string, required): The unique identifier of the tenant.

-   **Success Response:**
    -   **Status Code:** `200 OK`
    -   **Content:**
        ```json
        {
            "_id": "60d5f1b3e773f2a3c4b8f8b1",
            "name": "My Awesome Shop",
            "slug": "my-awesome-shop",
            "ownerId": "5f9d5f1b3e773f2a3c4b8f8a0",
            "email": "contact@myawesomeshop.com",
            "status": "active",
            "databaseName": "tenant_my_awesome_shop_abcdef",
            "plan": "premium",
            "settings": {
                "logoUrl": "https://example.com/logo.png",
                "theme": "modern"
            },
            "createdAt": "2023-01-15T10:00:00.000Z",
            "updatedAt": "2023-01-15T10:00:00.000Z"
        }
        ```

-   **Error Responses:**
    -   `404 Not Found`: If no tenant matches the provided ID.
        ```json
        {
            "message": "Tenant not found! 🥺"
        }
        ```
    -   `500 Internal Server Error`: General server error.
        ```json
        {
            "message": "Failed to retrieve tenant.",
            "error": "Detailed error message"
        }
        ```

---

## 4. Update Tenant by ID

-   **HTTP Method:** `PUT`
-   **Path:** `/:id`
-   **Description:** Updates details for a specific tenant using its unique ID.
-   **Authentication:** Required. Strong authorization recommended (e.g., platform admin or tenant owner).

-   **Path Parameters:**
    -   `id` (string, required): The unique identifier of the tenant to update.

-   **Request Body:** `application/json`
    -   Provide any of the tenant fields that need to be updated.
    ```json
    {
        "name": "My Updated Awesome Shop",
        "email": "newcontact@myawesomeshop.com",
        "plan": "enterprise",
        "status": "inactive",
        "settings": {
            "theme": "classic"
        }
    }
    ```

-   **Success Response:**
    -   **Status Code:** `200 OK`
    -   **Content:**
        ```json
        {
            "message": "Tenant updated successfully! ✨",
            "tenant": {
                "_id": "60d5f1b3e773f2a3c4b8f8b1",
                "name": "My Updated Awesome Shop",
                "email": "newcontact@myawesomeshop.com",
                "plan": "enterprise",
                "status": "inactive",
                // ... other updated fields
            }
        }
        ```

-   **Error Responses:**
    -   `400 Bad Request`: Validation errors if the input data is invalid.
        ```json
        {
            "message": "Validation failed during update. Please check inputs.",
            "errors": { /* ... details of validation errors ... */ }
        }
        ```
    -   `404 Not Found`: If the tenant with the given ID is not found.
        ```json
        {
            "message": "Tenant not found for update! 🥺"
        }
        ```
    -   `500 Internal Server Error`: General server error.
        ```json
        {
            "message": "Failed to update tenant.",
            "error": "Detailed error message"
        }
        ```

---

## 5. Delete Tenant by ID

-   **HTTP Method:** `DELETE`
-   **Path:** `/:id`
-   **Description:** Deletes a specific tenant using its unique ID. This is a destructive operation and should be used with extreme caution.
-   **Authentication:** Required. MUST be protected by strong platform admin authorization.

-   **Path Parameters:**
    -   `id` (string, required): The unique identifier of the tenant to delete.

-   **Success Response:**
    -   **Status Code:** `204 No Content` (Indicates successful deletion with no response body)

-   **Error Responses:**
    -   `404 Not Found`: If the tenant with the given ID is not found.
        ```json
        {
            "message": "Tenant not found for deletion! 🥺"
        }
        ```
    -   `500 Internal Server Error`: General server error during deletion.
        ```json
        {
            "message": "Failed to delete tenant.",
            "error": "Detailed error message"
        }
        ```

---
