// src/routes/application/category.routes.ts

import express from 'express';
import CategoryService from '../../services/application/category.service';
import ProductService from '../../services/application/product.service';
import { authenticateTenantUser } from '../../middleware/tenantAuth.middleware'; // Import our lovely tenant auth middleware!

const router = express.Router();

// --- Unauthenticated Routes (READ Operations) ---

// 💖 Route to get all categories for a specific tenant 💖
router.get('/', async (req, res) => {
    // res.locals.tenantDbName is guaranteed by the 'tenantResolver' middleware in app.ts
    const tenantDbName: string = res.locals.tenantDbName;
    console.log(`Fetching all categories for tenant: ${tenantDbName}`);
    try {
        const categories = await CategoryService.getAllCategories(tenantDbName);
        res.status(200).json(categories);
    } catch (error: any) {
        console.error(`Error fetching all categories for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
    }
});

// 🔍 Route to get a category by Slug for a specific tenant 🔍
// @ts-ignore
router.get('/slug/:slug', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName;
    try {
        const category = await CategoryService.getCategoryBySlug(tenantDbName, req.params.slug);
        if (!category) {
            return res.status(404).json({ message: 'Category not found by slug, darling! 🥺' });
        }
        res.status(200).json(category);
    } catch (error: any) {
        console.error(`Error fetching category by slug (${req.params.slug}) for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch category by slug', error: error.message });
    }
});

// 🆔 Route to get a category by ID for a specific tenant 🆔
// Note: Using '/:id' after '/slug/:slug' might cause conflicts for slugs that look like IDs.
// Consider ordering more specific routes first, or using unique prefixes.
// @ts-ignore
router.get('/:id', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName;
    try {
        const category = await CategoryService.getCategoryById(tenantDbName, req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found by ID, sweetie! 🥺' });
        }
        res.status(200).json(category);
    } catch (error: any) {
        console.error(`Error fetching category by ID (${req.params.id}) for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch category by ID', error: error.message });
    }
});

// 🛍️ Route to get products belonging to a specific category (still needs tenantDbName too!) 🛍️
// This route should come *after* specific category GETs like /:id or /slug/:slug
router.get('/:categoryId/products', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName;
    try {
        const products = await ProductService.getProductbyCategory(tenantDbName, req.params.categoryId);
        res.status(200).json(products);
    } catch (error: any) {
        console.error(`Error fetching products for category (${req.params.categoryId}) for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch products by category', error: error.message });
    }
});


// ➕ Route to create a new category for a specific tenant ➕
// @ts-ignore
router.post('/', authenticateTenantUser, async (req, res) => { // Added authenticateTenantUser!
    // For authenticated routes, req.tenantDbName is guaranteed by authenticateTenantUser
    const tenantDbName: string = req.tenantDbName!;
    try {
        const newCategory = await CategoryService.createCategory(tenantDbName, req.body);
        res.status(201).json({
            message: 'Category created successfully! Yay! 🎉',
            category: newCategory
        });
    } catch (error: any) {
        console.error(`Error creating category for tenant ${tenantDbName}:`, error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed, sweetie! Please check your inputs.', errors: error.errors });
        }
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Oh dear, a category with that slug already exists! Please use a unique one.', error: error.message });
        }
        res.status(500).json({ message: 'Failed to create category', error: error.message });
    }
});

// ✏️ Route to update a category by slug for a specific tenant ✏️
// @ts-ignore
router.put('/:slug', authenticateTenantUser, async (req, res) => { // Added authenticateTenantUser!
    const tenantDbName: string = req.tenantDbName!;
    try {
        const updatedCategory = await CategoryService.updateCategory(tenantDbName, req.params.slug, req.body);
        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found to update! 🥺' });
        }
        res.status(200).json({
            message: 'Category updated successfully! 😊',
            category: updatedCategory
        });
    } catch (error: any) {
        console.error(`Error updating category by slug (${req.params.slug}) for tenant ${tenantDbName}:`, error);
        if (error.message.includes('Category not found')) {
            return res.status(404).json({ message: 'Category not found to update! 🥺' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed during update, darling! Please check your inputs.', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to update category', error: error.message });
    }
});

// 🗑️ Route to delete a category by slug for a specific tenant 🗑️
// @ts-ignore
router.delete('/:slug', authenticateTenantUser, async (req, res) => { // Added authenticateTenantUser!
    const tenantDbName: string = req.tenantDbName!;
    try {
        const deletedCategory = await CategoryService.deleteCategory(tenantDbName, req.params.slug);
        if (!deletedCategory) {
            return res.status(404).json({ message: 'Category not found to delete! 🥺' });
        }
        res.status(204).send(); // No content for successful delete
    } catch (error: any) {
        console.error(`Error deleting category by slug (${req.params.slug}) for tenant ${tenantDbName}:`, error);
        if (error.message.includes('Category not found')) {
            return res.status(404).json({ message: 'Category not found to delete! 🥺' });
        }
        res.status(500).json({ message: 'Failed to delete category', error: error.message });
    }
});

export default router;