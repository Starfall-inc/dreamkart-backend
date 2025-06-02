import express from 'express';
import CategoryService from '../../services/application/category.service';
import ProductService from '../../services/application/product.service';
const router = express.Router();

// 🔑 Multi-tenancy middleware for all category routes! 🔑
// This is essential to extract the tenant ID and make it available.


// 💖 Route to get all categories for a specific tenant 💖
router.get('/', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName!; // Use '!' as middleware guarantees it's there
    console.log(`Fetching all categories for tenant: ${tenantDbName}`);
    try {
        const categories = await CategoryService.getAllCategories(tenantDbName); // Pass tenantDbName
        res.status(200).json(categories);
    } catch (error: any) {
        console.error(`Error fetching all categories for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
    }
});

// 🔍 Route to get a category by Slug for a specific tenant 🔍
// @ts-ignore
router.get('/slug/:slug', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName; // Get the tenant DB name
    try {
        const category = await CategoryService.getCategoryBySlug(tenantDbName, req.params.slug); // Pass tenantDbName
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
// @ts-ignore
router.get('/:id', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName; // Get the tenant DB name
    try {
        const category = await CategoryService.getCategoryById(tenantDbName, req.params.id); // Pass tenantDbName
        if (!category) {
            return res.status(404).json({ message: 'Category not found by ID, sweetie! 🥺' });
        }
        res.status(200).json(category);
    } catch (error: any) {
        console.error(`Error fetching category by ID (${req.params.id}) for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch category by ID', error: error.message });
    }
});

// ➕ Route to create a new category for a specific tenant ➕
// @ts-ignore
router.post('/', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName; // Get the tenant DB name
    try {
        const newCategory = await CategoryService.createCategory(tenantDbName, req.body); // Pass tenantDbName
        res.status(201).json(newCategory);
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

// 🛍️ Route to get products belonging to a specific category (still needs tenantDbName too!) 🛍️
router.get('/:categoryId/products', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName; // Get the tenant DB name
    try {
        // ProductService's getProductbyCategory method also needs the tenantDbName!
        const products = await ProductService.getProductbyCategory(tenantDbName, req.params.categoryId); 
        res.status(200).json(products);
    } catch (error: any) {
        console.error(`Error fetching products for category (${req.params.categoryId}) for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch products by category', error: error.message });
    }
});



// ... (Optional update and delete routes - remember to add tenantDbName to them too!)

export default router;