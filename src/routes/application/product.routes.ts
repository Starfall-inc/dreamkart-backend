import express from 'express';
import ProductService from '../../services/application/product.service';
import { authenticateTenantUser } from '../../middleware/tenantAuth.middleware'; // Import your tenant auth middleware!

const router = express.Router();

// 💖 Route to get all products for a specific tenant (READ - NO AUTH REQUIRED) 💖
//@ts-ignore
router.get('/', async (req, res) => {
    // tenantDbName still comes from res.locals, set by resolveTenant middleware
    const tenantDbName: string = res.locals.tenantDbName;
    if (!tenantDbName) {
        console.error("{ProductRoutes -> GET /} Missing tenantDbName in res.locals.");
        return res.status(500).json({ message: 'Sweetie, something went wrong with the shop context. Please try again! 🥺' });
    }

    console.log(`Fetching all products for tenant: ${tenantDbName}`);
    try {
        const products = await ProductService.getAllProducts(tenantDbName);
        res.status(200).json(products);
        console.log(`Fetched ${products.length} products for tenant ${tenantDbName}`);
    } catch (error: any) {
        console.error(`Error fetching all products for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch products', error: error.message });
    }
});

// 🔍 Route to get a product by SKU for a specific tenant (READ - NO AUTH REQUIRED) 🔍
//@ts-ignore
router.get('/:sku', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName;
    if (!tenantDbName) {
        console.error("{ProductRoutes -> GET /:sku} Missing tenantDbName in res.locals.");
        return res.status(500).json({ message: 'Sweetie, something went wrong with the shop context. Please try again! 🥺' });
    }

    try {
        const product = await ProductService.getProductBySku(tenantDbName, req.params.sku);
        if (!product) {
            return res.status(404).json({ message: 'Product not found, darling! 🥺' });
        }
        res.status(200).json(product);
    } catch (error: any) {
        console.error(`Error fetching product by SKU (${req.params.sku}) for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to fetch product', error: error.message });
    }
});

// 🔎 Route to search products by query for a specific tenant (READ - NO AUTH REQUIRED) 🔎
//@ts-ignore
router.get('/search/:query', async (req, res) => {
    const tenantDbName: string = res.locals.tenantDbName;
    if (!tenantDbName) {
        console.error("{ProductRoutes -> GET /search/:query} Missing tenantDbName in res.locals.");
        return res.status(500).json({ message: 'Sweetie, something went wrong with the shop context. Please try again! 🥺' });
    }

    try {
        const products = await ProductService.searchProducts(tenantDbName, req.params.query);
        res.status(200).json(products);
    } catch (error: any) {
        console.error(`Error searching products with query (${req.params.query}) for tenant ${tenantDbName}:`, error);
        res.status(500).json({ message: 'Failed to search products', error: error.message });
    }
});


// --- AUTHENTICATED ROUTES (CUD Operations) ---
// ✨ The authenticateTenantUser middleware is now applied directly to these routes! ✨

// ➕ Route to create a new product for a specific tenant (CREATE - AUTH REQUIRED) ➕
//@ts-ignore
router.post('/', authenticateTenantUser, async (req, res) => {
    // req.tenantDbName and req.tenantUser are guaranteed here by authenticateTenantUser
    const tenantDbName: string = req.tenantDbName!;
    try {
        const newProduct = await ProductService.createProduct(tenantDbName, req.body);
        res.status(201).json({
            message: 'Product created successfully! Yay! 🎉',
            product: newProduct
        });
    } catch (error: any) {
        console.error(`Error creating product for tenant ${tenantDbName}:`, error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed, sweetie! Please check your inputs.', errors: error.errors });
        }
        if (error.code === 11000) { // MongoDB duplicate key error
            return res.status(409).json({ message: 'Oh dear, a product with that SKU already exists! Please use a unique one.', error: error.message });
        }
        res.status(500).json({ message: 'Failed to create product', error: error.message });
    }
});

// ✏️ Route to update a product by SKU for a specific tenant (UPDATE - AUTH REQUIRED) ✏️
//@ts-ignore
router.put('/:sku', authenticateTenantUser, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    try {
        const updatedProduct = await ProductService.updateProduct(tenantDbName, req.params.sku, req.body);
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found to update! 🥺' });
        }
        res.status(200).json({
            message: 'Product updated successfully! 😊',
            product: updatedProduct
        });
    } catch (error: any) {
        console.error(`Error updating product by SKU (${req.params.sku}) for tenant ${tenantDbName}:`, error);
        if (error.message.includes('Product not found')) {
            return res.status(404).json({ message: 'Product not found to update! 🥺' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation failed during update, darling! Please check your inputs.', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to update product', error: error.message });
    }
});

// 🗑️ Route to delete a product by SKU for a specific tenant (DELETE - AUTH REQUIRED) 🗑️
//@ts-ignore
router.delete('/:sku', authenticateTenantUser, async (req, res) => {
    const tenantDbName: string = req.tenantDbName!;
    try {
        const deletedProduct = await ProductService.deleteProduct(tenantDbName, req.params.sku);
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found to delete! 🥺' });
        }
        res.status(204).send(); // No content for successful delete
    } catch (error: any) {
        console.error(`Error deleting product by SKU (${req.params.sku}) for tenant ${tenantDbName}:`, error);
        if (error.message.includes('Product not found')) {
            return res.status(404).json({ message: 'Product not found to delete! 🥺' });
        }
        res.status(500).json({ message: 'Failed to delete product', error: error.message });
    }
});

export default router;