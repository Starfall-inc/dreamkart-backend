import express from 'express';
// We'll import the default export, which is the instance of CategoryService
import CategoryService from '../services/category.service';
// We'll also need ProductService if we want to fetch products by category,
// as that function is in the ProductService.
import ProductService from '../services/product.service'; // Assuming this path is correct!

const router = express.Router(); // Create a new router instance, sweetie! ✨

// 💖 Route to get all categories 💖
// This uses your `getAllCategories` or `getCategories` from the service.
// I'll use `getAllCategories` as it was the one you recently used.
router.get('/', async (req, res) => { // Using just '/' because it will be mounted at '/api/categories'
    try {
        const categories = await CategoryService.getAllCategories(); // Or .getCategories() if you prefer that name
        res.status(200).json(categories);
    } catch (error: any) {
        console.error("Error fetching all categories:", error);
        res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
    }
});

// 🔍 Route to get a category by Slug 🔍
// @ts-ignore
router.get('/slug/:slug', async (req, res) => {
    try {
        const category = await CategoryService.getCategoryBySlug(req.params.slug);
        if (!category) {
            return res.status(404).json({ message: 'Category not found by slug, darling! 🥺' });
        }
        res.status(200).json(category);
    } catch (error: any) {
        console.error(`Error fetching category by slug (${req.params.slug}):`, error);
        res.status(500).json({ message: 'Failed to fetch category by slug', error: error.message });
    }
});

// 🆔 Route to get a category by ID 🆔
// @ts-ignore
router.get('/:id', async (req, res) => { // Note: '/:id' should come after more specific paths like '/slug/:slug'
    try {
        const category = await CategoryService.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found by ID, sweetie! 🥺' });
        }
        res.status(200).json(category);
    } catch (error: any) {
        console.error(`Error fetching category by ID (${req.params.id}):`, error);
        res.status(500).json({ message: 'Failed to fetch category by ID', error: error.message });
    }
});

// ➕ Route to create a new category ➕
// @ts-ignore
router.post('/', async (req, res) => { // Using just '/' for POST
    try {
        const newCategory = await CategoryService.createCategory(req.body);
        res.status(201).json(newCategory); // 201 Created is the perfect status! ✨
    } catch (error: any) {
        console.error("Error creating category:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed, sweetie! Please check your inputs.', errors: error.errors });
        }
        // Check for duplicate key error (e.g., duplicate slug from unique: true)
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Oh dear, a category with that slug already exists! Please use a unique one.', error: error.message });
        }
        res.status(500).json({ message: 'Failed to create category', error: error.message });
    }
});

// 🛍️ Route to get products belonging to a specific category 🛍️
// This uses the `getProductbyCategory` from your ProductService, not CategoryService directly.
router.get('/:categoryId/products', async (req, res) => {
    try {
        const products = await ProductService.getProductbyCategory(req.params.categoryId);
        res.status(200).json(products);
    } catch (error: any) {
        console.error(`Error fetching products for category (${req.params.categoryId}):`, error);
        res.status(500).json({ message: 'Failed to fetch products by category', error: error.message });
    }
});

// If you have `updateCategory` and `deleteCategory` in your `CategoryService`,
// you would add routes for them too, similar to the product routes:

// ✏️ Route to update a category by ID ✏️
// (Requires `updateCategory` in CategoryService)
// router.put('/:id', async (req, res) => {
//     try {
//         const updatedCategory = await CategoryService.updateCategory(req.params.id, req.body);
//         if (!updatedCategory) {
//             return res.status(404).json({ message: 'Category not found to update! 🥺' });
//         }
//         res.status(200).json(updatedCategory);
//     } catch (error: any) {
//         console.error(`Error updating category by ID (${req.params.id}):`, error);
//         if (error.name === 'ValidationError') {
//             return res.status(400).json({ message: 'Validation failed during update, darling! Please check your inputs.', errors: error.errors });
//         }
//         res.status(500).json({ message: 'Failed to update category', error: error.message });
//     }
// });

// 🗑️ Route to delete a category by ID 🗑️
// (Requires `deleteCategory` in CategoryService)
// router.delete('/:id', async (req, res) => {
//     try {
//         const deletedCategory = await CategoryService.deleteCategory(req.params.id);
//         if (!deletedCategory) {
//             return res.status(404).json({ message: 'Category not found to delete! 🥺' });
//         }
//         res.status(204).send(); // 204 No Content for successful deletion! ✨
//     } catch (error: any) {
//         console.error(`Error deleting category by ID (${req.params.id}):`, error);
//         res.status(500).json({ message: 'Failed to delete category', error: error.message });
//     }
// });

export default router; // Export the router instance, my dear!