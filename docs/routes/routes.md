# API Routes Documentation

This document provides an overview of all API routes available in the Dreamkart backend, categorized by their base paths and functionality. Each entry links to a more detailed Markdown file for specific route information.

## Platform-Level Routes
These routes are for managing the Dreamkart platform itself, including tenant management and platform user authentication.

*   **Platform Authentication** (`/api/platform/auth`)
    *   [Details: `platformAuth.md`](./platformAuth.md)
*   **Tenant Management** (`/api/platform/tenants`)
    *   [Details: `tenant.md`](./tenant.md)

## Tenant-Specific Application Routes
These routes are specific to individual tenant applications (e-commerce stores) and require a `X-Tenant-ID` header to resolve the correct tenant database. They are typically mounted under `/api/tenant`.

*   **Tenant User Authentication** (`/api/tenant/auth`)
    *   [Details: `applicationAuth.md`](./applicationAuth.md)
*   **Product Management** (`/api/tenant/products`)
    *   [Details: `product.md`](./product.md)
*   **Category Management** (`/api/tenant/categories`)
    *   [Details: `category.md`](./category.md)

## Customer-Specific Application Routes
These routes are for customer-facing functionalities within individual tenant applications. They also require a `X-Tenant-ID` header and often customer authentication.

*   **Customer Authentication** (`/api/customer/auth`)
    *   [Details: `customerAuth.md`](./customerAuth.md)
*   **Customer Profile Management** (`/api/customer/profile`)
    *   [Details: `customer.md`](./customer.md)
*   **Shopping Cart** (`/api/customer/cart`)
    *   [Details: `cart.md`](./cart.md)
*   **Order Management** (`/api/customer/orders`)
    *   [Details: `order.md`](./order.md)

## Themestore Routes
These routes are for managing themes available in the themestore.

*   **Theme Management** (`/api/themes`)
    *   [Details: `themestore.md`](./themestore.md)
