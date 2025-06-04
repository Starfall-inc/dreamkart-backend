// src/config/app.limits.ts

// ✨ Our centralized configuration for tenant creation limits! ✨
export const TENANT_CREATION_LIMITS: { [key: string]: number | 'unlimited' } = {
    'free': 1,      // Free users can create 1 tenant
    'basic': 5,     // Basic plan users can create up to 5 tenants
    'premium': 20,  // Premium users can create up to 20 tenants
    'enterprise': 'unlimited', // Enterprise users have no limit!
    'platform_admin': 'unlimited' // Admins can create unlimited tenants
    // Add more plans and their limits as your Dreamkart grows!
};