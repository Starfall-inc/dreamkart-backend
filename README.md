# Dreamkart Backend

Dreamkart Backend is a multi-tenant e-commerce platform designed to allow businesses to set up and manage their own online shops. Each shop (tenant) operates independently with its own data, products, and customer base, while the platform provides the core infrastructure and management tools.

## Purpose

The primary purpose of this project is to provide a scalable and robust backend system for a multi-tenant e-commerce application. Key features include:
- Tenant registration and management.
- Platform-level administration.
- Secure authentication for both platform and tenant users.
- Tenant-specific data isolation.
- APIs for managing products, categories, and other e-commerce functionalities within each tenant.

## Technologies Used

- **Node.js:** Runtime environment for executing JavaScript server-side.
- **Express.js:** Web application framework for Node.js, used for building APIs.
- **TypeScript:** Superset of JavaScript that adds static typing for better code quality and maintainability.
- **MongoDB:** NoSQL database used for storing platform and tenant-specific data.
- **Mongoose:** ODM (Object Data Modeling) library for MongoDB and Node.js, used for schema definition and data validation.
- **JSON Web Tokens (JWT):** Used for securing API endpoints and managing user authentication.

## Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd dreamkart-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project. This file will store sensitive information and configuration settings. Add the following variables, replacing placeholder values with your actual configuration:

    ```env
    # Server Configuration
    PORT=3000
    NODE_ENV=development # or 'production'

    # MongoDB Connection
    MONGODB_URI=mongodb://localhost:27017/dreamkart_platform # URI for the main platform database

    # JWT Secrets
    JWT_SECRET=your_platform_jwt_secret_key # Secret key for platform-level JWTs
    TENANT_JWT_SECRET=your_tenant_jwt_secret_key # Secret key for tenant-level JWTs

    # Default Admin User (Optional - for initial platform setup if needed by a script)
    # DEFAULT_ADMIN_EMAIL=admin@example.com
    # DEFAULT_ADMIN_PASSWORD=securepassword
    ```
    *Note: The specific environment variables needed might vary. Check `src/config/` for more details on how configurations are loaded.*

4.  **Ensure MongoDB is running:**
    Make sure you have a MongoDB instance running and accessible with the connection URI provided in your `.env` file.

## Running the Application

To start the development server:

```bash
npm run dev
```

This command uses `ts-node-dev` to automatically transpile TypeScript and restart the server on file changes. The server will typically run on the port specified in your `.env` file (default is 3000).

You should see a console message indicating that the server is listening on the configured port.

## Running Tests

This project uses Jest for running unit and integration tests. The following npm scripts are available for testing:

-   **Run all tests once:**
    ```bash
    npm test
    ```
    This command executes all tests found in the `tests` directory.

-   **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```
    This is useful during development, as it re-runs tests automatically when files change.

-   **Run tests with coverage report:**
    ```bash
    npm run test:cov
    ```
    This command runs all tests and generates a coverage report, showing how much of your code is covered by tests. The report can usually be found in a `coverage/` directory.

Make sure you have installed all development dependencies (`npm install`) before running the tests.

## API Structure

The Dreamkart Backend exposes two main types of API endpoints:

1.  **Platform APIs:**
    -   These endpoints are used for managing the platform itself, such as tenant registration, platform user authentication, etc.
    -   Base path: `/api/platform/...`
    -   Example: `POST /api/platform/tenants/register`

2.  **Tenant-Specific (Application) APIs:**
    -   These endpoints are used for operations within a specific tenant's shop, like managing products, categories, orders, and tenant user authentication.
    -   Base path: `/api/tenant/...`
    -   **Important:** All requests to tenant-specific APIs MUST include an `X-Tenant-ID` header. This header specifies the unique slug or ID of the tenant whose data is being accessed. The `tenantResolver` middleware uses this header to switch to the correct tenant database.
    -   Example: `GET /api/tenant/products` (with `X-Tenant-ID: my-shop-slug` header)

For detailed information on specific endpoints, please refer to the API documentation.
